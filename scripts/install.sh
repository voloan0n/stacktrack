#!/usr/bin/env bash
set -euo pipefail

# =========================================================
# StackTrack one-click native installer (Debian/Ubuntu)
#
# Default behavior (fresh machine):
# - apt update (+ optional upgrade)
# - install prerequisites (curl/git/ca-certs)
# - install/upgrade Node.js (offers NodeSource Node 20)
# - enable corepack, install/activate pnpm
# - pnpm install (workspace)
# - create env files + generate secrets
# - install/start Postgres, create role/db (local)
# - run Prisma generate, migrate, seed
#
# Usage:
#   sudo bash scripts/install.sh
#   sudo bash scripts/install.sh --yes
#   sudo bash scripts/install.sh --verbose
#
# Existing dev machine (skip system steps):
#   pnpm run bootstrap
#   # or
#   bash scripts/install.sh --skip-system --skip-node
#
# Flags:
#   --yes            Non-interactive (assume yes)
#   --verbose        Show command output (debug)
#   --skip-upgrade   Skip apt upgrade
#   --skip-system    Skip all apt operations
#   --skip-node      Skip Node.js install/upgrade
#   --skip-install   Skip pnpm install
#   --skip-env       Skip env/secrets generation
#   --skip-postgres  Skip Postgres install/start + role/db
#   --skip-prisma    Skip Prisma generate/migrate/seed
# =========================================================

# -------------------------
# Flags
# -------------------------
YES=0
VERBOSE=0
SKIP_UPGRADE=0
SKIP_SYSTEM=0
SKIP_NODE=0
SKIP_INSTALL=0
SKIP_ENV=0
SKIP_POSTGRES=0
SKIP_PRISMA=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes) YES=1; shift ;;
    --verbose) VERBOSE=1; shift ;;
    --skip-upgrade) SKIP_UPGRADE=1; shift ;;
    --skip-system) SKIP_SYSTEM=1; shift ;;
    --skip-node) SKIP_NODE=1; shift ;;
    --skip-install) SKIP_INSTALL=1; shift ;;
    --skip-env) SKIP_ENV=1; shift ;;
    --skip-postgres|--skip-db) SKIP_POSTGRES=1; shift ;;
    --skip-prisma) SKIP_PRISMA=1; shift ;;
    *) die "Unknown flag: $1" ;;
  esac
done

log() { printf '==> %s\n' "$1"; }
info() { printf '    - %s\n' "$1"; }
warn() { printf '    ! %s\n' "$1"; }
die() { printf '\nERROR: %s\n' "$1" >&2; exit 1; }

APT_QUIET_FLAGS=()
if [[ "$VERBOSE" -eq 0 ]]; then
  APT_QUIET_FLAGS=(-qq)
fi

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    die "Run as root (or via sudo): sudo bash scripts/install.sh"
  fi
}

confirm() {
  local question="$1"
  if [[ "$YES" -eq 1 ]]; then
    return 0
  fi
  read -r -p "${question} [y/N] " reply
  case "${reply,,}" in
    y|yes) return 0 ;;
    *) return 1 ;;
  esac
}

prompt_secret() {
  local question="$1"
  local out_var="$2"
  local value=""
  read -r -s -p "${question}: " value
  printf '\n'
  # shellcheck disable=SC2034
  printf -v "$out_var" '%s' "$value"
}

run() {
  if [[ "$VERBOSE" -eq 1 ]]; then
    "$@"
  else
    "$@" >/dev/null
  fi
}

run_capture() {
  "$@" 2>/dev/null || true
}

apt_update_upgrade() {
  log "System packages (apt)"
  info "Updating package lists"
  apt-get update "${APT_QUIET_FLAGS[@]}"

  if [[ "$SKIP_UPGRADE" -eq 1 ]]; then
    warn "Skipping apt upgrade (--skip-upgrade)"
    return
  fi

  if confirm "Run apt upgrade (recommended on fresh containers)?" ; then
    info "Upgrading packages"
    DEBIAN_FRONTEND=noninteractive apt-get -y upgrade "${APT_QUIET_FLAGS[@]}"
  else
    warn "Skipping apt upgrade"
  fi
}

