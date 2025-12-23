const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

exports.handler = async (event) => {
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

  const tag = `sha1_${hash}`;
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/tags/${encodeURIComponent(
    tag
  )}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
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
