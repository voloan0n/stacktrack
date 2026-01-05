import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline";

let VERBOSE = false;

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
  step("Install failed");
  throw new Error(message);
}

// =========================================================
//                     PROCESS RUNNERS
// =========================================================
function run(command, args, { env, cwd } = {}) {
  step(`Running: ${command} ${args.join(" ")}`);
  const shouldInherit = VERBOSE;
  const result = spawnSync(command, args, {
    stdio: shouldInherit ? "inherit" : ["ignore", "pipe", "pipe"],
    shell: false,
    cwd: cwd ?? process.cwd(),
    env: { ...process.env, ...env },
    ...(shouldInherit ? {} : { encoding: "utf8" }),
  });
  if (result.error) throw result.error;
  if (typeof result.status === "number" && result.status !== 0) {
    if (!shouldInherit) {
      if (result.stdout) process.stdout.write(String(result.stdout));
      if (result.stderr) process.stderr.write(String(result.stderr));
    }
    process.exit(result.status);
  }
}

function runTry(command, args, { env, cwd } = {}) {
  const result = spawnSync(command, args, {
    stdio: VERBOSE ? "inherit" : ["ignore", "pipe", "pipe"],
    shell: false,
    cwd: cwd ?? process.cwd(),
    env: { ...process.env, ...env },
    ...(VERBOSE ? {} : { encoding: "utf8" }),
  });
  if (result.error) throw result.error;
  return typeof result.status === "number" ? result.status : 1;
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

function canRun(command, args = []) {
  try {
    const res = runCapture(command, args);
    return res.status === 0;
  } catch {
    return false;
  }
}

function escapeSqlLiteral(value) {
  return String(value ?? "").replaceAll("'", "''");
}

function escapeSqlIdentifier(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function psqlCapture(sql, { user, password, host, port, database } = {}) {
  // Use `-w` so psql never prompts interactively (bootstrap should be non-blocking).
  const args = ["-w", "-v", "ON_ERROR_STOP=1", "-tAc", sql];
  if (host) args.unshift("-h", String(host));
  if (port) args.unshift("-p", String(port));
  if (user) args.unshift("-U", String(user));
  if (database) args.unshift("-d", String(database));

  const env = {};
  if (typeof password === "string") env.PGPASSWORD = password;

  return runCapture("psql", args, { env });
}

async function promptSecret(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl.stdoutMuted = true;
  rl._writeToOutput = function _writeToOutput(stringToWrite) {
    if (rl.stdoutMuted) rl.output.write("*");
    else rl.output.write(stringToWrite);
  };

  const answer = await new Promise((resolve) => rl.question(`${question}: `, resolve));
  rl.close();
  process.stdout.write("\n");
  return String(answer ?? "");
}

async function promptYesNo(question, { defaultYes = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultYes ? " [Y/n] " : " [y/N] ";
  const answer = await new Promise((resolve) => rl.question(`${question}${suffix}`, resolve));
  rl.close();
  const normalized = String(answer ?? "").trim().toLowerCase();
  if (!normalized) return defaultYes;
  if (["y", "yes"].includes(normalized)) return true;
  if (["n", "no"].includes(normalized)) return false;
  return defaultYes;
}

function setEnvVarIfMissingOrPlaceholder(lines, key, nextValue, placeholders = []) {
  const keyRegex = new RegExp(`^\\s*${key.replaceAll(".", "\\.")}\\s*=`);
  const placeholderSet = new Set(placeholders.map((p) => String(p).toLowerCase()));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCommentLine(line)) continue;
    if (!keyRegex.test(line)) continue;

    const assigned = stripWrappingQuotes(getAssignedValue(line));
    const normalized = String(assigned).trim().toLowerCase();
    if (assigned.length > 0 && !placeholderSet.has(normalized)) return { updated: false };

    const hadDoubleQuotes = getAssignedValue(line).trimStart().startsWith("\"");
    const renderedValue = hadDoubleQuotes ? `"${nextValue}"` : nextValue;
    lines[i] = `${key}=${renderedValue}`;
    return { updated: true };
  }

  lines.push(`${key}="${nextValue}"`);
  return { updated: true };
}

function updateEnvFileValue(filePath, key, nextValue) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.replaceAll("\r\n", "\n").split("\n");
  const result = setEnvVarPreservingLayout(lines, key, nextValue, { onlyIfMissingOrPlaceholder: false });
  if (result.updated) {
    fs.writeFileSync(filePath, `${lines.join("\n").trimEnd()}\n`, "utf8");
  }
  return result.updated;
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

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

function isCommentLine(line) {
  const trimmed = line.trimStart();
  return trimmed.startsWith("#") || trimmed.startsWith("//");
}

function getAssignedValue(line) {
  const idx = line.indexOf("=");
  if (idx === -1) return "";
  return line.slice(idx + 1).trim();
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
//                ENV FILE MATERIALIZATION
// =========================================================
function setEnvVarPreservingLayout(lines, key, nextValue, { onlyIfMissingOrPlaceholder } = {}) {
  const keyRegex = new RegExp(`^\\s*${key.replaceAll(".", "\\.")}\\s*=`);
  const placeholderRegex = /replace-with-64-hex/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCommentLine(line)) continue;
    if (!keyRegex.test(line)) continue;

    const assigned = stripWrappingQuotes(getAssignedValue(line));
    const shouldSet =
      !onlyIfMissingOrPlaceholder ||
      assigned.length === 0 ||
      placeholderRegex.test(assigned);

    if (!shouldSet) return { updated: false };

    const hadDoubleQuotes = getAssignedValue(line).trimStart().startsWith("\"");
    const renderedValue = hadDoubleQuotes ? `"${nextValue}"` : nextValue;
    lines[i] = `${key}=${renderedValue}`;
    return { updated: true };
  }

  if (!onlyIfMissingOrPlaceholder) {
    lines.push(`${key}=${nextValue}`);
    return { updated: true };
  }

  lines.push(`${key}="${nextValue}"`);
  return { updated: true };
}

