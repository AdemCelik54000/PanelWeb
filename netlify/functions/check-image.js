const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const { getAuthContext } = require("../lib/_auth");

const unauthorizedResponse = () =>
  buildResponse(401, { error: "unauthorized" });

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

  if (auth.tenant?.features && auth.tenant.features.image === false) {
    return buildResponse(403, { error: "image_disabled" });
  }

  const hash = event?.queryStringParameters?.hash;
  if (!hash) {
    return buildResponse(400, { error: "missing_hash" });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return buildResponse(500, { error: "missing_cloudinary_env" });
  }

  const tag = `sha1_${auth.tenant.folderRoot}_${hash}`;
  const cloudAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/tags/${encodeURIComponent(
    tag
  )}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${cloudAuth}` },
    });

    if (response.status === 404) {
      return buildResponse(200, { exists: false });
    }

    if (!response.ok) {
      return buildResponse(200, { exists: false });
    }

    const data = await response.json();
    const resources = Array.isArray(data?.resources) ? data.resources : [];
    return buildResponse(200, { exists: resources.length > 0 });
  } catch (error) {
    return buildResponse(200, { exists: false });
  }
};
