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

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const grouped = items.reduce((acc, item) => {
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
          Authorization: `Basic ${auth}`,
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
