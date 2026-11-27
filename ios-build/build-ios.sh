#!/usr/bin/env bash
# Builds OmniTaps for iOS.
#
#   ./build-ios.sh simulator     build + install + launch in a booted simulator,
#                                wait for the SPA to settle, save a screenshot
#                                (no signing identity needed: CODE_SIGNING_ALLOWED=NO)
#   ./build-ios.sh device        installable .app signed with YOUR identity;
#                                requires DEVELOPMENT_TEAM and a provisioning profile
#   ./build-ios.sh unsigned      unsigned device .app + .ipa for later signing
#
# Environment:
#   SKIP_RUN=1        simulator: build only, do not boot/install/launch
#   SIM_UDID=...      simulator: target a specific device
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
CONFIG="${1:-simulator}"
BUILD="$HERE/build/ios"
BUNDLE_ID="com.onouh.omnitaps"

XCODEGEN="$(command -v xcodegen || true)"
if [ -z "$XCODEGEN" ] && [ -x "$HERE/tools/xcodegen/bin/xcodegen" ]; then
  XCODEGEN="$HERE/tools/xcodegen/bin/xcodegen"
fi
if [ -z "$XCODEGEN" ]; then
  echo "error: XcodeGen not found. Install one of:" >&2
  echo "  brew install xcodegen" >&2
  echo "  (or place a release in ios-build/tools/xcodegen/)" >&2
  exit 1
fi

"$HERE/stage-web.sh"

echo "generating Xcode project"
(cd "$HERE/ios" && "$XCODEGEN" generate >/dev/null)

