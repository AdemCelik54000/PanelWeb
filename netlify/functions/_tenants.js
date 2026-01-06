const crypto = require("crypto");

const TENANTS_ENV_KEY = "TENANTS_JSON";
const HASH_ITERATIONS = 100000;
const HASH_KEYLEN = 32;

const normalizeTenantId = (value) => String(value || "").trim().toLowerCase();

const toSafeTenantFolder = (value) => {
  const normalized = normalizeTenantId(value);
  return normalized.replace(/[^a-z0-9.-]/g, "_");
};

const hashPassword = (password, salt) =>
  crypto
    .pbkdf2Sync(String(password || ""), String(salt || ""), HASH_ITERATIONS, HASH_KEYLEN, "sha256")
    .toString("hex");

const timingSafeEqual = (left, right) => {
  const leftBuf = Buffer.from(String(left || ""), "utf8");
  const rightBuf = Buffer.from(String(right || ""), "utf8");
  if (leftBuf.length !== rightBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuf, rightBuf);
};

const flattenFolders = (folders) => {
  const result = [];
  (Array.isArray(folders) ? folders : []).forEach((category) => {
    if (category?.folder) {
      result.push(String(category.folder));
    }
    const subs = Array.isArray(category?.subcategories) ? category.subcategories : [];
    subs.forEach((sub) => {
      if (sub?.folder) {
        result.push(String(sub.folder));
      }
    });
  });
  return result;
};

const loadTenants = () => {
  const raw = process.env[TENANTS_ENV_KEY] || "[]";
  let parsed = [];
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    parsed = [];
  }

  const tenants = new Map();
  (Array.isArray(parsed) ? parsed : []).forEach((tenant) => {
    const normalizedId = normalizeTenantId(tenant?.id);
    if (!normalizedId) {
      return;
    }
    const folders = Array.isArray(tenant?.folders) ? tenant.folders : [];
    const allowedFolders = new Set(flattenFolders(folders));
    tenants.set(normalizedId, {
      id: tenant.id,
      normalizedId,
      password_hash: tenant.password_hash || "",
      password_salt: tenant.password_salt || "",
      folders,
      allowedFolders,
      folderRoot: toSafeTenantFolder(tenant.id),
    });
  });
  return tenants;
};

const getTenantById = (id) => {
  const tenants = loadTenants();
  return tenants.get(normalizeTenantId(id)) || null;
};

const verifyPassword = (tenant, password) => {
  const dummySalt = "dummy_salt";
  const dummyHash = hashPassword("dummy_password", dummySalt);
  const salt = tenant?.password_salt || dummySalt;
  const expectedHash = tenant?.password_hash || dummyHash;
  const actualHash = hashPassword(password, salt);
  return timingSafeEqual(actualHash, expectedHash);
};

const isAllowedFolder = (tenant, folderKey) => {
  const key = String(folderKey || "");
  if (!key || !tenant?.allowedFolders) {
    return false;
  }
  return tenant.allowedFolders.has(key);
};

const buildTenantFolder = (tenant, folderKey) => {
  if (!tenant?.folderRoot) {
    return null;
  }
  return `${tenant.folderRoot}/${folderKey}`;
};

module.exports = {
  getTenantById,
  verifyPassword,
  isAllowedFolder,
  buildTenantFolder,
  normalizeTenantId,
};
