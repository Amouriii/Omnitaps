#!/usr/bin/env bash
# Builds a locally-signed OmniTaps.app (macOS) that embeds the built web app.
# "Local download only": the bundle is ad-hoc signed and not notarized, so it
# runs on this Mac (and, after right-click > Open, on another Mac).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
BUILD="$HERE/build/macOS"
APP="$BUILD/OmniTaps.app"

"$HERE/stage-web.sh"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$HERE/macOS/Info.plist" "$APP/Contents/Info.plist"
printf 'APPL????' > "$APP/Contents/PkgInfo"
cp -R "$HERE/build/www" "$APP/Contents/Resources/www"
if [ -f "$HERE/macOS/AppIcon.icns" ]; then
  cp "$HERE/macOS/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"
fi

echo "compiling (universal)"
SLICES=()
for ARCH in x86_64 arm64; do
  OUT_ARCH="$BUILD/OmnitapsMac-$ARCH"
  xcrun swiftc -O -target "$ARCH-apple-macos12.0" -o "$OUT_ARCH" \
    "$HERE/macOS/main.swift" "$HERE/shared/WebBundle.swift" \
    -framework Cocoa -framework WebKit
  SLICES+=("$OUT_ARCH")
done
xcrun lipo -create "${SLICES[@]}" -output "$APP/Contents/MacOS/OmnitapsMac"
rm -f "${SLICES[@]}"

plutil -lint "$APP/Contents/Info.plist" >/dev/null
plutil -lint "$HERE/macOS/Entitlements.plist" >/dev/null

echo "signing (ad-hoc)"
codesign --force --sign - --timestamp=none \
  --entitlements "$HERE/macOS/Entitlements.plist" "$APP"
codesign --verify --strict --verbose=2 "$APP"

echo
echo "built: $APP"
echo "run:   open \"$APP\""