install_prereqs() {
  log "Prerequisites"
  info "Installing basic tools"
  DEBIAN_FRONTEND=noninteractive apt-get -y install "${APT_QUIET_FLAGS[@]}" \
    ca-certificates curl git
}

node_major() {
  node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo "0"
}

ensure_node() {
  log "Node.js"
  if [[ "$SKIP_NODE" -eq 1 ]]; then
    warn "Skipping Node.js setup (--skip-node)"
    return
  fi

  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node_major)"
    info "Found Node.js $(node -v)"
    if [[ "$major" -ge 20 ]]; then
      return
    fi
    warn "Node.js < 20 detected; upgrading to Node 20 is recommended"
  else
    warn "Node.js not found; installing"
  fi

  # Prefer NodeSource Node 20 when possible (matches our dev/setup), fallback to distro packages.
  if confirm "Install/upgrade to Node.js 20 from NodeSource?" ; then
    info "Adding NodeSource repo for Node 20"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    DEBIAN_FRONTEND=noninteractive apt-get -y install "${APT_QUIET_FLAGS[@]}" nodejs
  else
    warn "Using distro Node.js packages"
    DEBIAN_FRONTEND=noninteractive apt-get -y install "${APT_QUIET_FLAGS[@]}" nodejs npm
  fi

  command -v node >/dev/null 2>&1 || die "Node.js install failed"
  info "Using Node.js $(node -v)"
}

ensure_corepack_pnpm() {
  log "pnpm"
  if ! command -v node >/dev/null 2>&1; then
    die "Node.js is required to install pnpm; install Node.js first (or omit --skip-node)."
  fi

  if ! command -v corepack >/dev/null 2>&1; then
    warn "corepack not found; pnpm can still be installed by the Node installer step"
  else
    info "Enabling corepack"
    run corepack enable || true
  fi

  local spec
  spec="$(node -p "require('./package.json').packageManager || 'pnpm@latest'")"
  info "Activating ${spec}"

  if command -v corepack >/dev/null 2>&1; then
    run corepack prepare "${spec}" --activate || run corepack prepare "pnpm@latest" --activate
  fi

  if ! command -v pnpm >/dev/null 2>&1; then
    warn "pnpm not available after corepack; installing via npm -g"
    run npm install -g "${spec}" || run npm install -g pnpm@latest
  fi

  command -v pnpm >/dev/null 2>&1 || die "pnpm install failed"
  info "pnpm v$(pnpm -v)"
}

pnpm_install_workspace() {
  log "Dependencies"
  if [[ "$SKIP_INSTALL" -eq 1 ]]; then
    warn "Skipping pnpm install (--skip-install)"
    return
  fi
  info "Running: pnpm install"
  if [[ "$VERBOSE" -eq 1 ]]; then
    pnpm install
  else
    pnpm install --silent
  fi
}

env_set() {
  local file="$1"
  local key="$2"
  local value="$3"

  if [[ ! -f "$file" ]]; then
    printf '%s="%s"\n' "$key" "$value" >>"$file"
    return
  fi

  if rg -n "^[[:space:]]*${key}=" "$file" >/dev/null 2>&1; then
    perl -0777 -i -pe "s|^[[:space:]]*\\Q${key}\\E=.*$|${key}=\"${value}\"|mg" "$file"
  else
    printf '\n%s="%s"\n' "$key" "$value" >>"$file"
  fi
}

env_get() {
  local file="$1"
  local key="$2"
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  # shellcheck disable=SC2016
  perl -ne 'next if /^\s*(#|\/\/)/; if (/^\s*'"$key"'\s*=\s*(.*)\s*$/) { $v=$1; $v=~s/^\s+|\s+$//g; $v=~s/^["'\''](.*)["'\'']$/$1/; print $v; exit 0 }' "$file"
}

