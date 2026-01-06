const { getAdminContext } = require("./_auth");

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
  const admin = getAdminContext(event);
  if (!admin) {
    return buildResponse(401, { error: "unauthorized" });
  }

  const tenants = loadTenantsRaw().map((tenant) => ({
    id: tenant?.id || "",
    folder_root: tenant?.folder_root || "",
    folders: Array.isArray(tenant?.folders) ? tenant.folders : [],
  }));

  return buildResponse(200, { tenants });
};
