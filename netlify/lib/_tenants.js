const crypto = require("crypto");

const { getSupabaseClient } = require("./supabase");

const HASH_ITERATIONS = 100000;
const HASH_KEYLEN = 32;

const normalizeTenantId = (value) => String(value || "").trim();

const toSafeTenantFolder = (value) => {
  const normalized = normalizeTenantId(value).toLowerCase();
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

const loadTenantRecord = async (tenantId) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, folder_root, password_salt, password_hash, role")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) {
    console.error("Supabase tenant fetch error", { error, tenantId });
    return null;
  }
  return data;
};

const loadCategories = async (tenantId) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, label, folder, sort_order")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  if (error) {
    console.error("Supabase categories fetch error", { error, tenantId });
    return [];
  }
  return Array.isArray(data) ? data : [];
};

const loadSubcategories = async (tenantId) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("id, category_id, label, folder, sort_order")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  if (error) {
    console.error("Supabase subcategories fetch error", { error, tenantId });
    return [];
  }
  return Array.isArray(data) ? data : [];
};

const buildFolderTree = (categories, subcategories) => {
  const subByCategory = new Map();
  subcategories.forEach((sub) => {
    if (!sub?.category_id) {
      return;
    }
    if (!subByCategory.has(sub.category_id)) {
      subByCategory.set(sub.category_id, []);
    }
    subByCategory.get(sub.category_id).push({
      id: sub.id,
      label: sub.label,
      folder: sub.folder,
    });
  });

  return categories.map((category) => ({
    id: category.id,
    label: category.label,
    folder: category.folder,
    subcategories: subByCategory.get(category.id) || [],
  }));
};

const getTenantById = async (id) => {
  const normalizedId = normalizeTenantId(id);
  if (!normalizedId) {
    return null;
  }

  const tenantRow = await loadTenantRecord(normalizedId);
  if (!tenantRow) {
    return null;
  }

  const [categories, subcategories] = await Promise.all([
    loadCategories(normalizedId),
    loadSubcategories(normalizedId),
  ]);
  const folders = buildFolderTree(categories, subcategories);
  const allowedFolders = new Set(flattenFolders(folders));
  const folderRoot = tenantRow.folder_root
    ? String(tenantRow.folder_root)
    : toSafeTenantFolder(tenantRow.id);
  const role = tenantRow.role ? String(tenantRow.role) : "client";

  return {
    id: tenantRow.id,
    normalizedId,
    password_hash: tenantRow.password_hash || "",
    password_salt: tenantRow.password_salt || "",
    folders,
    allowedFolders,
    folderRoot,
    role,
  };
};

const listTenants = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, role")
    .order("id", { ascending: true });
  if (error) {
    console.error("Supabase tenants list error", { error });
    return [];
  }
  return (Array.isArray(data) ? data : []).map((tenant) => ({
    id: tenant.id,
    role: tenant.role ? String(tenant.role) : "client",
  }));
};

const verifyPassword = (tenant, password) => {
  const dummySalt = "dummy_salt";
  const dummyHash = hashPassword("dummy_password", dummySalt);
  const salt = tenant?.password_salt || dummySalt;
  const expectedHash = tenant?.password_hash || dummyHash;
  const actualHash = hashPassword(password, salt);
  return timingSafeEqual(actualHash, expectedHash);
};

const createPasswordHash = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return { salt, hash };
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
  listTenants,
  verifyPassword,
  isAllowedFolder,
  buildTenantFolder,
  normalizeTenantId,
  createPasswordHash,
};
