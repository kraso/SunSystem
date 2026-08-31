const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// En Linux, permite el fallback WebGL por software (SwiftShader) cuando el
// driver/GPU falla o está bloqueado (p. ej. Fedora/Wayland), para que la
// escena 3D no se quede en negro. Sin efecto en GPUs que funcionan bien.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
}

// Evita múltiples instancias
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#05060c',
    title: 'SunSystem',
    // Icono de ventana: ICO en Windows, PNG en Linux/macOS (GTK no renderiza .ico)
    icon: path.join(__dirname, 'assets', 'textures', process.platform === 'win32' ? 'sun.ico' : 'sun.png'),
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Carga el sitio compilado (Vite build -> dist/)
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Sin menú para que parezca app nativa
  win.setMenuBarVisibility(false);

  // Controles de ventana propios (botones en la UI de la app)
  ipcMain.on('window-minimize', () => win.minimize());
  ipcMain.on('window-toggle-maximize', () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on('window-close', () => win.close());

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
