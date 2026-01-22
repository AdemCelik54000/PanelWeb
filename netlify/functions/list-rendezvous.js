const { getAuthContext } = require("../lib/_auth");
const { getSupabaseClient } = require("../lib/supabase");

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

const cleanupPastRendezVous = async ({ tenantId, useILike, beforeDate }) => {
  const cutoff = normalizeDate(beforeDate) || todayIsoUtc();
  const supabase = getSupabaseClient();

  let query = supabase.from("rendez_vous").delete();
  query = useILike ? query.ilike("tenant_id", tenantId) : query.eq("tenant_id", tenantId);
  query = query.lt("date", cutoff);

  const { error } = await query;
  if (error) {
    console.error("Supabase rendez_vous cleanup error", { error, tenantId, cutoff });
    return false;
  }
  return true;
};

const extractClientInfo = (row) => {
  if (!row) {
    return { prenom: "", snapchat: "" };
  }
  const prenom = String(
    row.prenom ?? row.first_name ?? row.firstname ?? row.firstName ?? row.name ?? ""
  ).trim();
  const snapchat = String(row.snapchat ?? row.snap ?? row.snap_name ?? row.snapName ?? "").trim();
  return { prenom, snapchat };
};

const loadClientMap = async (userIds) => {
  const uniqueIds = Array.from(new Set((Array.isArray(userIds) ? userIds : []).filter(Boolean)));
  if (!uniqueIds.length) {
    return new Map();
  }

  const supabase = getSupabaseClient();
  const candidates = [
    { table: "clients", idColumn: "id" },
    { table: "profiles", idColumn: "id" },
    { table: "users", idColumn: "id" },
  ];

  for (const candidate of candidates) {
    try {
      const { data, error } = await supabase
        .from(candidate.table)
        .select("*")
        .in(candidate.idColumn, uniqueIds);
      if (error) {
        continue;
      }
      const map = new Map();
      (Array.isArray(data) ? data : []).forEach((row) => {
        const key = String(row?.[candidate.idColumn] || "").trim();
        if (!key) {
          return;
        }
        map.set(key, extractClientInfo(row));
      });
      if (map.size) {
        return map;
      }
    } catch (error) {
      // ignore and try next table
    }
  }

  return new Map();
};

const fetchRendezVous = async ({ tenantId, startDate, endDate, useILike }) => {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("rendez_vous")
    .select("user_id, tenant_id, date, heure, created_at")
    .order("date", { ascending: true })
    .order("heure", { ascending: true });

  query = useILike ? query.ilike("tenant_id", tenantId) : query.eq("tenant_id", tenantId);
  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase rendez_vous fetch error", { error, tenantId, startDate, endDate });
    return null;
  }
  return Array.isArray(data) ? data : [];
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

  if (auth.tenant?.features && auth.tenant.features.emploi_du_temps === false) {
    return buildResponse(403, { error: "planning_disabled" });
  }

  const tenantId = String(auth.tenant?.id || "").trim();
  if (!tenantId) {
    return buildResponse(400, { error: "missing_tenant" });
  }

  const useILike = isSafeForILike(tenantId);
  const cleanupOk = await cleanupPastRendezVous({ tenantId, useILike, beforeDate: todayIsoUtc() });
  if (!cleanupOk) {
    return buildResponse(500, { error: "db_error" });
  }

  const startDate = normalizeDate(event?.queryStringParameters?.start);
  const endDate = normalizeDate(event?.queryStringParameters?.end);

  let items = null;
  try {
    items = await fetchRendezVous({ tenantId, startDate, endDate, useILike: false });
  } catch (error) {
    console.error("Rendez-vous fetch error", { error, tenantId, startDate, endDate });
    return buildResponse(500, { error: "tenant_lookup_failed" });
  }

  const enrichItems = async (list) => {
    const safeList = Array.isArray(list) ? list : [];
    const ids = safeList.map((item) => item?.user_id).filter(Boolean);
    const clientMap = await loadClientMap(ids);
    return safeList.map((item) => {
      const userId = String(item?.user_id || "").trim();
      const client = userId ? clientMap.get(userId) : null;
      return {
        ...item,
        client_prenom: client?.prenom || "",
        client_snapchat: client?.snapchat || "",
      };
    });
  };

  if (items && items.length) {
    const enriched = await enrichItems(items);
    return buildResponse(200, { items: enriched });
  }

  if (!useILike) {
    return buildResponse(200, { items: items || [] });
  }

  const fallback = await fetchRendezVous({ tenantId, startDate, endDate, useILike: true });
  const enrichedFallback = await enrichItems(fallback || []);
  return buildResponse(200, { items: enrichedFallback });
};
