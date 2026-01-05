#!/usr/bin/env bash
set -euo pipefail

# =========================================================
# StackTrack upgrade helper
#
# - Updates the repo from GitHub (git pull --ff-only by default)
# - Re-runs the bootstrap for dependency + migration updates
#
# Usage:
#   bash scripts/upgrade.sh
#   bash scripts/upgrade.sh --yes
#   bash scripts/upgrade.sh --verbose
#
# Flags:
#   --yes          Non-interactive (assume yes)
#   --verbose      Show command output (debug)
#   --remote NAME  Git remote to pull from (default: origin)
#   --branch NAME  Branch to pull (default: current)
#   --stash        Auto-stash local changes before pulling
# =========================================================

YES=0
VERBOSE=0
REMOTE="origin"
BRANCH=""
AUTO_STASH=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes) YES=1; shift ;;
    --verbose) VERBOSE=1; shift ;;
    --remote) REMOTE="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --stash) AUTO_STASH=1; shift ;;
    *) printf '\nERROR: Unknown flag: %s\n' "$1" >&2; exit 1 ;;
  esac
done

log() { printf '==> %s\n' "$1"; }
info() { printf '    - %s\n' "$1"; }
warn() { printf '    ! %s\n' "$1"; }
die() { printf '\nERROR: %s\n' "$1" >&2; exit 1; }

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

run() {
  if [[ "$VERBOSE" -eq 1 ]]; then
    "$@"
  else
    "$@" >/dev/null
  fi
}

ensure_git_repo() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Not a git repo. Run from the StackTrack repo root."
}

current_branch() {
  git rev-parse --abbrev-ref HEAD 2>/dev/null || echo ""
}

upgrade_repo() {
  log "Repo update"

  local branch="${BRANCH}"
  if [[ -z "$branch" ]]; then
    branch="$(current_branch)"
  fi
  [[ -n "$branch" && "$branch" != "HEAD" ]] || die "Could not determine current branch (detached HEAD?)"

  if [[ -n "$(git status --porcelain)" ]]; then
    warn "Working tree has local changes"
    if [[ "$AUTO_STASH" -eq 1 ]]; then
      info "Stashing changes"
      run git stash push -u -m "stacktrack-upgrade $(date -Iseconds)" || true
    else
      if confirm "Stash local changes before pulling?" ; then
        run git stash push -u -m "stacktrack-upgrade $(date -Iseconds)" || true
      else
        die "Aborting upgrade (clean your working tree or use --stash)."
      fi
    fi
  fi

  info "Fetching ${REMOTE}"
  run git fetch "${REMOTE}"
  info "Pulling ${REMOTE}/${branch} (ff-only)"
  git pull --ff-only "${REMOTE}" "${branch}"
}

bootstrap_after_upgrade() {
  log "Bootstrap"

  if command -v pnpm >/dev/null 2>&1; then
    info "Running: pnpm run bootstrap"
    if [[ "$VERBOSE" -eq 1 ]]; then
      pnpm run bootstrap
    else
      pnpm run bootstrap --silent
    fi
    return
  fi

  warn "pnpm not found; running installer"
  if [[ "$VERBOSE" -eq 1 ]]; then
    sudo bash scripts/install.sh --verbose
  else
    sudo bash scripts/install.sh
  fi
}

main() {
  ensure_git_repo
  upgrade_repo
  bootstrap_after_upgrade
  log "Done"
}

main