random_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
    return
  fi
  node -e "console.log(require('crypto').randomBytes($1).toString('hex'))"
}

ensure_env_files() {
  log "Environment"
  if [[ "$SKIP_ENV" -eq 1 ]]; then
    warn "Skipping env setup (--skip-env)"
    return
  fi

  local backend_example="apps/backend/.env.example"
  local backend_env="apps/backend/.env"
  local frontend_example="apps/frontend/.env.example"
  local frontend_env="apps/frontend/.env.local"

  info "Ensuring env files exist"
  if [[ ! -f "$backend_env" ]]; then
    cp "$backend_example" "$backend_env"
    info "Created apps/backend/.env"
  fi
  if [[ ! -f "$frontend_env" ]]; then
    cp "$frontend_example" "$frontend_env"
    info "Created apps/frontend/.env.local"
  fi

  info "Generating secrets / materializing DATABASE_URL (if needed)"
  local jwt cookie app_secret
  jwt="$(env_get "$backend_env" "JWT_SECRET" || true)"
  cookie="$(env_get "$backend_env" "COOKIE_SECRET" || true)"
  app_secret="$(env_get "$backend_env" "APP_SECRET" || true)"

  if [[ -z "$jwt" || "$jwt" == "replace-with-64-hex" || "$jwt" == "changeme" ]]; then
    env_set "$backend_env" "JWT_SECRET" "$(random_hex 32)"
  fi
  if [[ -z "$cookie" || "$cookie" == "replace-with-64-hex" || "$cookie" == "changeme" ]]; then
    env_set "$backend_env" "COOKIE_SECRET" "$(random_hex 32)"
  fi
  if [[ -z "$app_secret" || "$app_secret" == "replace-with-64-hex" || "$app_secret" == "changeme" ]]; then
    env_set "$backend_env" "APP_SECRET" "$(random_hex 32)"
  fi

  local db_user db_pass db_host db_port db_name
  db_user="$(env_get "$backend_env" "DB_USERNAME" || true)"
  db_pass="$(env_get "$backend_env" "DB_PASSWORD" || true)"
  db_host="$(env_get "$backend_env" "DB_HOST" || true)"
  db_port="$(env_get "$backend_env" "DB_PORT" || true)"
  db_name="$(env_get "$backend_env" "DB_NAME" || true)"
  db_user="${db_user:-stacktrack}"
  db_pass="${db_pass:-stacktrack}"
  db_host="${db_host:-localhost}"
  db_port="${db_port:-5432}"
  db_name="${db_name:-stacktrack}"

  local db_url="postgresql://${db_user}:${db_pass}@${db_host}:${db_port}/${db_name}?schema=public"
  local existing_url
  existing_url="$(env_get "$backend_env" "DATABASE_URL" || true)"
  if [[ -z "$existing_url" || "$existing_url" == postgresql*'${'* ]]; then
    env_set "$backend_env" "DATABASE_URL" "$db_url"
  fi
}

ensure_postgres() {
  log "Postgres"
  if [[ "$SKIP_POSTGRES" -eq 1 ]]; then
    warn "Skipping Postgres setup (--skip-postgres)"
    return
  fi

  if ! command -v psql >/dev/null 2>&1; then
    info "Installing PostgreSQL via apt-get"
    DEBIAN_FRONTEND=noninteractive apt-get -y install "${APT_QUIET_FLAGS[@]}" postgresql postgresql-contrib
  else
    info "Postgres client found"
  fi

  if command -v systemctl >/dev/null 2>&1; then
    info "Starting postgresql service"
    run systemctl start postgresql || true
  else
    warn "systemctl not available; ensure Postgres is running"
  fi

  if command -v pg_isready >/dev/null 2>&1; then
    if pg_isready >/dev/null 2>&1; then
      info "Postgres is accepting connections"
    else
      warn "pg_isready failed; DB commands may fail until Postgres is running"
    fi
  fi
}

