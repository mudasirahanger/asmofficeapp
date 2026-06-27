const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const serve = require('electron-serve');

const loadURL = serve({ directory: 'www' });

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

  // Prevent app from quitting when window is closed, hide it instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const isWindows = process.platform === 'win32';
  const iconFileName = isWindows ? 'icon.ico' : 'icon.png';
  const iconPath = path.join(__dirname, 'build', iconFileName);
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
