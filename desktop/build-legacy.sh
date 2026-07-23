#!/bin/bash
# Builds a SEPARATE Windows-8-compatible installer using Electron 22.3.27
# (the last Electron line whose Chromium floor still supports Windows 8/8.1).
# The default `npm run build` uses Electron ^30, which requires Windows 10+.
#
# NOTE: this script is bash-only. On Windows it must be run from Git Bash or
# WSL — it will not run directly from PowerShell or cmd.exe.
#
# Output artifactName is overridden here (not in package.json) so this never
# collides with the modern Windows 10/11 installer produced by `npm run
# build` — both can safely coexist in ../downloads.
set -euo pipefail

echo "Installing Electron v22 for Windows 8 support..."
npm install electron@22.3.27 --no-save

echo "Building Windows 8 legacy installer..."
npx electron-builder --win \
  -c.win.artifactName='${productName}-Win8Legacy-Setup-${version}-${arch}.${ext}' \
  -c.publish=never

echo "Restoring latest Electron version..."
npm install
