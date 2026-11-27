#!/usr/bin/env bash
# Packages the ad-hoc-signed macOS app for local download.
#
# Uses ditto (not zip) so symlinks, extended attributes and the OmniTaps.app
# wrapper survive the round trip, then writes a SHA-256 for the archive.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HERE/build/macOS/OmniTaps.app"
DIST="$HERE/dist"
NAME="OmniTaps-macOS.zip"
ZIP="$DIST/$NAME"

if [ ! -d "$APP" ]; then
  echo "error: $APP not found. Run ./build-macos.sh first." >&2
  exit 1
fi

echo "verifying signature before packaging"
codesign --verify --strict --verbose=2 "$APP"

rm -rf "$DIST"
mkdir -p "$DIST"

# --keepParent keeps the OmniTaps.app wrapper; --sequesterRsrc preserves
# resource forks; ditto carries symlinks and xattrs that `zip` can mangle.
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"

echo "verifying the archive round-trips to a valid bundle"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
ditto -x -k "$ZIP" "$TMP"
codesign --verify --strict --verbose=2 "$TMP/OmniTaps.app"
ARCHS="$(xcrun lipo -archs "$TMP/OmniTaps.app/Contents/MacOS/OmnitapsMac")"
echo "architectures in archive: $ARCHS"

(cd "$DIST" && shasum -a 256 "$NAME" > SHA256SUMS)

echo
echo "packaged: $ZIP ($(du -h "$ZIP" | cut -f1))"
cat "$DIST/SHA256SUMS"
echo
echo "A downloaded copy is quarantined, so Gatekeeper refuses the first open."
echo "That is expected for an ad-hoc signature without notarization. The tester"
echo "unblocks it once with either:"
echo
echo "  Control-click OmniTaps.app -> Open -> Open"
echo "  xattr -dr com.apple.quarantine /path/to/OmniTaps.app"
echo
echo "Expected assessment of this build (rejected is normal, not a failure):"
spctl --assess --type execute --verbose=4 "$APP" 2>&1 || true
