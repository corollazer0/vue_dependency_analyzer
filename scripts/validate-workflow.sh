#!/usr/bin/env bash
# Phase 10-9 — act dry-run validator for GitHub Actions workflows.
#
# Runs `act --dryrun` on each workflow file so a typo in `on:`, `jobs:` or
# a missing step `uses:` fails fast during local development instead of
# surfacing in CI. `act` is optional (not installed by default on GitHub
# runners); when missing we print a skip notice and exit 0.
#
# Usage: scripts/validate-workflow.sh [workflow-name-without-yml ...]
#        scripts/validate-workflow.sh                   # all workflows
#        scripts/validate-workflow.sh vda-pr-report     # single workflow
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v act >/dev/null 2>&1; then
  echo "::notice::act is not installed — skipping workflow dry-run validation."
  echo "::notice::install from https://github.com/nektos/act to enable."
  exit 0
fi

# Resolve target workflows.
if [ $# -eq 0 ]; then
  shopt -s nullglob
  workflows=(.github/workflows/*.yml)
else
  workflows=()
  for name in "$@"; do
    workflows+=(".github/workflows/${name}.yml")
  done
fi

if [ ${#workflows[@]} -eq 0 ]; then
  echo "No workflow files found under .github/workflows/."
  exit 0
fi

status=0
for wf in "${workflows[@]}"; do
  [ -f "$wf" ] || { echo "::warning::Not found: $wf"; continue; }
  echo "Validating $wf with act --dryrun"
  # Each workflow's `on:` may be PR/push/workflow_dispatch — list jobs first
  # to pick one we can dryrun. act --dryrun validates the YAML + job graph;
  # we don't need to actually run containers.
  if act --list -W "$wf" >/dev/null 2>&1; then
    # Prefer pull_request event where supported; fall back to any available.
    event=$(act --list -W "$wf" 2>/dev/null | awk 'NR>1 {print $3; exit}')
    if [ -z "${event:-}" ]; then event=pull_request; fi
    if ! act "$event" --dryrun -W "$wf"; then
      echo "::error::act dryrun failed for $wf"
      status=1
    fi
  else
    echo "::warning::act could not list jobs for $wf — treat as failure"
    status=1
  fi
done
exit $status
