#!/usr/bin/env bash
# Copies the built web app (dist/) into a bundle-friendly www/ directory and
# rewrites Vite's absolute asset URLs (href="/assets/...") to relative ones.
# Both targets serve www through omnitaps://local/ (shared/WebBundle.swift);
# relative paths keep the bundle self-contained and also keep it working if it
# is ever opened directly from disk.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
OUT="$ROOT/ios-build/build/www"

if [ ! -f "$DIST/index.html" ]; then
  echo "error: dist/index.html not found. Run 'npm run build' first." >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$DIST/." "$OUT/"

# href="/x" | src="/x" | content="/x"  ->  ./x
sed -i '' -E 's#((href|src|content)=")/#\1./#g' "$OUT/index.html"

# Vite marks asset tags crossorigin, which forces a CORS check. The custom
# scheme handler returns no CORS headers, so a crossorigin module script fails
# to load and the page stays blank. Drop the attribute.
sed -i '' -E 's# crossorigin##g' "$OUT/index.html"

if grep -nE '(href|src|content)="/' "$OUT/index.html" >/dev/null; then
  echo "error: absolute URLs remain in index.html" >&2
  exit 1
fi

echo "staged web app -> $OUT"
