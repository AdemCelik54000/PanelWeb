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
  const selectWithFlags = "id, folder_root, password_salt, password_hash, role, image, emploi_du_temps";
  const selectLegacy = "id, folder_root, password_salt, password_hash, role";

  const attemptSelect = async (select) => {
    const { data, error } = await supabase
      .from("tenants")
      .select(select)
      .eq("id", tenantId)
      .maybeSingle();
    return { data, error };
  };

  let result = await attemptSelect(selectWithFlags);
  if (result.error) {
    const message = String(result.error?.message || "");
    const likelyMissingColumns =
      message.includes("emploi_du_temps") ||
      message.includes("image") ||
      message.includes("column") ||
      message.includes("PGRST");
    if (likelyMissingColumns) {
      result = await attemptSelect(selectLegacy);
    }
  }

  if (result.error) {
    console.error("Supabase tenant fetch error", { error: result.error, tenantId });
    return null;
  }

  if (result.data) {
    return result.data;
  }

  const safeForILike = !/[\%_]/.test(String(tenantId || ""));
  if (!safeForILike) {
    return null;
  }

  const attemptFallback = async (select) => {
    const fallback = await supabase
      .from("tenants")
      .select(select)
      .ilike("id", tenantId)
      .maybeSingle();
    return fallback;
  };

  let fallback = await attemptFallback(selectWithFlags);
  if (fallback.error) {
    const message = String(fallback.error?.message || "");
    const likelyMissingColumns =
      message.includes("emploi_du_temps") ||
      message.includes("image") ||
      message.includes("column") ||
      message.includes("PGRST");
    if (likelyMissingColumns) {
      fallback = await attemptFallback(selectLegacy);
    }
  }
  if (fallback.error) {
    console.error("Supabase tenant fetch error", { error: fallback.error, tenantId });
    return null;
  }
  return fallback.data || null;
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
  const rows = Array.isArray(data) ? data : [];
  if (rows.length) {
    return rows;
  }

  const safeForILike = !/[\%_]/.test(String(tenantId || ""));
  if (!safeForILike) {
    return [];
  }

  const fallback = await supabase
    .from("categories")
    .select("id, label, folder, sort_order")
    .ilike("tenant_id", tenantId)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  if (fallback.error) {
    console.error("Supabase categories fetch error", { error: fallback.error, tenantId });
    return [];
  }
  return Array.isArray(fallback.data) ? fallback.data : [];
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
  const rows = Array.isArray(data) ? data : [];
  if (rows.length) {
    return rows;
  }

  const safeForILike = !/[\%_]/.test(String(tenantId || ""));
  if (!safeForILike) {
    return [];
  }

  const fallback = await supabase
    .from("subcategories")
    .select("id, category_id, label, folder, sort_order")
    .ilike("tenant_id", tenantId)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  if (fallback.error) {
    console.error("Supabase subcategories fetch error", { error: fallback.error, tenantId });
    return [];
  }
  return Array.isArray(fallback.data) ? fallback.data : [];
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
  const folderRootSource = tenantRow.folder_root ? tenantRow.folder_root : tenantRow.id;
  const folderRoot = toSafeTenantFolder(folderRootSource);
  const role = tenantRow.role ? String(tenantRow.role) : "client";

  const imageEnabled = tenantRow.image === undefined ? true : Boolean(tenantRow.image);
  const planningEnabled = tenantRow.emploi_du_temps === undefined ? true : Boolean(tenantRow.emploi_du_temps);

  return {
    id: tenantRow.id,
    normalizedId,
    password_hash: tenantRow.password_hash || "",
    password_salt: tenantRow.password_salt || "",
    folders,
    allowedFolders,
    folderRoot,
    role,
    features: {
      image: imageEnabled,
      emploi_du_temps: planningEnabled,
    },
  };
};

const listTenants = async () => {
  const supabase = getSupabaseClient();
  const selectWithFlags = "id, role, image, emploi_du_temps";
  const selectLegacy = "id, role";

  const attemptSelect = async (select) => {
    const { data, error } = await supabase
      .from("tenants")
      .select(select)
      .order("id", { ascending: true });
    return { data, error };
  };

  let result = await attemptSelect(selectWithFlags);
  if (result.error) {
    const message = String(result.error?.message || "");
    const likelyMissingColumns =
      message.includes("emploi_du_temps") ||
      message.includes("image") ||
      message.includes("column") ||
      message.includes("PGRST");
    if (likelyMissingColumns) {
      result = await attemptSelect(selectLegacy);
    }
  }

  if (result.error) {
    console.error("Supabase tenants list error", { error: result.error });
    return [];
  }

  return (Array.isArray(result.data) ? result.data : []).map((tenant) => ({
    id: tenant.id,
    role: tenant.role ? String(tenant.role) : "client",
    features: {
      image: tenant.image === undefined ? true : Boolean(tenant.image),
      emploi_du_temps:
        tenant.emploi_du_temps === undefined ? true : Boolean(tenant.emploi_du_temps),
    },
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