function ensureFromExample({ examplePath, targetPath }) {
  if (fileExists(targetPath)) return { created: false };
  if (!fileExists(examplePath)) {
    throw new Error(`Missing env template: ${path.relative(process.cwd(), examplePath)}`);
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(examplePath, targetPath);
  return { created: true };
}

function materializeDatabaseUrl(lines) {
  const vars = parseDotenvLike(lines);
  const databaseUrl = vars.DATABASE_URL || "";
  const needsMaterialize = databaseUrl.includes("${") || databaseUrl.includes("}");
  if (!needsMaterialize) return { changed: false };

  const username = vars.DB_USERNAME || "stacktrack";
  const password = vars.DB_PASSWORD || "stacktrack";
  const host = vars.DB_HOST || "localhost";
  const port = vars.DB_PORT || "5432";
  const dbName = vars.DB_NAME || "stacktrack";

  const url = `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(
    password
  )}@${host}:${port}/${dbName}?schema=public`;

  const result = setEnvVarPreservingLayout(lines, "DATABASE_URL", url, {
    onlyIfMissingOrPlaceholder: false,
  });
  return { changed: result.updated };
}

function updateBackendEnv(backendEnvPath) {
  const raw = fs.readFileSync(backendEnvPath, "utf8");
  const lines = raw.replaceAll("\r\n", "\n").split("\n");
  const vars = parseDotenvLike(lines);

  const jwtSecret = randomHex(32);
  const cookieSecret = randomHex(32);
  const appSecret = randomHex(32);

  const dbUrlResult = materializeDatabaseUrl(lines);
  const jwtResult = setEnvVarPreservingLayout(lines, "JWT_SECRET", jwtSecret, {
    onlyIfMissingOrPlaceholder: true,
  });
  const cookieResult = setEnvVarPreservingLayout(lines, "COOKIE_SECRET", cookieSecret, {
    onlyIfMissingOrPlaceholder: true,
  });
  const appSecretResult = setEnvVarPreservingLayout(lines, "APP_SECRET", appSecret, {
    onlyIfMissingOrPlaceholder: true,
  });

  if (
    !dbUrlResult.changed &&
    !jwtResult.updated &&
    !cookieResult.updated &&
    !appSecretResult.updated
  ) {
    return { changed: false };
  }
  fs.writeFileSync(backendEnvPath, `${lines.join("\n").trimEnd()}\n`, "utf8");
  return { changed: true };
}

function readBackendEnvVars(backendEnvPath) {
  const raw = fs.readFileSync(backendEnvPath, "utf8");
  const lines = raw.replaceAll("\r\n", "\n").split("\n");
  return parseDotenvLike(lines);
}

function setupEnvFiles({ repoRoot }) {
  step("Environment");
  const backendExample = path.join(repoRoot, "apps", "backend", ".env.example");
  const backendEnv = path.join(repoRoot, "apps", "backend", ".env");
  const frontendExample = path.join(repoRoot, "apps", "frontend", ".env.example");
  const frontendEnv = path.join(repoRoot, "apps", "frontend", ".env.local");

  info("Ensuring env files exist");
  const backendCreated = ensureFromExample({ examplePath: backendExample, targetPath: backendEnv });
  const frontendCreated = ensureFromExample({ examplePath: frontendExample, targetPath: frontendEnv });

  info("Generating secrets / materializing DATABASE_URL (if needed)");
  const backendUpdated = updateBackendEnv(backendEnv);

  if (backendCreated.created) info("Created apps/backend/.env");
  if (frontendCreated.created) info("Created apps/frontend/.env.local");
  if (backendUpdated.changed) info("Updated apps/backend/.env");

  return { backendEnvPath: backendEnv };
}

// =========================================================
//                    PNPM / DEPENDENCIES
// =========================================================
function readPackageManagerSpec(repoRoot) {
  const pkgPath = path.join(repoRoot, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  return String(pkg.packageManager || "pnpm");
}

function ensurePnpmAvailable({ repoRoot }) {
  step("Package manager (pnpm)");
  const hasPnpm = canRun("pnpm", ["--version"]);
  if (hasPnpm) {
    info("pnpm already installed");
    return;
  }

  const hasCorepack = canRun("corepack", ["--version"]);
  if (!hasCorepack) {
    die("pnpm not found, and corepack is not available. Install Node.js (with corepack) or install pnpm manually.");
  }

  const spec = readPackageManagerSpec(repoRoot);
  info(`Enabling corepack and activating ${spec}`);
  run("corepack", ["enable"]);
  const atIdx = spec.indexOf("@");
  const pkg = atIdx === -1 ? "pnpm" : spec.slice(0, atIdx);
  const version = atIdx === -1 ? null : spec.slice(atIdx + 1);
  if (pkg !== "pnpm" || !version) {
    run("corepack", ["prepare", "pnpm@latest", "--activate"]);
    return;
  }
  run("corepack", ["prepare", `pnpm@${version}`, "--activate"]);
}

function installDependencies() {
  step("Dependencies");
  run("pnpm", ["install"]);
}

// =========================================================
//                         POSTGRES
// =========================================================
function ensurePostgresInstalled() {
  step("Postgres");
  const hasPsql = canRun("psql", ["--version"]);
  if (hasPsql) {
    info("Postgres client found");
    return;
  }

  const hasApt = canRun("apt-get", ["--version"]);
  if (!hasApt) {
    warn("psql not found and apt-get is not available; skipping Postgres installation.");
    return;
  }

  info("Installing PostgreSQL via apt-get (requires root + network)");
  run("apt-get", ["update"]);
  run("apt-get", ["install", "-y", "postgresql", "postgresql-contrib"]);
}

function ensurePostgresRunning() {
  if (!canRun("pg_isready", ["--help"])) {
    warn("pg_isready not found; skipping Postgres readiness check.");
    return;
  }

  const isReady = runCapture("pg_isready", []).status === 0;
  if (isReady) {
    info("Postgres is accepting connections");
    return;
  }

  const hasSystemctl = canRun("systemctl", ["--version"]);

  if (hasSystemctl) {
    info("Starting postgresql service");
    run("systemctl", ["start", "postgresql"]);
  } else {
    warn("systemctl not available; ensure Postgres is running.");
  }

  const isReadyAfter = runCapture("pg_isready", []).status === 0;
  if (!isReadyAfter) {
    warn("pg_isready still failing; database commands may fail until Postgres is running.");
  }
}

// =========================================================
//                  DATABASE BOOTSTRAP
// =========================================================
async function ensureDatabaseFromEnv(backendEnvPath) {
  step("Database (create role/db)");

  if (!canRun("psql", ["--version"])) {
    warn("psql not found; skipping automatic role/db creation.");
    return;
  }

  const raw = fs.readFileSync(backendEnvPath, "utf8");
  const lines = raw.replaceAll("\r\n", "\n").split("\n");
  const vars = parseDotenvLike(lines);

  const dbUser = vars.DB_USERNAME || "stacktrack";
  const dbPass = vars.DB_PASSWORD || "stacktrack";
  const dbName = vars.DB_NAME || "stacktrack";
  const dbHost = vars.DB_HOST || "localhost";
  const dbPort = vars.DB_PORT || "5432";
  const adminUser = vars.DB_ADMIN_USER || process.env.DB_ADMIN_USER || "postgres";
  let adminPass = vars.DB_ADMIN_PASSWORD || process.env.DB_ADMIN_PASSWORD || "";

  info(`DB user: ${dbUser}`);
  info(`DB name: ${dbName}`);

  const canSu = runCapture("bash", ["-lc", "id -u postgres >/dev/null 2>&1 && echo yes || echo no"]).stdout.trim();
  const canPrompt = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const canPsqlAsAdminWith = (password) =>
    canSu === "yes" ||
    psqlCapture("SELECT 1", {
      user: adminUser,
      password: password || undefined,
      host: dbHost,
      port: dbPort,
      database: "postgres",
    }).status === 0;

  if (canSu !== "yes" && !adminPass && canPrompt) {
    info(`Postgres admin user detected as "${adminUser}"`);
    adminPass = await promptSecret("Enter Postgres admin password (won't be saved)");
  }

  const canPsqlAsAdmin = canPsqlAsAdminWith(adminPass);

  const psqlAsAdmin = (sql) => {
    if (canSu === "yes") {
      return runCapture("bash", ["-lc", `su - postgres -c "psql -v ON_ERROR_STOP=1 -tAc \\"${sql.replaceAll('"', '\\"')}\\""`]);
    }
    return psqlCapture(sql, {
      user: adminUser,
      password: adminPass || undefined,
      host: dbHost,
      port: dbPort,
      database: "postgres",
    });
  };

  if (!canPsqlAsAdmin) {
    warn("Could not connect as a DB admin user; skipping automatic role/db creation.");
    warn("Set DB_ADMIN_PASSWORD in apps/backend/.env, or provide it via env when running bootstrap.");
    warn("Example: DB_ADMIN_PASSWORD=... pnpm run bootstrap -- --skip-install --skip-env");
    return;
  }

  const roleExists = psqlAsAdmin(`SELECT 1 FROM pg_roles WHERE rolname='${escapeSqlLiteral(dbUser)}'`).stdout === "1";
  if (!roleExists) {
    info("Creating DB role");
    psqlAsAdmin(
      `CREATE ROLE ${escapeSqlIdentifier(dbUser)} WITH LOGIN PASSWORD '${escapeSqlLiteral(dbPass)}'`
    );
  } else {
    info("DB role already exists");
    info("Syncing DB role password from apps/backend/.env");
    psqlAsAdmin(
      `ALTER ROLE ${escapeSqlIdentifier(dbUser)} WITH LOGIN PASSWORD '${escapeSqlLiteral(dbPass)}'`
    );
  }

  const dbExists = psqlAsAdmin(`SELECT 1 FROM pg_database WHERE datname='${escapeSqlLiteral(dbName)}'`).stdout === "1";
  if (!dbExists) {
    info("Creating database");
    psqlAsAdmin(`CREATE DATABASE ${escapeSqlIdentifier(dbName)} OWNER ${escapeSqlIdentifier(dbUser)}`);
  } else {
    info("Database already exists");
  }

  const canConnectAsAppUser =
    psqlCapture("SELECT 1", {
      user: dbUser,
      password: dbPass,
      host: dbHost,
      port: dbPort,
      database: dbName,
    }).status === 0;
  if (!canConnectAsAppUser) {
    warn("Created/updated role/database, but connection as DB_USERNAME/DB_PASSWORD still fails.");
    warn("Double-check DB_HOST/DB_PORT and that Postgres is configured to allow password auth for that user.");
  }
}

// =========================================================
//                          PRISMA
// =========================================================
function prismaMigrateAndSeed() {
  step("Prisma migrate + seed");
  run("pnpm", ["--filter", "backend", "prisma:generate"]);
  run("pnpm", ["--filter", "backend", "prisma:migrate:deploy"]);
  run("pnpm", ["--filter", "backend", "prisma:seed"]);
}

// =========================================================
//                       ENTRYPOINT
// =========================================================
function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  return {
    skipPnpm: flags.has("--skip-pnpm"),
    skipInstall: flags.has("--skip-install"),
    skipEnv: flags.has("--skip-env"),
    skipPostgres: flags.has("--skip-postgres"),
    skipDbCreate: flags.has("--skip-db-create"),
    skipDb: flags.has("--skip-db"),
    verbose: flags.has("--verbose"),
  };
}

async function main() {
  const repoRoot = process.cwd();
  const args = parseArgs(process.argv);
  VERBOSE = Boolean(args.verbose || process.env.STACKTRACK_VERBOSE === "1");

  banner();
  hr();
  step("One-command install");
  hr();

  if (!args.skipPnpm) ensurePnpmAvailable({ repoRoot });
  if (!args.skipInstall) installDependencies();

  let backendEnvPath = path.join(repoRoot, "apps", "backend", ".env");
  if (!args.skipEnv) {
    backendEnvPath = setupEnvFiles({ repoRoot }).backendEnvPath;
  }

  if (!args.skipPostgres) {
    ensurePostgresInstalled();
    ensurePostgresRunning();
  }

  if (!args.skipDbCreate && !args.skipDb) {
    await ensureDatabaseFromEnv(backendEnvPath);
  }

  if (!args.skipDb) {
    prismaMigrateAndSeed();
  }

  hr();
  step("Done");
  info("Next: run `pnpm dev`");
  info("Admin user is `admin@stacktrack.io` (password prints during seed on first run)");
}

main().catch((e) => {
  hr();
  step("Install failed");
  console.error(e);
  process.exit(1);
});
