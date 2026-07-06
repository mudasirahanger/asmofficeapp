# Developer Guide

This guide provides instructions on how to set up the development environment, build the frontend, and compile the native Desktop binaries.

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)
- macOS, Linux, or Windows development machine.

## Initial Setup

1. Install dependencies for the Mobile (Web) application:
   ```bash
   cd mobile
   npm install
   ```

2. Install dependencies for the Desktop (Electron) application:
   ```bash
   cd ../desktop
   npm install
   ```

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

- **Electron Version:** We explicitly use Electron `v22.3.27` to maintain compatibility with older OS environments, primarily Windows 8. Do not upgrade to `v24+` unless Windows 8 support is officially dropped.
- **System Tray:** `main.js` intelligently selects `build/icon.ico` for Windows, and `build/icon.png` for other OS platforms to ensure cross-platform consistency.
- **Routing:** We use `electron-serve` to intercept the local `app://-` protocol and gracefully serve the static Expo Web assets avoiding `file://` protocol restrictions.


- **output** npx expo export -p web --output-dir ../desktop/www
 