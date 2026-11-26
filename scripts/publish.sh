#!/usr/bin/env bash
# Publish committed docs without force-pushing or changing the working branch.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Commit or stash local changes before publishing.' >&2
  exit 1
fi
if [[ "$(git branch --show-current)" != main ]]; then
  echo 'Publish from main.' >&2
  exit 1
fi
python3 tests/check_site.py
git push origin main
publication_commit=$(git subtree split --prefix docs)
git push origin "$publication_commit:refs/heads/gh-pages"
echo 'GitHub Pages will deploy the gh-pages branch.'
