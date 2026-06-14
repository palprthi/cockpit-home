#!/usr/bin/env bash
# Publish the latest Home.md export to GitHub Pages.
#
# Workflow:
#   1. In Obsidian: "Webpage HTML Export: Export current file" with Home.md active,
#      export to the STAGING folder below (NOT this repo — the plugin deletes old files).
#   2. Run ./publish.sh — it moves the export in, renames home.html -> index.html,
#      fixes internal links, commits, and pushes.
set -euo pipefail
cd "$(dirname "$0")"
SITE="$(pwd)"
STAGE="${1:-$HOME/cockpit-export}"

if [ ! -f "$STAGE/home.html" ]; then
  echo "❌ No export found at: $STAGE/home.html"
  echo "   Export Home.md from Obsidian into that folder first."
  exit 1
fi

echo "→ Syncing export from $STAGE"
rm -f index.html
rm -rf site-lib
cp "$STAGE/home.html" index.html
cp -R "$STAGE/site-lib" site-lib

echo "→ Rewriting home.html -> index.html references"
python3 - "$SITE" <<'PY'
import pathlib, sys
site = pathlib.Path(sys.argv[1])
for rel in ["index.html","site-lib/rss.xml","site-lib/search-index.json",
            "site-lib/html/file-tree-content.html","site-lib/metadata.json"]:
    p = site/rel
    if p.exists():
        t = p.read_text(encoding="utf-8")
        n = t.replace("home.html","index.html")
        if n != t: p.write_text(n, encoding="utf-8")
PY

git add -A
if git diff --cached --quiet; then
  echo "Nothing changed since last publish — nothing to do."
  exit 0
fi
git commit -m "Update Home.md snapshot — $(date '+%Y-%m-%d %H:%M')"
git push
echo "✅ Pushed. Live in ~1 min at https://palprthi.github.io/cockpit-home/"
