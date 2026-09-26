#!/usr/bin/env bash
# Resolve conflicts for hemanthtc/ProInterview#10
#   base: hemanthtc:main
#   head: Indrajithinna:indrajithkr/product-upgrade-wave-36f5
#
# Strategy: merge upstream main into the PR head; for all conflicted paths,
# keep Indrajithinna (ours) versions so the product-upgrade wave wins.
#
# Usage (from a machine that can read hemanthtc/ProInterview):
#   export GH_TOKEN=ghp_...   # PAT with repo scope on hemanthtc + Indrajithinna
#   ./scripts/resolve-hemanthtc-pr10.sh
#
# Or with an explicit upstream URL:
#   UPSTREAM_URL="https://x-access-token:${GH_TOKEN}@github.com/hemanthtc/ProInterview.git" \
#     ./scripts/resolve-hemanthtc-pr10.sh
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

HEAD_BRANCH="${HEAD_BRANCH:-indrajithkr/product-upgrade-wave-36f5}"
UPSTREAM_REF="${UPSTREAM_REF:-main}"

if [[ -n "${UPSTREAM_URL:-}" ]]; then
  :
elif [[ -n "${GH_TOKEN:-}" ]]; then
  UPSTREAM_URL="https://x-access-token:${GH_TOKEN}@github.com/hemanthtc/ProInterview.git"
else
  UPSTREAM_URL="https://github.com/hemanthtc/ProInterview.git"
fi

# Files reported conflicting on hemanthtc PR #10 (+ any extras we keep-ours).
PREFERRED_OURS=(
  src/app/api/evaluate-system-design/route.ts
  src/app/api/jobs/route.ts
  src/app/ats-match/page.tsx
  src/app/coaches/page.tsx
  src/app/coding-lab/page.tsx
  src/app/domains/page.tsx
  src/app/jobs/page.tsx
  src/app/labs/page.tsx
  src/app/panel-interview/page.tsx
  src/app/referrals/page.tsx
  src/app/star-coach/page.tsx
  src/app/system-design/page.tsx
  src/components/system-design/InteractiveWhiteboard.tsx
  src/utils/jobSearch.ts
)

echo "==> Fetching upstream ${UPSTREAM_URL} ${UPSTREAM_REF}"
if ! git fetch "$UPSTREAM_URL" "+refs/heads/${UPSTREAM_REF}:refs/remotes/upstream-tmp/${UPSTREAM_REF}"; then
  cat >&2 <<'EOF'
ERROR: Cannot fetch hemanthtc/ProInterview.

This Cloud Agent only has access to Indrajithinna/ProInterview.
Provide a PAT that can read hemanthtc/ProInterview:

  export GH_TOKEN=ghp_xxxxxxxx
  ./scripts/resolve-hemanthtc-pr10.sh

Or grant the Cursor GitHub App access to hemanthtc/ProInterview and re-run.
EOF
  exit 1
fi

echo "==> Checking out ${HEAD_BRANCH}"
git fetch origin "$HEAD_BRANCH"
git checkout -B "$HEAD_BRANCH" "origin/${HEAD_BRANCH}"

echo "==> Merging upstream-tmp/${UPSTREAM_REF} into ${HEAD_BRANCH}"
set +e
git merge "refs/remotes/upstream-tmp/${UPSTREAM_REF}" --no-edit \
  -m "Merge hemanthtc:main into product-upgrade-wave; prefer Indrajithinna for lab conflicts"
MERGE_RC=$?
set -e

if [[ $MERGE_RC -ne 0 ]]; then
  echo "==> Resolving conflicts (keep Indrajithinna / ours)"
  for f in "${PREFERRED_OURS[@]}"; do
    if git ls-files -u -- "$f" | grep -q .; then
      git checkout --ours -- "$f"
      git add -- "$f"
      echo "    kept ours: $f"
    fi
  done

  mapfile -t EXTRA < <(git diff --name-only --diff-filter=U)
  for f in "${EXTRA[@]:-}"; do
    [[ -z "${f:-}" ]] && continue
    # For lockfiles prefer regenerating later; for code keep ours (feature branch).
    if [[ "$f" == "package-lock.json" ]]; then
      git checkout --ours -- "$f"
      git add -- "$f"
      echo "    kept ours (lock): $f"
      continue
    fi
    git checkout --ours -- "$f"
    git add -- "$f"
    echo "    kept ours (extra): $f"
  done

  if git diff --name-only --diff-filter=U | grep -q .; then
    echo "ERROR: unresolved conflicts remain:" >&2
    git diff --name-only --diff-filter=U >&2
    exit 1
  fi

  if git diff --cached --name-only | grep -qx 'package.json'; then
    echo "==> Regenerating package-lock.json"
    npm install --package-lock-only
    git add package-lock.json
  fi

  git commit --no-edit || git commit -m "Resolve merge conflicts with hemanthtc:main (keep product-upgrade wave)"
else
  echo "==> Merge completed cleanly (no conflicts)"
fi

if command -v rg >/dev/null; then
  if rg -n '^(<<<<<<<|=======|>>>>>>>)' --glob '!node_modules' --glob '!.git' .; then
    echo "ERROR: conflict markers still present" >&2
    exit 1
  fi
fi

echo "==> Running tests"
npm test

echo "==> Pushing ${HEAD_BRANCH}"
git push -u origin "$HEAD_BRANCH"

echo "Done. Refresh https://github.com/hemanthtc/ProInterview/pull/10 — conflicts should be clear."
echo "Mark the draft PR ready when checks look good."
