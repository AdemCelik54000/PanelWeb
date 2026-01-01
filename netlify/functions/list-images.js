const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

exports.handler = async (event) => {
  const folder = event?.queryStringParameters?.folder;
  if (!folder) {
    return buildResponse(400, { error: "missing_folder" });
  }

  const prefix = folder.endsWith("/") ? folder : `${folder}/`;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return buildResponse(500, { error: "missing_cloudinary_env" });
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const baseUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image`;

  let nextCursor = null;
  let resources = [];

  try {
    do {
      const params = new URLSearchParams({
        type: "upload",
        prefix,
        max_results: "500",
        context: "true",
      });
      if (nextCursor) {
        params.set("next_cursor", nextCursor);
      }

      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (!response.ok) {
        return buildResponse(500, { error: "cloudinary_error" });
      }

      const data = await response.json();
      resources = resources.concat(Array.isArray(data?.resources) ? data.resources : []);
      nextCursor = data?.next_cursor || null;
    } while (nextCursor);
  } catch (error) {
    return buildResponse(500, { error: "cloudinary_error" });
  }

  const items = resources.map((resource) => {
    const context = resource?.context?.custom || resource?.context || {};
    return {
      public_id: resource.public_id,
      secure_url: resource.secure_url,
      created_at: resource.created_at,
      position: context?.position ?? null,
    };
  });

  return buildResponse(200, { items });
};
