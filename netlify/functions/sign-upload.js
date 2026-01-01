const crypto = require("crypto");

const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const getAuthorizationHeader = (headers) =>
  headers?.authorization || headers?.Authorization || "";

const isAuthorized = (event) => {
  const expectedBasic = process.env.SITE_BASIC_AUTH;
  if (!expectedBasic) {
    return true;
  }

  const authHeader = getAuthorizationHeader(event.headers);
  if (!authHeader.startsWith("Basic ")) {
    return false;
  }

  const base64Value = authHeader.slice("Basic ".length).trim();
  let decoded = "";
  try {
    decoded = Buffer.from(base64Value, "base64").toString("utf8");
  } catch (error) {
    return false;
  }

  return decoded === expectedBasic;
};

const unauthorizedResponse = () => ({
  statusCode: 401,
  headers: {
    "Content-Type": "application/json",
    "WWW-Authenticate": 'Basic realm="Protected"',
  },
  body: JSON.stringify({ error: "unauthorized" }),
});

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

  if (!isAuthorized(event)) {
    return unauthorizedResponse();
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

  const folder = payload?.folder;
  const uploadPreset = payload?.upload_preset;
  const tags = payload?.tags;
  if (!folder || !uploadPreset) {
    return buildResponse(400, { error: "missing_params" });
  }

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
  });
};
