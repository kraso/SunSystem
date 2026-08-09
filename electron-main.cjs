const { app, BrowserWindow } = require('electron');
const path = require('path');

// Evita múltiples instancias
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#05060c',
    title: 'SunSystem',
    icon: path.join(__dirname, 'assets', 'textures', 'sun.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Carga el sitio compilado (Vite build -> dist/)
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Sin menú para que parezca app nativa
  win.setMenuBarVisibility(false);

  win.on('closed', () => {
    // noop
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
