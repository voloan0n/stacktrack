#!/usr/bin/env bash
set -euo pipefail

# =========================================================
# StackTrack uninstall / reset (native)
#
# Removes generated env files and build artifacts, and optionally drops the
# local Postgres database + role defined in apps/backend/.env.
#
# Usage:
#   pnpm run uninstall -- --dry-run
#   pnpm run uninstall -- --yes
#   bash scripts/uninstall.sh --dry-run
#
# Flags:
#   --yes       Non-interactive (assume yes)
#   --dry-run   Print actions without changing anything
#   --skip-db   Do not drop database/role
#   --verbose   Show command output (debug)
# =========================================================

YES=0
DRY_RUN=0
SKIP_DB=0
VERBOSE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes) YES=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --skip-db) SKIP_DB=1; shift ;;
    --verbose) VERBOSE=1; shift ;;
    *) printf '\nERROR: Unknown flag: %s\n' "$1" >&2; exit 1 ;;
  esac
done

log() { printf '==> %s\n' "$1"; }
info() { printf '    - %s\n' "$1"; }
warn() { printf '    ! %s\n' "$1"; }

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

rm_path() {
  local p="$1"
  if [[ -e "$p" ]]; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      info "Would remove: $p"
    else
      rm -rf "$p"
      info "Removed: $p"
    fi
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

psql_as_postgres() {
  local sql="$1"
  su - postgres -c "psql -v ON_ERROR_STOP=1 -tAc \"$sql\""
}

drop_db_and_role() {
  log "Database cleanup"
  if [[ "$SKIP_DB" -eq 1 ]]; then
    warn "Skipping DB cleanup (--skip-db)"
    return
  fi

  local env_file="apps/backend/.env"
  if [[ ! -f "$env_file" ]]; then
    warn "No apps/backend/.env found; skipping DB cleanup"
    return
  fi

  local db_name db_user db_host
  db_name="$(env_get "$env_file" "DB_NAME" || true)"
  db_user="$(env_get "$env_file" "DB_USERNAME" || true)"
  db_host="$(env_get "$env_file" "DB_HOST" || true)"
  db_name="${db_name:-stacktrack}"
  db_user="${db_user:-stacktrack}"
  db_host="${db_host:-localhost}"

  if [[ "$db_host" != "localhost" && "$db_host" != "127.0.0.1" ]]; then
    warn "DB_HOST is remote (${db_host}); refusing to drop database/role automatically"
    return
  fi

  if ! id -u postgres >/dev/null 2>&1; then
    warn "postgres OS user not found; skipping DB cleanup"
    return
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "Would drop database: $db_name"
    info "Would drop role: $db_user"
    return
  fi

  if ! confirm "Drop database \"${db_name}\" and role \"${db_user}\"?" ; then
    warn "Keeping database/role"
    return
  fi

  info "Dropping connections + database"
  psql_as_postgres "REVOKE CONNECT ON DATABASE \"${db_name//\"/\"\"}\" FROM PUBLIC;" >/dev/null || true
  psql_as_postgres "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${db_name//\'/\'\'}' AND pid <> pg_backend_pid();" >/dev/null || true
  psql_as_postgres "DROP DATABASE IF EXISTS \"${db_name//\"/\"\"}\";" >/dev/null

  info "Dropping role"
  psql_as_postgres "DROP ROLE IF EXISTS \"${db_user//\"/\"\"}\";" >/dev/null
}

main() {
  log "Uninstall / reset"

  rm_path "apps/backend/.env"
  rm_path "apps/frontend/.env.local"

  rm_path "node_modules"
  rm_path "apps/backend/node_modules"
  rm_path "apps/frontend/node_modules"

  rm_path "apps/backend/dist"
  rm_path "apps/frontend/.next"

  drop_db_and_role

  log "Done"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "No changes made (dry-run)."
  fi
}

main

