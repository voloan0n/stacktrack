import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// =========================================================
//                         UI
// =========================================================
const BANNER = String.raw`
  ____  _____  _    ____ _  _______ ____      _    ____ _  __
 / ___||_   _|/ \  / ___| |/ /_   _|  _ \    / \  / ___| |/ /
 \___ \  | | / _ \| |   | ' /  | | | |_) |  / _ \| |   | ' /
  ___) | | |/ ___ \ |___| . \  | | |  _ <  / ___ \ |___| . \
 |____/  |_/_/   \_\____|_|\_\ |_| |_| \_\/_/   \_\____|_|\_\
`;

function banner() {
  process.stdout.write(`${BANNER}\n`);
}

function hr() {
  process.stdout.write("------------------------------------------------------------\n");
}

function step(message) {
  process.stdout.write(`==> ${message}\n`);
}

function info(message) {
  process.stdout.write(`    - ${message}\n`);
}

function warn(message) {
  process.stdout.write(`    ! ${message}\n`);
}

function die(message) {
  hr();
  step("Uninstall failed");
  throw new Error(message);
}

// =========================================================
//                     PROCESS RUNNERS
// =========================================================
function run(command, args, { env, cwd } = {}) {
  step(`Running: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    cwd: cwd ?? process.cwd(),
    env: { ...process.env, ...env },
  });
  if (result.error) throw result.error;
  if (typeof result.status === "number" && result.status !== 0) process.exit(result.status);
}

function runCapture(command, args, { env, cwd } = {}) {
  const result = spawnSync(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    cwd: cwd ?? process.cwd(),
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? 1,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

// =========================================================
//                  FILES / ENV PARSING
// =========================================================
function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isCommentLine(line) {
  const trimmed = line.trimStart();
  return trimmed.startsWith("#") || trimmed.startsWith("//");
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseDotenvLike(lines) {
  const vars = {};
  for (const line of lines) {
    if (isCommentLine(line)) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (!key) continue;
    const value = stripWrappingQuotes(line.slice(idx + 1).trim());
    vars[key] = value;
  }
  return vars;
}

// =========================================================
//                        CLEANUP
// =========================================================
function removePath(targetPath, { dryRun } = {}) {
  if (!fileExists(targetPath)) return false;
  if (dryRun) {
    info(`Would remove: ${path.relative(process.cwd(), targetPath)}`);
    return true;
  }
  fs.rmSync(targetPath, { recursive: true, force: true });
  info(`Removed: ${path.relative(process.cwd(), targetPath)}`);
  return true;
}

function removeGeneratedFiles({ repoRoot, dryRun }) {
  step("Workspace cleanup (generated files)");

  const pathsToRemove = [
    path.join(repoRoot, "node_modules"),
    path.join(repoRoot, "dist"),
    path.join(repoRoot, ".turbo"),
    path.join(repoRoot, ".cache"),
    path.join(repoRoot, "coverage"),
    path.join(repoRoot, ".eslintcache"),
    path.join(repoRoot, "apps", "backend", "dist"),
    path.join(repoRoot, "apps", "backend", "node_modules"),
    path.join(repoRoot, "apps", "frontend", ".next"),
    path.join(repoRoot, "apps", "frontend", "node_modules"),
  ];

  const packagesDir = path.join(repoRoot, "packages");
  if (fileExists(packagesDir)) {
    for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      pathsToRemove.push(path.join(packagesDir, entry.name, "node_modules"));
      pathsToRemove.push(path.join(packagesDir, entry.name, "dist"));
    }
  }

  let removedAny = false;
  for (const p of pathsToRemove) {
    removedAny = removePath(p, { dryRun }) || removedAny;
  }

  if (!removedAny) info("Nothing to remove");
}

function removeEnvFiles({ repoRoot, dryRun }) {
  step("Environment cleanup (.env files)");

  const backendEnv = path.join(repoRoot, "apps", "backend", ".env");
  const frontendEnv = path.join(repoRoot, "apps", "frontend", ".env.local");

  const removedBackend = removePath(backendEnv, { dryRun });
  const removedFrontend = removePath(frontendEnv, { dryRun });

  if (!removedBackend && !removedFrontend) info("Nothing to remove");
}

// =========================================================
//                        DATABASE
// =========================================================
function dropDatabaseAndRole({ repoRoot, dryRun }) {
  step("Database cleanup (drop db/role)");

  const backendEnvPath = path.join(repoRoot, "apps", "backend", ".env");
  if (!fileExists(backendEnvPath)) {
    warn("apps/backend/.env not found; skipping db cleanup.");
    return;
  }

  const hasPsql =
    runCapture("bash", ["-lc", "command -v psql >/dev/null 2>&1 && echo yes || echo no"]).stdout.trim() === "yes";
  if (!hasPsql) {
    warn("psql not found; skipping db cleanup.");
    return;
  }

  const canSu = runCapture("bash", ["-lc", "id -u postgres >/dev/null 2>&1 && echo yes || echo no"]).stdout.trim();
  if (canSu !== "yes") {
    warn("postgres OS user not found; skipping db cleanup.");
    return;
  }

  const raw = fs.readFileSync(backendEnvPath, "utf8");
  const lines = raw.replaceAll("\r\n", "\n").split("\n");
  const vars = parseDotenvLike(lines);

  const dbUser = vars.DB_USERNAME || "stacktrack";
  const dbName = vars.DB_NAME || "stacktrack";

  info(`DB user: ${dbUser}`);
  info(`DB name: ${dbName}`);

  const psqlAsPostgres = (sql) =>
    runCapture("bash", ["-lc", `su - postgres -c "psql -v ON_ERROR_STOP=1 -tAc \\"${sql.replaceAll('"', '\\"')}\\""`]);

  const dbExists = psqlAsPostgres(`SELECT 1 FROM pg_database WHERE datname='${dbName}'`).stdout === "1";
  const roleExists = psqlAsPostgres(`SELECT 1 FROM pg_roles WHERE rolname='${dbUser}'`).stdout === "1";

  if (!dbExists && !roleExists) {
    info("No matching database/role found");
    return;
  }

  if (dryRun) {
    if (dbExists) info(`Would drop database: ${dbName}`);
    if (roleExists) info(`Would drop role: ${dbUser}`);
    return;
  }

  if (dbExists) {
    info("Dropping database (terminating connections)");
    psqlAsPostgres(`REVOKE CONNECT ON DATABASE "${dbName}" FROM PUBLIC;`);
    psqlAsPostgres(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${dbName}' AND pid <> pg_backend_pid();`
    );
    psqlAsPostgres(`DROP DATABASE "${dbName}";`);
  }

  if (roleExists) {
    info("Dropping role (reassigning/dropping owned objects)");
    psqlAsPostgres(`REASSIGN OWNED BY "${dbUser}" TO postgres;`);
    psqlAsPostgres(`DROP OWNED BY "${dbUser}";`);
    psqlAsPostgres(`DROP ROLE "${dbUser}";`);
  }
}

