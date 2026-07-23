# Developer Guide

This guide provides instructions on how to set up the development environment, build the frontend, run the Laravel backend, and compile the native Desktop binaries.

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **pnpm** (v9, matching `mobile/package.json` → `packageManager`) — used for `mobile/`. Do not use `npm install` in `mobile/`; it will generate a second, conflicting lockfile (see PRODUCTION_AUDIT.md D-5).
- **npm** (v9 or higher) — used for `desktop/` (no `packageManager` pin there yet).
- **PHP 8.2+ and Composer** — used for `backend/`.
- macOS, Linux, or Windows development machine.

## Initial Setup

1. Install dependencies for the Mobile (Web) application (pnpm is authoritative here):
   ```bash
   cd mobile
   pnpm install --frozen-lockfile
   ```

2. Install dependencies for the Desktop (Electron) application:
   ```bash
   cd ../desktop
   npm install
   ```

3. Set up the Laravel backend API:
   ```bash
   cd ../backend
   cp .env.example .env
   composer install
   php artisan key:generate
   php artisan migrate
   php artisan serve
   ```
   The web server's document root **must** be `backend/public`, never `backend/` itself. `backend/.env.example` documents all required environment variables (DB, mail, `SANCTUM_STATEFUL_DOMAINS`, `EXPO_PUSH_URL`, etc.). Set `APP_DEBUG=false` and a real `APP_KEY` for any non-local environment.

## Development Workflow

### 1. Modifying the UI
All UI components, routing, and screens are built using Expo and React Native Web in the `mobile` directory.

To run the web development server:
```bash
cd mobile
npm run web
```

### 2. Building for Desktop Integration
The Electron application in the `desktop` directory acts as a wrapper that loads the compiled web application. 

To bridge the gap, you must compile the `mobile` app and move it into the `desktop` directory:
```bash
cd mobile
npm run build:web
```
This generates a static output in `mobile/dist`.

### 3. Packaging the Desktop App
The `desktop/package.json` contains automated scripts to pull the compiled web app and package the executable using `electron-builder`.

```bash
cd desktop
npm run build
```

This script will:
1. Delete any existing `www/` directory.
2. Copy `../mobile/dist/` into `www/`.
3. Run `electron-builder` to generate binaries for macOS (`.dmg`), Windows (`.exe` NSIS installer), and Linux (`.AppImage`).

The output binaries will be placed in the `downloads/` directory at the project root.

## Architecture Notes

- **Electron Version:** The mainline `desktop/package.json` devDependency is Electron `^30.0.0` (installed `30.5.1`). Electron 23+ requires Windows 10 or later — the mainline build does **not** run on Windows 8. Windows 8/8.1 support is provided separately by `npm run build:legacy` (`desktop/build-legacy.sh`), which temporarily installs Electron `22.3.27` (the last line that still supports Windows 8), builds only the Windows target with a distinct artifact name, then restores Electron 30. Do not merge these two pipelines or let their outputs share a filename — see PRODUCTION_AUDIT.md D-4.
- **System Tray:** `main.js` loads `build/icon.png` for the tray icon on all platforms.
- **Routing:** We use `electron-serve` to intercept the local `app://-` protocol and gracefully serve the static Expo Web assets avoiding `file://` protocol restrictions. `main.js` also restricts `will-navigate`/new-window behavior to that origin — see PRODUCTION_AUDIT.md D-3.
- **Package manager split:** `mobile/` uses pnpm; `desktop/` and the repo root use npm. This mirrors what's actually installed today; unifying further was out of scope for this pass.

- **Web export output:** `npx expo export -p web --output-dir ../desktop/www` (or use the root `npm run build` / `npm run start`, which now calls the cross-platform `scripts/sync-web-build.js` instead of Unix-only `rm -rf`/`cp -r` — see PRODUCTION_AUDIT.md D-6).
