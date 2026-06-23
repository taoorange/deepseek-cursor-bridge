#!/usr/bin/env bash
# Publish deepseek-cursor-bridge to Open VSX (Cursor extension marketplace).
#
# Usage:
#   npm run publish:openvsx
#   npm run publish:openvsx -- --bump patch
#
# OVSX_PAT: maintainer configures in ~/.zshrc (not committed).
# If unset, script sources ~/.zshrc, then prompts interactively.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OPENVSX_NAMESPACE="taoorange"
VSIX_PATH="/tmp/deepseek-cursor-bridge.vsix"
BUMP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bump)
      BUMP="${2:-}"
      if [[ -z "$BUMP" || ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
        echo "Error: --bump requires patch, minor, or major"
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      echo "Usage: npm run publish:openvsx [-- --bump patch|minor|major]"
      echo ""
      echo "Environment:"
      echo "  OVSX_PAT   Open VSX token (read from env or ~/.zshrc; prompted if unset)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

cleanup() {
  if [[ -f package.json.bak ]]; then
    mv -f package.json.bak package.json
  fi
}
trap cleanup EXIT

step() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

if [[ -z "${OVSX_PAT:-}" && -f "${HOME}/.zshrc" ]]; then
  # shellcheck disable=SC1090
  source "${HOME}/.zshrc" 2>/dev/null || true
fi

if [[ -z "${OVSX_PAT:-}" ]]; then
  echo "Open VSX Access Token not found in OVSX_PAT."
  echo "Tip: add export OVSX_PAT=... to ~/.zshrc"
  echo -n "Paste token (input hidden): "
  read -rs OVSX_PAT
  echo ""
fi

if [[ -z "$OVSX_PAT" ]]; then
  echo "Error: OVSX_PAT is required."
  exit 1
fi

if [[ -n "$BUMP" ]]; then
  step "Bump version ($BUMP)"
  node -e "
    const fs = require('fs');
    const p = require('./package.json');
    const [major, minor, patch] = p.version.split('.').map(Number);
    const bump = process.argv[1];
    if (bump === 'major') { p.version = major + 1 + '.0.0'; }
    else if (bump === 'minor') { p.version = major + '.' + (minor + 1) + '.0'; }
    else { p.version = major + '.' + minor + '.' + (patch + 1); }
    fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
    console.log('  version -> ' + p.version);
  " "$BUMP"
fi

VERSION="$(node -p "require('./package.json').version")"
echo ""
echo "Publishing taoorange.deepseek-cursor-bridge v${VERSION} to Open VSX"

step "Step 1/5: Validate"
npm run validate

step "Step 2/5: Set publisher to ${OPENVSX_NAMESPACE} (temporary)"
cp package.json package.json.bak
node -e "
  const fs = require('fs');
  const p = require('./package.json');
  p.publisher = '${OPENVSX_NAMESPACE}';
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
"

step "Step 3/5: Compile"
npm run compile

step "Step 4/5: Package VSIX"
npx @vscode/vsce package -o "$VSIX_PATH" --allow-missing-repository
echo "  VSIX: ${VSIX_PATH}"

step "Step 5/5: Publish to Open VSX"
npx ovsx publish "$VSIX_PATH" -p "$OVSX_PAT"

trap - EXIT
cleanup

echo ""
echo "Done: https://open-vsx.org/extension/${OPENVSX_NAMESPACE}/deepseek-cursor-bridge"
echo "Cursor may take a few hours to sync. Install now with:"
echo "  cursor --install-extension ${VSIX_PATH}"
