#!/usr/bin/env bash
# Publish the latest Home.md export to GitHub Pages.
# Usage: export Home.md from Obsidian into this folder, then run ./publish.sh
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f index.html ]; then
  echo "❌ No index.html here. Export Home.md from Obsidian into this folder first."
  exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "Nothing changed since last publish — nothing to do."
  exit 0
fi

git commit -m "Update Home.md snapshot — $(date '+%Y-%m-%d %H:%M')"
git push
echo "✅ Pushed. Live in ~1 min at https://palprthi.github.io/cockpit-home/"
