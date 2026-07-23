const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const serve = require('electron-serve');
const { autoUpdater } = require('electron-updater');

const loadURL = serve({ directory: 'www' });

// The packaged app is only ever served from the local app:// protocol via
// electron-serve. Anything else (http/https links inside the UI, a
// compromised/injected navigation) must never be allowed to load in-process.
const ALLOWED_PROTOCOLS = new Set(['app:']);

function isAllowedNavigationTarget(targetUrl) {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(targetUrl).protocol);
  } catch {
    return false;
  }
}

function hardenWindowNavigation(window) {
  // Block window.open()/target=_blank from spawning new Electron windows.
  // External http(s) links are handed to the OS's default browser instead.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Block in-app navigation away from the packaged app:// origin.
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isAllowedNavigationTarget(targetUrl)) {
      event.preventDefault();
      if (/^https?:\/\//i.test(targetUrl)) {
        shell.openExternal(targetUrl);
      }
    }
  });
}

// White-screen diagnostics/recovery (PRODUCTION_AUDIT.md D-16). The app
// previously had no visibility into, or recovery from, a failed/blank load
// — a load failure (missing www/index.html from a broken build, a GPU
// process crash on older/varied Windows hardware, a wedged renderer) just
// showed an empty window forever with nothing logged anywhere.
let reloadAttempted = false;

function attachLoadDiagnostics(window) {
  window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[main] did-fail-load: ${errorCode} ${errorDescription} (${validatedURL})`);
    // -3 is Chromium's ERR_ABORTED, usually a benign in-flight navigation
    // being superseded (e.g. during hardenWindowNavigation's redirects) —
    // not a real failure, so don't loop-reload on it.
    if (errorCode !== -3 && !reloadAttempted) {
      reloadAttempted = true;
      console.error('[main] Attempting a single automatic reload to recover from the failed load.');
      window.webContents.reload();
    }
  });

  window.webContents.on('did-finish-load', () => {
    reloadAttempted = false;
  });

  window.webContents.on('render-process-gone', (event, details) => {
    console.error('[main] Renderer process gone:', details.reason);
    if (details.reason !== 'clean-exit') {
      window.webContents.reload();
    }
  });

  window.on('unresponsive', () => {
    console.error('[main] Window became unresponsive.');
  });

  window.on('responsive', () => {
    console.error('[main] Window became responsive again.');
  });
}

// Ensure Windows recognizes the AppUserModelId for native notifications
app.setAppUserModelId('com.officehub.app');

let mainWindow;
let tray;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false // Prevents JS timers (syncing) from being paused in the background
    }
  });

  loadURL(mainWindow);
  hardenWindowNavigation(mainWindow);
  attachLoadDiagnostics(mainWindow);

  // Prevent app from quitting when window is closed, hide it instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'build', 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Office Hub');
  tray.setContextMenu(contextMenu);

  // Restore app on double-click
  tray.on('double-click', () => {
    mainWindow.show();
  });
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();

    ipcMain.on('show-notification', (event, { title, body, sound }) => {
      const notification = new Notification({
        title,
        body,
        silent: !sound // if sound is true, we let the OS play the default notification sound
      });
      
      // If user clicks the notification, bring the app to foreground
      notification.on('click', () => {
        if (mainWindow) {
          mainWindow.show();
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      });
      
      notification.show();
    });

    // Auto Updater Setup
    autoUpdater.autoDownload = false;

    ipcMain.handle('check-for-updates', async () => {
      autoUpdater.checkForUpdates();
    });

    ipcMain.handle('download-update', async () => {
      autoUpdater.downloadUpdate();
    });

    ipcMain.handle('install-update', async () => {
      autoUpdater.quitAndInstall(false, true);
    });

    autoUpdater.on('update-available', (info) => {
      if (mainWindow) mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('update-downloaded', (info) => {
      if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
    });

    autoUpdater.on('error', (err) => {
      if (mainWindow) mainWindow.webContents.send('update-error', err.toString());
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        mainWindow.show();
      }
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });
}

// Exported for unit testing only (Electron itself ignores module.exports on
// the entry file, so this has no effect on the packaged app).
module.exports = { isAllowedNavigationTarget, hardenWindowNavigation, attachLoadDiagnostics };
