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

const normalizeTime = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  // Accept HH:MM (or HH:MM:SS -> HH:MM)
  const hhmm = text.length >= 5 ? text.slice(0, 5) : text;
  if (!/^\d{2}:\d{2}$/.test(hhmm)) {
    return "";
  }
  const [h, m] = hhmm.split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return "";
  }
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    return "";
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const isSafeForILike = (value) => !/[\%_]/.test(String(value || ""));

async function sendCancellationEmail({ to, tenantId, date, heure }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    return { sent: false, reason: "missing_email_env" };
  }

  const subject = "Annulation de votre rendez-vous";
  const prettyDate = date;
  const prettyTime = heure;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.45">
      <h2 style="margin:0 0 10px 0">Rendez-vous annulé</h2>
      <p style="margin:0 0 10px 0">
        Bonjour,<br/>
        Votre rendez-vous du <strong>${prettyDate}</strong> à <strong>${prettyTime}</strong> a été annulé.
      </p>
      <p style="margin:0 0 10px 0; color:#334155">
        Si vous souhaitez reprendre un rendez-vous, merci de retourner sur le site.
      </p>
      <p style="margin:14px 0 0 0; color:#64748b; font-size:12px">
        Client: ${tenantId}
      </p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("Resend email error", { status: response.status, text });
    return { sent: false, reason: "email_provider_error" };
  }

  return { sent: true };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return buildResponse(405, { error: "method_not_allowed" });
  }

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

  let payload = null;
  try {
    payload = JSON.parse(event.body || "{}") || null;
  } catch {
    payload = null;
  }

  const date = normalizeDate(payload?.date);
  const heure = normalizeTime(payload?.heure);
  const userId = String(payload?.user_id || "").trim();

  if (!date || !heure || !userId) {
    return buildResponse(400, { error: "missing_fields" });
  }

  const useILike = isSafeForILike(tenantId);
  const supabase = getSupabaseClient();

  // Load email BEFORE deleting (optional but helps when row is already gone)
  let email = "";
  try {
    const { data } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
    email = String(data?.email || "").trim();
  } catch (error) {
    // ignore
  }

  let delQuery = supabase.from("rendez_vous").delete();
  delQuery = useILike ? delQuery.ilike("tenant_id", tenantId) : delQuery.eq("tenant_id", tenantId);
  delQuery = delQuery.eq("date", date).eq("heure", heure).eq("user_id", userId);

  const { data: deleted, error } = await delQuery.select();
  if (error) {
    console.error("Supabase delete rendez_vous error", { error, tenantId, date, heure, userId });
    return buildResponse(500, { error: "db_error" });
  }

  const deletedCount = Array.isArray(deleted) ? deleted.length : 0;
  if (!deletedCount) {
    return buildResponse(404, { error: "not_found" });
  }

  let emailResult = { sent: false, reason: "no_email" };
  if (email) {
    try {
      emailResult = await sendCancellationEmail({ to: email, tenantId, date, heure });
    } catch (err) {
      console.error("Cancellation email send failed", err);
      emailResult = { sent: false, reason: "email_send_failed" };
    }
  }

  return buildResponse(200, { deleted: deletedCount, email: emailResult });
};
