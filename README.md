# OfficeHub

OfficeHub is a powerful cross-platform application designed for comprehensive administrative management, featuring notifications and a seamless desktop-native experience alongside a mobile-friendly web application.

## Features

- **Cross-Platform**: Accessible via web, and native Desktop applications for macOS, Windows (Windows 8 to Windows 11), and Linux.
- **Role-Based Access Control**: Ensures sensitive settings are exclusively visible to HR and Founders.
- **Native Notifications**: Fully integrated with OS-level notification systems on both Windows and Apple devices.
- **System Tray Background Sync**: Persists and runs in the background silently when closed.

## Releases & Downloads

Check the [Releases](../../releases) tab for the latest compiled binaries.

### v1.1.7 (Latest)
- **Windows**: Full support for both 64-bit and 32-bit architectures, restoring legacy compatibility for Windows 8.
- **macOS**: Built as a universally compatible DMG.
- **Linux**: Available as an AppImage.

## Architecture

This project is built using an **Expo React Native Web** frontend bundled alongside an **Electron** wrapper for the desktop client, enabling a truly universal codebase.

- `mobile/`: The Expo application containing UI, routing, and logic.
- `desktop/`: The Electron application providing native OS bridges, Tray API, and local server routing via `electron-serve`.

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for detailed instructions on building, running, and modifying the source code.
