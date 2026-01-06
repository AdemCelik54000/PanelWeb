const { getAuthContext } = require("./_auth");

const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const unauthorizedResponse = () => buildResponse(401, { error: "unauthorized" });

exports.handler = async (event) => {
  const auth = getAuthContext(event);
  if (!auth) {
    return unauthorizedResponse();
  }

  return buildResponse(200, {
    tenant: {
      id: auth.tenant.id,
      folders: auth.tenant.folders,
    },
  });
};
