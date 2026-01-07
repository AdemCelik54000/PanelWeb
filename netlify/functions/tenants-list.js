const { getAuthContext } = require("../lib/_auth");
const { listTenants } = require("../lib/_tenants");

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
  if (!auth.isAdmin) {
    return buildResponse(403, { error: "forbidden" });
  }

  const tenants = await listTenants();
  const clients = tenants.filter((tenant) => tenant.role !== "admin");
  return buildResponse(200, { tenants: clients });
};
