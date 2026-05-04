#!/usr/bin/env bash

set -euo pipefail

hook_note() {
  printf '[PeñaHub hooks] %s\n' "$1"
}

skip_hooks_if_requested() {
  if [[ "${PENAHUB_SKIP_HOOKS:-0}" == "1" ]]; then
    hook_note "Skipping hooks because PENAHUB_SKIP_HOOKS=1"
    exit 0
  fi
}

require_repo_root() {
  local root
  root="$(git rev-parse --show-toplevel)"
  cd "$root"
}

require_backend_env() {
  if [[ ! -x "backend/.venv/bin/python" ]]; then
    hook_note "Missing backend virtualenv. Run 'just bootstrap' before committing backend changes."
    exit 1
  fi
}

require_frontend_env() {
  if [[ ! -d "frontend/node_modules" ]]; then
    hook_note "Missing frontend dependencies. Run 'npm --prefix frontend install' before committing frontend changes."
    exit 1
  fi
}

has_backend_changes() {
  local files="${1:-}"
  while IFS= read -r path; do
    case "$path" in
      backend/*|pyproject.toml|justfile)
        return 0
        ;;
    esac
  done <<< "$files"
  return 1
}

has_frontend_changes() {
  local files="${1:-}"
  while IFS= read -r path; do
    case "$path" in
      frontend/*|package-lock.json|justfile)
        return 0
        ;;
    esac
  done <<< "$files"
  return 1
}

staged_files() {
  git diff --cached --name-only --diff-filter=ACMR
}

push_candidate_files() {
  local upstream

  if upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)"; then
    git diff --name-only "${upstream}...HEAD"
    return
  fi

  if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    git diff --name-only HEAD~1..HEAD
    return
  fi

  git diff-tree --no-commit-id --name-only -r HEAD
}

run_cmd() {
  printf '+ %s\n' "$*"
  "$@"
}
