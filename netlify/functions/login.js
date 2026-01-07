const { signToken } = require("../lib/_auth");
const { getTenantById, verifyPassword, normalizeTenantId } = require("../lib/_tenants");

const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return buildResponse(405, { error: "method_not_allowed" });
  }

  let payload = null;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    payload = null;
  }

  const identifier = normalizeTenantId(payload?.identifier);
  const password = String(payload?.password || "");
  let tenant = null;
  try {
    tenant = await getTenantById(identifier);
  } catch (error) {
    if (error?.message === "missing_supabase_env") {
      return buildResponse(500, { error: "missing_supabase_env" });
    }
    console.error("Supabase login error", { error, identifier });
    return buildResponse(500, { error: "tenant_lookup_failed" });
  }

  const passwordOk = verifyPassword(tenant, password);
  if (!tenant || !passwordOk) {
    return buildResponse(401, { error: "unauthorized" });
  }

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 12;
  let token = "";
  try {
    token = signToken({ tid: tenant.normalizedId, role: "tenant", exp });
  } catch (error) {
    return buildResponse(500, { error: "missing_auth_secret" });
  }

  return buildResponse(200, {
    token,
    tenant: {
      id: tenant.id,
      folders: tenant.folders,
    },
  });
};
