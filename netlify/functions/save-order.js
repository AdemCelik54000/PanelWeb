const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const toValidPosition = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }
  return Math.floor(numberValue);
};

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

  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) {
    return buildResponse(400, { error: "missing_items" });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return buildResponse(500, { error: "missing_cloudinary_env" });
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/context`;

  try {
    for (const item of items) {
      const publicId = item?.public_id;
      const position = toValidPosition(item?.position);
      if (!publicId || !position) {
        return buildResponse(400, { error: "invalid_item" });
      }

      const body = new URLSearchParams();
      body.append("public_ids[]", publicId);
      body.append("context", `position=${position}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!response.ok) {
        return buildResponse(500, { error: "cloudinary_error", public_id: publicId });
      }
    }
  } catch (error) {
    return buildResponse(500, { error: "cloudinary_error" });
  }

  return buildResponse(200, { updated: items.length });
};
