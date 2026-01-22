const { getAuthContext } = require("../lib/_auth");

const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const unauthorizedResponse = () => buildResponse(401, { error: "unauthorized" });

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
    return buildResponse(200, {
      needsSelection: true,
      tenant: {
        id: auth.actor.id,
        role: auth.actor.role || "admin",
        folders: [],
      },
    });
  }

  return buildResponse(200, {
    tenant: {
      id: auth.tenant.id,
      role: auth.actor.role || auth.tenant.role || "client",
      folders: auth.tenant.folders,
      features: auth.tenant.features || { image: true, emploi_du_temps: true },
    },
  });
};
