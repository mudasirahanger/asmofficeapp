# OfficeHub

OfficeHub is a powerful cross-platform application designed for comprehensive administrative management, featuring notifications and a seamless desktop-native experience alongside a mobile-friendly web application.

## Features

- **Cross-Platform**: Accessible via web, and native Desktop applications for macOS, Windows, and Linux.
- **Role-Based Access Control**: Ensures sensitive settings are exclusively visible to HR and Founders (enforced server-side by the Laravel API — see `backend/`).
- **Native Notifications**: Fully integrated with OS-level notification systems on both Windows and Apple devices.
- **System Tray Background Sync**: Persists and runs in the background silently when closed.

## Supported Platforms (see PRODUCTION_AUDIT.md for verification status)

The desktop app is built with **Electron ^30**, whose minimum supported OS is **Windows 10, macOS 11, and modern Linux distributions**. `npm run build` (from `desktop/`) produces that mainline build.

A **separate, manually-triggered legacy pipeline** (`npm run build:legacy` in `desktop/`) builds against Electron `22.3.27` specifically to extend support down to **Windows 8/8.1**. It is bash-only (Git Bash/WSL on Windows) and is not run as part of the default `npm run build`. Its output uses a distinct filename (`OfficeHub-Win8Legacy-Setup-<version>-<arch>.exe`) so it never collides with the mainline Windows 10/11 installer. This legacy path has not been validated end-to-end on real Windows 8 hardware/VM as part of this audit — treat it as best-effort until confirmed.

- **Windows**: 10/11 x64 and ia32 via the mainline build; 8/8.1 only via `build:legacy` (unverified in this audit).
- **macOS**: DMG, built through `electron-builder --mac`. Requires a macOS build machine/CI runner and an Apple signing/notarization identity for a distributable, notarized build — neither was available in this audit environment.
- **Linux**: AppImage, built through `electron-builder --linux`.

## Releases & Downloads

Check the [Releases](../../releases) tab for the latest compiled binaries.

## Architecture

This project is built using an **Expo React Native Web** frontend bundled alongside an **Electron** wrapper for the desktop client, and a **Laravel** API (Sanctum token auth) backend.

- `mobile/`: The Expo application containing UI, routing, and logic. Package manager: **pnpm** (see `package.json` → `packageManager`).
- `desktop/`: The Electron application providing native OS bridges, Tray API, and local server routing via `electron-serve`.
- `backend/`: The Laravel API. **The web server document root must point at `backend/public`**, never at `backend/` itself — the Laravel app root contains code that must not be directly web-accessible.

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for detailed instructions on building, running, and modifying the source code, and [PRODUCTION_AUDIT.md](PRODUCTION_AUDIT.md) / [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for the current production-readiness status and release process.