psql_as_postgres() {
  local sql="$1"
  # `-X` ignores ~/.psqlrc so output is stable (no footers/format tweaks).
  su - postgres -c "psql -X -q -A -t -v ON_ERROR_STOP=1 -c \"$sql\""
}

can_connect_db() {
  local db_host="$1"
  local db_port="$2"
  local db_user="$3"
  local db_pass="$4"
  local db_name="$5"

  PGPASSWORD="$db_pass" psql -X -q -P footer=off -w \
    -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" \
    -v ON_ERROR_STOP=1 -tAc "SELECT 1" >/dev/null 2>&1
}

ensure_db_role_and_database() {
  log "Database (role/db)"
  if [[ "$SKIP_POSTGRES" -eq 1 ]]; then
    warn "Skipping DB role/database (--skip-postgres)"
    return
  fi

  local backend_env="apps/backend/.env"
  local db_user db_pass db_name db_host db_port
  db_user="$(env_get "$backend_env" "DB_USERNAME" || true)"
  db_pass="$(env_get "$backend_env" "DB_PASSWORD" || true)"
  db_name="$(env_get "$backend_env" "DB_NAME" || true)"
  db_host="$(env_get "$backend_env" "DB_HOST" || true)"
  db_port="$(env_get "$backend_env" "DB_PORT" || true)"
  db_user="${db_user:-stacktrack}"
  db_pass="${db_pass:-stacktrack}"
  db_name="${db_name:-stacktrack}"
  db_host="${db_host:-localhost}"
  db_port="${db_port:-5432}"

  if [[ "$db_host" != "localhost" && "$db_host" != "127.0.0.1" ]]; then
    warn "DB_HOST is remote (${db_host}); skipping automatic role/db creation"
    return
  fi

  if ! id -u postgres >/dev/null 2>&1; then
    warn "postgres OS user not found; skipping automatic role/db creation"
    warn "Create DB role/db manually, then re-run bootstrap"
    return
  fi

  info "DB user: ${db_user}"
  info "DB name: ${db_name}"

  local role_exists db_exists
  role_exists="$(psql_as_postgres "SELECT 1 FROM pg_roles WHERE rolname='${db_user//\'/\'\'}'" | tr -d '[:space:]')"
  db_exists="$(psql_as_postgres "SELECT 1 FROM pg_database WHERE datname='${db_name//\'/\'\'}'" | tr -d '[:space:]')"

  if [[ "$role_exists" != "1" ]]; then
    info "Creating DB role"
    if ! psql_as_postgres "CREATE ROLE \"${db_user//\"/\"\"}\" WITH LOGIN PASSWORD '${db_pass//\'/\'\'}';" >/dev/null; then
      role_exists="$(psql_as_postgres "SELECT 1 FROM pg_roles WHERE rolname='${db_user//\'/\'\'}'" | tr -d '[:space:]')"
      [[ "$role_exists" == "1" ]] || die "Failed to create DB role."
    fi
  else
    info "DB role already exists"
  fi

  if [[ "$db_exists" != "1" ]]; then
    info "Creating database"
    if ! psql_as_postgres "CREATE DATABASE \"${db_name//\"/\"\"}\" OWNER \"${db_user//\"/\"\"}\";" >/dev/null; then
      db_exists="$(psql_as_postgres "SELECT 1 FROM pg_database WHERE datname='${db_name//\'/\'\'}'" | tr -d '[:space:]')"
      [[ "$db_exists" == "1" ]] || die "Failed to create database."
    fi
  else
    info "Database already exists"
  fi

  # If the role/db already existed, first try connecting using apps/backend/.env credentials.
  if can_connect_db "$db_host" "$db_port" "$db_user" "$db_pass" "$db_name"; then
    info "Connection as DB_USERNAME/DB_PASSWORD succeeded"
    return
  fi

  warn "Connection as DB_USERNAME/DB_PASSWORD failed"

  # In non-interactive mode, prefer resetting the role password to match apps/backend/.env.
  if [[ "$YES" -eq 1 ]]; then
    warn "Resetting DB role password to match apps/backend/.env (non-interactive)"
    psql_as_postgres "ALTER ROLE \"${db_user//\"/\"\"}\" WITH LOGIN PASSWORD '${db_pass//\'/\'\'}';" >/dev/null
    can_connect_db "$db_host" "$db_port" "$db_user" "$db_pass" "$db_name" || die "DB credentials still invalid after resetting role password."
    info "Connection succeeded after password reset"
    return
  fi

  # Interactive: offer to reset the password to match apps/backend/.env, or let user provide the current password.
  if confirm "Reset DB role password to match apps/backend/.env (recommended)?" ; then
    info "Resetting DB role password"
    psql_as_postgres "ALTER ROLE \"${db_user//\"/\"\"}\" WITH LOGIN PASSWORD '${db_pass//\'/\'\'}';" >/dev/null
    can_connect_db "$db_host" "$db_port" "$db_user" "$db_pass" "$db_name" || die "DB credentials still invalid after resetting role password."
    info "Connection succeeded after password reset"
    return
  fi

  local provided_pass=""
  prompt_secret "Enter existing password for DB user \"${db_user}\"" provided_pass
  if [[ -z "$provided_pass" ]]; then
    die "No password provided and password reset declined."
  fi

  # Update apps/backend/.env to the provided password so Prisma uses it.
  local backend_env="apps/backend/.env"
  env_set "$backend_env" "DB_PASSWORD" "$provided_pass"
  local db_url="postgresql://${db_user}:${provided_pass}@${db_host}:${db_port}/${db_name}?schema=public"
  env_set "$backend_env" "DATABASE_URL" "$db_url"

  can_connect_db "$db_host" "$db_port" "$db_user" "$provided_pass" "$db_name" || die "DB credentials invalid (unable to connect)."
  info "Connection succeeded with provided password"
}

