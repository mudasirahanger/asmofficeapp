const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendNotification: (title, body, sound = true) => ipcRenderer.send('show-notification', { title, body, sound })
});