// =========================================================
//                   OPTIONAL SYSTEM PURGE
// =========================================================
function maybePurgePostgres({ dryRun }) {
  step("System cleanup (optional: purge Postgres)");
  if (dryRun) {
    info("Would run: apt-get purge postgresql* (if requested)");
    return;
  }
  run("apt-get", ["purge", "-y", "postgresql", "postgresql-contrib"]);
  run("apt-get", ["autoremove", "-y"]);
}

// =========================================================
//                       ENTRYPOINT
// =========================================================
function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  return {
    yes: flags.has("--yes"),
    dryRun: flags.has("--dry-run"),
    skipDb: flags.has("--skip-db"),
    purgePostgres: flags.has("--purge-postgres"),
  };
}

async function main() {
  const repoRoot = process.cwd();
  const args = parseArgs(process.argv);

  banner();
  hr();
  step("Uninstall / reset");
  hr();

  if (!args.yes && !args.dryRun) {
    die("Refusing to run without confirmation. Re-run with `--yes` (or preview with `--dry-run`).");
  }

  removeEnvFiles({ repoRoot, dryRun: args.dryRun });
  removeGeneratedFiles({ repoRoot, dryRun: args.dryRun });

  if (!args.skipDb) {
    dropDatabaseAndRole({ repoRoot, dryRun: args.dryRun });
  } else {
    step("Database cleanup (skipped)");
  }

  if (args.purgePostgres) {
    warn("This will remove system packages; only use if you installed Postgres solely for StackTrack.");
    maybePurgePostgres({ dryRun: args.dryRun });
  }

  hr();
  step("Done");
  if (args.dryRun) info("No changes made (dry-run).");
  info("Next: run `pnpm bootstrap` to reinstall.");
}

main().catch((e) => {
  hr();
  step("Uninstall failed");
  console.error(e);
  process.exit(1);
});