run_prisma() {
  log "Prisma"
  if [[ "$SKIP_PRISMA" -eq 1 || "$SKIP_INSTALL" -eq 1 ]]; then
    warn "Skipping Prisma (--skip-prisma or --skip-install)"
    return
  fi

  info "Generating client"
  if [[ "$VERBOSE" -eq 1 ]]; then
    pnpm --filter backend prisma:generate
  else
    pnpm --silent --filter backend prisma:generate
  fi

  info "Applying migrations"
  if [[ "$VERBOSE" -eq 1 ]]; then
    pnpm --filter backend prisma:migrate:deploy
  else
    pnpm --silent --filter backend prisma:migrate:deploy
  fi

  info "Seeding database"
  if [[ "$VERBOSE" -eq 1 ]]; then
    pnpm --filter backend prisma:seed
  else
    pnpm --silent --filter backend prisma:seed
  fi
}

main() {
  if [[ "$SKIP_SYSTEM" -eq 0 ]]; then
    require_root
    apt_update_upgrade
    install_prereqs
  else
    warn "Skipping system package steps (--skip-system)"
  fi

  if [[ "$SKIP_SYSTEM" -eq 0 ]]; then
    ensure_node
  elif ! command -v node >/dev/null 2>&1; then
    die "Node.js is required. Re-run without --skip-system, or install Node.js manually."
  fi

  ensure_corepack_pnpm
  pnpm_install_workspace
  ensure_env_files

  if [[ "$SKIP_SYSTEM" -eq 0 ]]; then
    ensure_postgres
    ensure_db_role_and_database
  else
    warn "Skipping Postgres install/start (requires --skip-system off)"
  fi

  run_prisma

  log "Done"
  info "Next: pnpm dev (or pnpm start after build)"
}

main "$@"
