const crypto = require("crypto");
const { getTenantById } = require("./_tenants");

const AUTH_SECRET = process.env.AUTH_SECRET;

const base64UrlEncode = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const base64UrlDecode = (input) => {
  const normalized = String(input || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64").toString("utf8");
};

const signToken = (payload) => {
  if (!AUTH_SECRET) {
    throw new Error("missing_auth_secret");
  }
  const header = { alg: "HS256", typ: "JWT" };
  const headerPart = base64UrlEncode(JSON.stringify(header));
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerPart}.${payloadPart}`;
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(data).digest("base64");
  const signaturePart = signature.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${signaturePart}`;
};

const verifyToken = (token) => {
  if (!AUTH_SECRET) {
    return null;
  }
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [headerPart, payloadPart, signaturePart] = parts;
  const data = `${headerPart}.${payloadPart}`;
  const expected = crypto.createHmac("sha256", AUTH_SECRET).update(data).digest("base64");
  const expectedPart = expected.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (signaturePart !== expectedPart) {
    return null;
  }

  let payload = null;
  try {
    payload = JSON.parse(base64UrlDecode(payloadPart));
  } catch (error) {
    payload = null;
  }
  if (!payload?.tid) {
    return null;
  }
  if (payload?.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
};

const getBearerToken = (headers) => {
  const header = headers?.authorization || headers?.Authorization || "";
  if (!header.startsWith("Bearer ")) {
    return "";
  }
  return header.slice("Bearer ".length).trim();
};

const getAuthContext = async (event) => {
  const token = getBearerToken(event.headers || {});
  const payload = verifyToken(token);
  if (!payload || payload.role !== "tenant") {
    return null;
  }
  let tenant = null;
  try {
    tenant = await getTenantById(payload.tid);
  } catch (error) {
    if (error?.message === "missing_supabase_env") {
      throw error;
    }
    console.error("Auth tenant lookup failed", { error, tenantId: payload.tid });
    return null;
  }
  if (!tenant) {
    return null;
  }
  return { tenant, payload };
};

module.exports = {
  signToken,
  getAuthContext,
};
