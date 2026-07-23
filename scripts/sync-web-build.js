#!/usr/bin/env node
/**
 * Cross-platform replacement for `rm -rf www && cp -r ../mobile/dist www`.
 *
 * The old root package.json scripts shelled out to Unix-only `rm`/`cp`,
 * which do not exist as such in PowerShell or cmd.exe, breaking the
 * documented Windows development workflow (see PRODUCTION_AUDIT.md D-6).
 * fs.rmSync/fs.cpSync (Node 16.7+) work identically on every platform.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(root, 'mobile', 'dist');
const destination = path.join(root, 'desktop', 'www');

if (!fs.existsSync(source)) {
  console.error(`[sync-web-build] Expected Expo web export at ${source} but it does not exist.`);
  console.error('[sync-web-build] Run "npx expo export" in mobile/ first.');
  process.exit(1);
}

console.log(`[sync-web-build] Removing ${destination}`);
fs.rmSync(destination, { recursive: true, force: true });

console.log(`[sync-web-build] Copying ${source} -> ${destination}`);
fs.cpSync(source, destination, { recursive: true });

// Guard against silently packaging a broken/empty desktop build. A stale or
// missing www/index.html here is exactly what produces a white screen in
// the packaged app with no error shown anywhere (see PRODUCTION_AUDIT.md
// D-16) — fail the build loudly instead.
const indexHtml = path.join(destination, 'index.html');
if (!fs.existsSync(indexHtml) || fs.statSync(indexHtml).size === 0) {
  console.error(`[sync-web-build] ${indexHtml} is missing or empty after copy — refusing to continue.`);
  console.error('[sync-web-build] The desktop app would package with no content and white-screen on launch.');
  process.exit(1);
}

console.log('[sync-web-build] Done.');
