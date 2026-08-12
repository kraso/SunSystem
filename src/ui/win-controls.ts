// Inyecta los controles de ventana (minimizar / maximizar / cerrar) en la
// barra superior (#top-bar) y los conecta al proceso principal vía IPC.
// Solo se activa dentro del ejecutable de Electron (window.electronAPI).
import { createIcons, Moon, BarChart3, Orbit, Stars, Rocket, Bomb, Asterisk, Info, Scale, Crosshair } from 'lucide';

type ElectronAPI = {
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
};

function injectWindowControls(): void {
  const api = (window as unknown as { electronAPI?: ElectronAPI }).electronAPI;
  if (!api) return; // en el navegador no hay controles nativos que suplir

  const bar = document.getElementById('top-bar');
  if (!bar || bar.querySelector('.win-controls')) return;

  const box = document.createElement('div');
  box.className = 'win-controls';
  box.innerHTML = `
    <button class="win-btn" id="win-min" type="button" title="Minimizar" aria-label="Minimizar">&#8211;</button>
    <button class="win-btn" id="win-max" type="button" title="Maximizar" aria-label="Maximizar">&#9633;</button>
    <button class="win-btn win-close" id="win-close" type="button" title="Cerrar" aria-label="Cerrar">&#10005;</button>
  `;
  bar.appendChild(box);

  const min = box.querySelector('#win-min') as HTMLButtonElement;
  const max = box.querySelector('#win-max') as HTMLButtonElement;
  const close = box.querySelector('#win-close') as HTMLButtonElement;

  min.addEventListener('click', () => api.minimize());
  max.addEventListener('click', () => api.toggleMaximize());
  close.addEventListener('click', () => api.close());
}

// Procesa los iconos Lucide de la página (sidebar y secciones).
function renderIcons(): void {
  createIcons({
    icons: { Moon, BarChart3, Orbit, Stars, Rocket, Bomb, Asterisk, Info, Scale, Crosshair },
  });
}

// Ejecuta cuando el DOM esté listo (los módulos TS pueden correr antes de
// que #top-bar exista en algunas páginas).
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectWindowControls();
    renderIcons();
  });
} else {
  injectWindowControls();
  renderIcons();
}
