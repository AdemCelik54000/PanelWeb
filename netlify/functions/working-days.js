const { getAuthContext } = require("../lib/_auth");
const { getSupabaseClient } = require("../lib/supabase");

const TABLE = "tenant_open_days";

const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const unauthorizedResponse = () => buildResponse(401, { error: "unauthorized" });

const normalizeDate = (value) => {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return "";
  }
  return text;
};

const isSafeForILike = (value) => !/[\%_]/.test(String(value || ""));

const todayIsoUtc = () => new Date().toISOString().slice(0, 10);

const cleanupPastDays = async ({ tenantId, useILike, beforeDate }) => {
  const cutoff = normalizeDate(beforeDate) || todayIsoUtc();
  const supabase = getSupabaseClient();

  let query = supabase.from(TABLE).delete();
  query = useILike ? query.ilike("tenant_id", tenantId) : query.eq("tenant_id", tenantId);
  query = query.lt("date", cutoff);

  const { error } = await query;
  if (error) {
    console.error("Supabase working-days cleanup error", { error, tenantId, cutoff });
    return false;
  }
  return true;
};

const listOpenDates = async ({ tenantId, startDate, endDate, useILike }) => {
  const supabase = getSupabaseClient();
  let query = supabase
    .from(TABLE)
    .select("date")
    .order("date", { ascending: true });

  query = useILike ? query.ilike("tenant_id", tenantId) : query.eq("tenant_id", tenantId);

  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase working-days list error", { error, tenantId, startDate, endDate });
    return null;
  }

  const dates = (Array.isArray(data) ? data : [])
    .map((row) => String(row?.date || "").trim())
    .filter(Boolean);
  return dates;
};

const applyChanges = async ({ tenantId, changes, useILike }) => {
  const supabase = getSupabaseClient();
  const safeChanges = Array.isArray(changes) ? changes : [];

  const todayIso = todayIsoUtc();

  const toOpen = [];
  const toClose = [];

  safeChanges.forEach((change) => {
    const date = normalizeDate(change?.date);
    if (!date) {
      return;
    }
    if (date < todayIso) {
      return;
    }
    const open = Boolean(change?.open);
    if (open) {
      toOpen.push(date);
    } else {
      toClose.push(date);
    }
  });

  // Upsert open days
  if (toOpen.length) {
    const rows = toOpen.map((date) => ({ tenant_id: tenantId, date }));
    const { error } = await supabase.from(TABLE).upsert(rows, {
      onConflict: "tenant_id,date",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error("Supabase working-days upsert error", { error, tenantId, count: rows.length });
      return false;
    }
  }

  // Delete closed days (default = closed)
  if (toClose.length) {
    let query = supabase.from(TABLE).delete();
    query = useILike ? query.ilike("tenant_id", tenantId) : query.eq("tenant_id", tenantId);
    query = query.in("date", toClose);
    const { error } = await query;
    if (error) {
      console.error("Supabase working-days delete error", { error, tenantId, count: toClose.length });
      return false;
    }

    // If a day is closed, remove any rendez-vous for that day.
    // (Keeps planning consistent: no appointments on closed days.)
    let rvQuery = supabase.from("rendez_vous").delete();
    rvQuery = useILike ? rvQuery.ilike("tenant_id", tenantId) : rvQuery.eq("tenant_id", tenantId);
    rvQuery = rvQuery.in("date", toClose);
    const { error: rvError } = await rvQuery;
    if (rvError) {
      console.error("Supabase rendez_vous delete (day closed) error", {
        error: rvError,
        tenantId,
        count: toClose.length,
      });
      return false;
    }
  }

  return true;
};

exports.handler = async (event) => {
  let auth = null;
  try {
    auth = await getAuthContext(event);
  } catch (error) {
    if (error?.message === "missing_supabase_env") {
      return buildResponse(500, { error: "missing_supabase_env" });
    }
    return buildResponse(500, { error: "auth_error" });
  }

  if (!auth) {
    return unauthorizedResponse();
  }
  if (auth.isAdmin && !auth.targetTenantId) {
    return buildResponse(400, { error: "missing_target_tenant" });
  }

  const tenantId = String(auth.tenant?.id || "").trim();
  if (!tenantId) {
    return buildResponse(400, { error: "missing_tenant" });
  }

  const useILike = isSafeForILike(tenantId);
  const cleanupOk = await cleanupPastDays({ tenantId, useILike, beforeDate: todayIsoUtc() });
  if (!cleanupOk) {
    return buildResponse(500, { error: "db_error" });
  }

  const startDate = normalizeDate(event?.queryStringParameters?.start);
  const endDate = normalizeDate(event?.queryStringParameters?.end);

  if (event.httpMethod === "GET") {
    let dates = await listOpenDates({ tenantId, startDate, endDate, useILike: false });
    if (dates === null) {
      return buildResponse(500, { error: "db_error" });
    }
    if (!dates.length && useILike) {
      const fallback = await listOpenDates({ tenantId, startDate, endDate, useILike: true });
      if (Array.isArray(fallback)) {
        dates = fallback;
      }
    }
    return buildResponse(200, { open_dates: dates });
  }

  if (event.httpMethod === "POST") {
    let payload = null;
    try {
      payload = JSON.parse(event.body || "{}") || null;
    } catch {
      payload = null;
    }

    const changes = Array.isArray(payload?.changes) ? payload.changes : [];
    if (!changes.length) {
      return buildResponse(400, { error: "missing_changes" });
    }

    const ok = await applyChanges({
      tenantId,
      changes,
      useILike,
    });
    if (!ok) {
      return buildResponse(500, { error: "db_error" });
    }

    return buildResponse(200, { updated: changes.length });
  }

  return buildResponse(405, { error: "method_not_allowed" });
};
