const crypto = require("crypto");
const { signToken } = require("./_auth");

const ADMIN_ID = process.env.ADMIN_ID || "";
const ADMIN_PASSWORD_SALT = process.env.ADMIN_PASSWORD_SALT || "";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";

const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const hashPassword = (password, salt) =>
  crypto
    .pbkdf2Sync(String(password || ""), String(salt || ""), 100000, 32, "sha256")
    .toString("hex");

const timingSafeEqual = (left, right) => {
  const leftBuf = Buffer.from(String(left || ""), "utf8");
  const rightBuf = Buffer.from(String(right || ""), "utf8");
  if (leftBuf.length !== rightBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuf, rightBuf);
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

  const identifier = String(payload?.identifier || "");
  const password = String(payload?.password || "");
  if (!identifier || !password) {
    return buildResponse(401, { error: "unauthorized" });
  }

  const adminIdOk = timingSafeEqual(identifier.trim(), ADMIN_ID.trim());
  const hash = hashPassword(password, ADMIN_PASSWORD_SALT);
  const adminPasswordOk = timingSafeEqual(hash, ADMIN_PASSWORD_HASH);

  if (!adminIdOk || !adminPasswordOk) {
    return buildResponse(401, { error: "unauthorized" });
  }

  let token = "";
  try {
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 6;
    token = signToken({ role: "admin", exp });
  } catch (error) {
    return buildResponse(500, { error: "missing_auth_secret" });
  }

  return buildResponse(200, { token });
};
