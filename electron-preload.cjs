// Preload: puente seguro entre el renderer y el proceso principal.
const { contextBridge, ipcRenderer } = require('electron');

// Al arrancar, comprueba si WebGL2 está disponible (Three.js r169 lo exige;
// WebGL1 no sirve). Si no existe, el proceso principal reinicia la app en
// modo render por software.
try {
  const canvas = document.createElement('canvas');
  const hasWebGL2 = !!canvas.getContext('webgl2');
  if (!hasWebGL2) ipcRenderer.send('webgl-unavailable');
} catch {
  ipcRenderer.send('webgl-unavailable');
}

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  toggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
  close: () => ipcRenderer.send('window-close'),
});
