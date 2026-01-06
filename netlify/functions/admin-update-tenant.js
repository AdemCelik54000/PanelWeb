const { getAdminContext } = require("./_auth");
const { createPasswordHash } = require("./_tenants");

const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const loadTenantsRaw = () => {
  const raw = process.env.TENANTS_JSON || "[]";
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return buildResponse(405, { error: "method_not_allowed" });
  }

  const admin = getAdminContext(event);
  if (!admin) {
    return buildResponse(401, { error: "unauthorized" });
  }

  let payload = null;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    payload = null;
  }

  const targetId = String(payload?.id || "").trim();
  const newPassword = String(payload?.new_password || "");
  if (!targetId || !newPassword) {
    return buildResponse(400, { error: "missing_params" });
  }

  const tenants = loadTenantsRaw();
  const index = tenants.findIndex((tenant) => String(tenant?.id || "") === targetId);
  if (index === -1) {
    return buildResponse(404, { error: "tenant_not_found" });
  }

  const { salt, hash } = createPasswordHash(newPassword);
  tenants[index] = {
    ...tenants[index],
    password_salt: salt,
    password_hash: hash,
  };

  const safeTenants = tenants.map((tenant) => ({
    id: tenant?.id || "",
    folder_root: tenant?.folder_root || "",
    folders: Array.isArray(tenant?.folders) ? tenant.folders : [],
  }));

  return buildResponse(200, {
    tenants: safeTenants,
    updated_tenants_json: JSON.stringify(tenants),
    warning:
      "Mise a jour generee. Collez updated_tenants_json dans TENANTS_JSON sur Netlify pour appliquer.",
  });
};
