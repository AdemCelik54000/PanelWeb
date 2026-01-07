const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const { getAuthContext } = require("../lib/_auth");

const unauthorizedResponse = () =>
  buildResponse(401, { error: "unauthorized" });

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

  let payload = null;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    payload = null;
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) {
    return buildResponse(400, { error: "missing_items" });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    const missing = [];
    if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
    if (!apiKey) missing.push("CLOUDINARY_API_KEY");
    if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");
    console.error("Cloudinary env missing", { missing });
    return buildResponse(500, { error: "missing_cloudinary_env", missing });
  }

  const cloudAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const tenantPrefix = `${auth.tenant.folderRoot}/`;
  const validatedItems = items.filter((item) => {
    if (!item?.public_id) {
      return false;
    }
    return String(item.public_id).startsWith(tenantPrefix);
  });
  if (validatedItems.length !== items.length) {
    return buildResponse(400, { error: "invalid_item" });
  }
  const grouped = validatedItems.reduce((acc, item) => {
    const type = item?.resource_type === "video" ? "video" : "image";
    if (!item?.public_id) {
      return acc;
    }
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(item.public_id);
    return acc;
  }, {});

  try {
    for (const [resourceType, publicIds] of Object.entries(grouped)) {
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload`;
      const body = new URLSearchParams();
      publicIds.forEach((id) => body.append("public_ids[]", id));
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${cloudAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Cloudinary delete error", {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          resourceType,
        });
        return buildResponse(500, {
          error: "cloudinary_error",
          status: response.status,
          body: errorBody,
        });
      }
    }
  } catch (error) {
    console.error("Cloudinary delete error", { error });
    return buildResponse(500, { error: "cloudinary_error", message: String(error) });
  }

  return buildResponse(200, { deleted: items.length });
};
