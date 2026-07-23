#!/usr/bin/env node
/**
 * Minimal static file server with SPA fallback, used to serve the
 * production `expo export -p web` output for Playwright E2E tests.
 *
 * This deliberately mimics how the app is actually served in production:
 * - A real static host (or Electron's electron-serve) falls back to
 *   index.html for any path that isn't a real file, so client-side
 *   routing (Expo Router, `web.output: "single"`) works on page refresh /
 *   deep links.
 * - A plain `python -m http.server` does NOT do this fallback and would
 *   404 on any nested route, which is not representative of production.
 *
 * Usage: node static-server.js <dir> <port>
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || 'dist');
const port = parseInt(process.argv[3] || '4173', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(dir, urlPath);

  if (!filePath.startsWith(dir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA fallback
      filePath = path.join(dir, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, () => {
  console.log(`[static-server] Serving ${dir} at http://localhost:${port}`);
});