case "$CONFIG" in
  simulator)
    echo "building for iOS Simulator (signing disabled)"
    mkdir -p "$BUILD"
    BUILD_LOG="$BUILD/xcodebuild-simulator.log"
    if ! xcodebuild -project "$HERE/ios/OmniTaps.xcodeproj" -scheme OmniTaps \
      -sdk iphonesimulator -configuration Debug \
      -destination 'generic/platform=iOS Simulator' \
      -derivedDataPath "$BUILD" \
      CODE_SIGNING_ALLOWED=NO build >"$BUILD_LOG" 2>&1; then
      echo "error: build failed; compiler errors:" >&2
      grep -E "error:" "$BUILD_LOG" | head -20 >&2 || tail -30 "$BUILD_LOG" >&2
      exit 1
    fi

    APP="$BUILD/Build/Products/Debug-iphonesimulator/OmniTaps.app"
    echo "built: $APP"

    if [ "${SKIP_RUN:-0}" = "1" ]; then
      exit 0
    fi

    UDID="${SIM_UDID:-$(xcrun simctl list devices available \
      | sed -nE 's/.*iPhone[^(]*\(([0-9A-F-]{36})\) \(.*/\1/p' | head -1)}"
    if [ -z "$UDID" ]; then
      echo "error: no available iPhone simulator. Install an iOS runtime in Xcode." >&2
      exit 1
    fi

    echo "bootstrapping simulator $UDID"
    xcrun simctl boot "$UDID" >/dev/null 2>&1 || true
    xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1 || true
    open -a Simulator >/dev/null 2>&1 || true

    echo "installing"
    xcrun simctl install "$UDID" "$APP"
    xcrun simctl terminate "$UDID" "$BUNDLE_ID" >/dev/null 2>&1 || true
    xcrun simctl launch "$UDID" "$BUNDLE_ID" >/dev/null

    # Debug builds log the render probe once the SPA has settled. Match only the
    # app's own line: `log show` echoes its predicate from process "log", so a
    # loose grep would "pass" on a blank page.
    echo "waiting for the SPA to settle"
    LINE=""
    for _ in $(seq 1 10); do
      sleep 5
      LINE="$(xcrun simctl spawn "$UDID" log show --last 2m --style compact \
        --predicate 'process == "OmniTaps" AND eventMessage CONTAINS "[OMNITAPS_SMOKE]"' 2>/dev/null \
        | grep -a '\[OMNITAPS_SMOKE\] ' | tail -1 || true)"
      [ -n "$LINE" ] && break
    done

    if [ -z "$LINE" ]; then
      echo "error: no render probe in the log. Recent app log:" >&2
      xcrun simctl spawn "$UDID" log show --last 5m --style compact \
        --predicate 'process == "OmniTaps"' 2>/dev/null | tail -30 >&2 || true
      echo "  simulator: $UDID" >&2
      exit 1
    fi

    mkdir -p "$BUILD"
    printf '%s\n' "$LINE" > "$BUILD/render-probe.log"
    printf '%s' "$LINE" | sed -E 's/^.*\[OMNITAPS_SMOKE\] //' > "$BUILD/render-probe.json"
    echo "probe: $(cat "$BUILD/render-probe.json")"

    # Evidence must be real content, never the boot animation or an error page.
    if printf '%s' "$LINE" | grep -qiE 'Connecting your|NETWORK BOOT|provisional navigation failed|navigation failed'; then
      echo "error: probe reported a boot/error screen, not the settled Home page" >&2
      exit 1
    fi
    if ! printf '%s' "$LINE" | grep -qE '"rootChildren":[1-9]'; then
      echo "error: SPA did not settle (#root is empty)" >&2
      exit 1
    fi
    if ! printf '%s' "$LINE" | grep -qE '"storage":"ok"'; then
      echo "warning: localStorage probe did not report ok" >&2
    fi

    sleep 1
    SHOT="$BUILD/ios-simulator-home.png"
    xcrun simctl io "$UDID" screenshot "$SHOT" >/dev/null 2>&1
    echo "screenshot: $SHOT"
    echo "simulator run OK ($UDID)"
    ;;

  device)
    : "${DEVELOPMENT_TEAM:?set DEVELOPMENT_TEAM to your 10-character Apple team id}"
    : "${CODE_SIGN_IDENTITY:=Apple Development}"
    echo "building for device (signed: $CODE_SIGN_IDENTITY, team $DEVELOPMENT_TEAM)"
    xcodebuild -project "$HERE/ios/OmniTaps.xcodeproj" -scheme OmniTaps \
      -sdk iphoneos -configuration Release \
      -derivedDataPath "$BUILD" \
      CODE_SIGN_STYLE=Manual \
      CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY" \
      DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" \
      build
    echo "built: $BUILD/Build/Products/Release-iphoneos/OmniTaps.app"
    echo "install with Xcode (Window > Devices and Simulators) or:"
    echo "  xcrun devicectl device install app --device <UDID> <path to OmniTaps.app>"
    ;;

  unsigned)
    echo "building unsigned device app"
    mkdir -p "$BUILD"
    BUILD_LOG="$BUILD/xcodebuild-device.log"
    if ! xcodebuild -project "$HERE/ios/OmniTaps.xcodeproj" -scheme OmniTaps \
      -sdk iphoneos -configuration Release \
      -destination 'generic/platform=iOS' \
      -derivedDataPath "$BUILD" \
      CODE_SIGNING_ALLOWED=NO build >"$BUILD_LOG" 2>&1; then
      echo "error: device build failed; compiler errors:" >&2
      grep -E "error:" "$BUILD_LOG" | head -20 >&2 || tail -30 "$BUILD_LOG" >&2
      exit 1
    fi
    APP="$BUILD/Build/Products/Release-iphoneos/OmniTaps.app"
    IPA="$BUILD/OmniTaps-unsigned.ipa"
    rm -rf "$BUILD/Payload" "$IPA"
    mkdir -p "$BUILD/Payload"
    cp -R "$APP" "$BUILD/Payload/"
    (cd "$BUILD" && zip -qry "$IPA" Payload)
    rm -rf "$BUILD/Payload"
    echo "unsigned app: $APP"
    echo "unsigned ipa: $IPA  (sign with codesign + embed a provisioning profile before installing)"
    ;;

  *)
    echo "usage: $0 [simulator|device|unsigned]" >&2
    exit 1
    ;;
esac
