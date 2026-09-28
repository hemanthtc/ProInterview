#!/usr/bin/env bash
# Resolve cross-fork conflicts: Indrajithinna consolidated -> hemanthtc:main
# Strategy: merge upstream main into the PR head; for the 7 known conflict files,
# keep Indrajithinna (ours) versions; keep any non-conflicting upstream changes.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

HEAD_BRANCH="${HEAD_BRANCH:-indrajithkr/consolidated-0ba8}"
UPSTREAM_URL="${UPSTREAM_URL:-https://github.com/hemanthtc/ProInterview.git}"
UPSTREAM_REF="${UPSTREAM_REF:-main}"

CONFLICT_FILES=(
  .gitignore
  package.json
  package-lock.json
  src/app/api/interviewer/route.ts
  src/app/features/page.tsx
  src/app/setup/page.tsx
  src/components/NegotiatePanel.tsx
)

echo "==> Fetching upstream ${UPSTREAM_URL} ${UPSTREAM_REF}"
git fetch "$UPSTREAM_URL" "+refs/heads/${UPSTREAM_REF}:refs/remotes/upstream-tmp/${UPSTREAM_REF}"

echo "==> Checking out ${HEAD_BRANCH}"
git checkout "$HEAD_BRANCH"
git pull --ff-only origin "$HEAD_BRANCH" || true

echo "==> Merging upstream/${UPSTREAM_REF} into ${HEAD_BRANCH}"
set +e
git merge "refs/remotes/upstream-tmp/${UPSTREAM_REF}" --no-edit
MERGE_RC=$?
set -e

if [[ $MERGE_RC -ne 0 ]]; then
  echo "==> Resolving known conflict files with OUR (consolidated) versions"
  for f in "${CONFLICT_FILES[@]}"; do
    if git ls-files -u -- "$f" | grep -q .; then
      git checkout --ours -- "$f"
      git add -- "$f"
      echo "    kept ours: $f"
    fi
  done

  # Any other conflicts: also prefer ours (consolidated feature set)
  mapfile -t EXTRA < <(git diff --name-only --diff-filter=U)
  for f in "${EXTRA[@]:-}"; do
    [[ -z "${f:-}" ]] && continue
    git checkout --ours -- "$f"
    git add -- "$f"
    echo "    kept ours (extra): $f"
  done

  if git diff --name-only --diff-filter=U | grep -q .; then
    echo "ERROR: unresolved conflicts remain:" >&2
    git diff --name-only --diff-filter=U >&2
    exit 1
  fi

  # Regenerate lockfile if package.json was involved
  if git diff --cached --name-only | grep -qx 'package.json'; then
    echo "==> Regenerating package-lock.json"
    npm install --package-lock-only
    git add package-lock.json
  fi

  git commit -m "$(cat <<'EOF'
Resolve merge conflicts with hemanthtc:main

Keep Indrajithinna consolidated versions for the seven conflicting paths
(.gitignore, package.json/lock, interviewer route, features/setup pages,
NegotiatePanel) so the cross-fork PR can merge.
EOF
)"
else
  echo "==> Merge completed cleanly (no conflicts)"
fi

if rg -n '^(<<<<<<<|=======|>>>>>>>)' --glob '!node_modules' --glob '!.git' .; then
  echo "ERROR: conflict markers still present" >&2
  exit 1
fi

echo "==> Running tests"
npm test

echo "==> Pushing ${HEAD_BRANCH}"
git push -u origin "$HEAD_BRANCH"

echo "Done. Cross-fork PR head updated; GitHub should report conflicts resolved."
