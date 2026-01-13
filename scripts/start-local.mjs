import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const run = (cmd, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });

const fileExists = (p) => {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const copyIfMissing = (from, to) => {
  if (fileExists(to)) return false;
  if (!fileExists(from)) return false;
  fs.copyFileSync(from, to);
  return true;
};

const main = async () => {
  const argv = new Set(process.argv.slice(2));
  if (argv.has("--help") || argv.has("-h")) {
    console.log("Usage: npm run local");
    console.log("  - Installe les deps si besoin");
    console.log("  - Crée .env depuis .env.example si absent");
    console.log("  - Lance Netlify Dev (http://localhost:8888)");
    console.log("Options:");
    console.log("  --check  Vérifie deps/.env sans démarrer le serveur");
    return;
  }

  const npmCmd = "npm";

  // 1) Ensure deps installed (includes netlify-cli)
  if (!fileExists(path.join(root, "node_modules"))) {
    console.log("[local] node_modules manquant → npm install");
    await run(npmCmd, ["install"]);
  }

  // 2) Ensure .env exists (ignored by git)
  const envCreated = copyIfMissing(
    path.join(root, ".env.example"),
    path.join(root, ".env")
  );
  if (envCreated) {
    console.log(
      "[local] .env créé depuis .env.example → remplis tes clés TEST (Supabase/Cloudinary)"
    );
  }

  if (argv.has("--check")) {
    console.log("[local] OK (checks only)");
    return;
  }

  // 3) Start netlify dev (proxy + functions)
  console.log("[local] Démarrage Netlify Dev… (URL: http://localhost:8888)");
  await run(npmCmd, ["run", "dev:netlify"], { env: process.env });
};

main().catch((err) => {
  console.error("[local] Erreur:", err?.message || err);
  process.exit(1);
});
