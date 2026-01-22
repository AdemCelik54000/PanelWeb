const crypto = require("crypto");

const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const { getAuthContext } = require("../lib/_auth");
const { isAllowedFolder, buildTenantFolder } = require("../lib/_tenants");

const unauthorizedResponse = () =>
  buildResponse(401, { error: "unauthorized" });

const signParams = (params, apiSecret) => {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)]);
  entries.sort(([a], [b]) => a.localeCompare(b));
  const toSign = entries.map(([key, value]) => `${key}=${value}`).join("&");
  return crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
};

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

  if (auth.tenant?.features && auth.tenant.features.image === false) {
    return buildResponse(403, { error: "image_disabled" });
  }

  let payload = null;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    payload = null;
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

  const folderKey = payload?.folder;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || payload?.upload_preset;
  const hash = payload?.hash;
  if (!uploadPreset || !isAllowedFolder(auth.tenant, folderKey)) {
    return buildResponse(400, { error: "missing_params" });
  }

  const folder = buildTenantFolder(auth.tenant, folderKey);
  const tags = hash ? `sha1_${auth.tenant.folderRoot}_${hash}` : "";
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams(
    {
      folder,
      upload_preset: uploadPreset,
      tags,
      timestamp,
    },
    apiSecret
  );

  return buildResponse(200, {
    signature,
    timestamp,
    api_key: apiKey,
    cloud_name: cloudName,
    upload_preset: uploadPreset,
    folder,
    tags,
  });
};
