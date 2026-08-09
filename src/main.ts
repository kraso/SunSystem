import * as THREE from 'three';
import { TimeManager } from './core/time-manager';
import { SolarSystem } from './scene/solar-system';
import { OrbitalCamera } from './camera/orbital-camera';
import { createRenderer } from './rendering/renderer';
import { CelestialRaycaster } from './input/raycaster';
import { bindKeyboard } from './input/keyboard';
import { InfoPanel } from './ui/info-panel';
import { TimeControls } from './ui/time-controls';
import { Labels } from './ui/labels';
import { StatsPanel } from './ui/stats-panel';
import { MoonPanel } from './ui/moon-panel';
import { ControlsLegend } from './ui/controls-legend';
import celestialBodiesData from './data/celestial-bodies.json';
import type { CelestialBodyData } from './core/types';

// ─── Bootstrap ────────────────────────────────────────────────────────

const app = document.getElementById('app')!;
const renderer = createRenderer(app);
const timeManager = new TimeManager(0.625); // 15 h/s (0.625 dias/s)
const solarSystem = new SolarSystem(timeManager);
const camera = new OrbitalCamera();
const raycaster = new CelestialRaycaster(camera.camera);
const infoPanel = new InfoPanel();
const timeControls = new TimeControls(timeManager);
const labels = new Labels(camera.camera);
const statsPanel = new StatsPanel(celestialBodiesData as CelestialBodyData[]);
const moonPanel = new MoonPanel();
new ControlsLegend();

const simScene = solarSystem.scene;
solarSystem.load(celestialBodiesData as CelestialBodyData[]);

// Crear etiquetas para los cuerpos
labels.createForBodies(solarSystem.getAllBodies());

// ─── Cámara inicial ──────────────────────────────────────────────────
// Vista en perspectiva sesgada (45°/45°) como la captura de referencia:
// distancia suficiente para ver todo el sistema solar al arrancar.
camera.lookAt(new THREE.Vector3(0, 0, 0), 470, Math.PI / 4, 1.2);

// ─── Interactividad ──────────────────────────────────────────────────

const canvas = renderer.domElement;
canvas.addEventListener('click', (e: MouseEvent) => {
  raycaster.setMouse(e.clientX, e.clientY);
  const hit = raycaster.getClosestIntersection(solarSystem.getAllBodies());
  if (hit) {
    const worldPos = hit.body.getWorldPosition();
    camera.lookAt(worldPos, hit.body.visualRadius * 5);
    infoPanel.show(hit.body.data);
  } else {
    infoPanel.hide();
  }
});

document.getElementById('toggle-info-panel')?.addEventListener('click', () => {
  infoPanel.toggle();
});

document.getElementById('btn-stats')?.addEventListener('click', () => {
  statsPanel.toggle();
});

document.getElementById('btn-luna')?.addEventListener('click', () => {
  moonPanel.toggle();
});

// ─── Toggle de líneas orbitales ────────────────────────────────────
let orbitsVisible = true;
const btnOrbits = document.getElementById('btn-orbits');
btnOrbits?.addEventListener('click', () => {
  orbitsVisible = !orbitsVisible;
  solarSystem.setOrbitLinesVisible(orbitsVisible);
  btnOrbits.classList.toggle('active', orbitsVisible);
});
btnOrbits?.classList.add('active');

bindKeyboard({
  onPauseToggle: () => {
    timeManager.togglePause();
    timeControls.updateUI();
  },
  onSpeedChange: (factor: number) => {
    timeManager.multiplySpeed(factor);
    timeControls.updateUI();
  },
  onReset: () => {
    timeManager.reset();
    timeManager.setSpeed(1);
    timeControls.updateUI();
  },
});

// ─── Selector de planeta (top-bar) ─────────────────────────────────
const focusSelect = document.getElementById('focus-planet') as HTMLSelectElement;
if (focusSelect) {
  // Poblar opciones desde celestial-bodies.json
  const sorted = [...celestialBodiesData]
    .sort((a, b) => (b.displayRadius ?? 0) - (a.displayRadius ?? 0));
  for (const body of sorted) {
    const opt = document.createElement('option');
    opt.value = body.name;
    opt.textContent = body.label;
    focusSelect.appendChild(opt);
  }

  focusSelect.addEventListener('change', () => {
    const name = focusSelect.value;
    if (!name) return;
    const body = solarSystem.getAllBodies().find(b => b.data.name === name);
    if (!body) return;
    const pos = body.getWorldPosition();
    const dist = Math.max(body.visualRadius * 6, 3);
    camera.lookAt(pos, dist);
    focusSelect.value = ''; // reset a placeholder
  });
}

// ─── Loop de renderizado ─────────────────────────────────────────────

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const deltaSeconds = Math.min(clock.getDelta(), 1.0);

  timeManager.update(deltaSeconds);
  solarSystem.update();

  renderer.render(simScene, camera.camera);

  // Actualizar etiquetas DESPUÉS del render: así camera.matrixWorldInverse
  // ya está sincronizada con el frame y la proyección no va un frame atrasada
  // (lo que causaba el temblor al mover la cámara).
  camera.camera.updateMatrixWorld();
  labels.update(solarSystem.getAllBodies());
}

animate();

// ─── Redimensionar ───────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.resize(window.innerWidth, window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('☀️ SunSystem inicializado');
console.log(`   ${solarSystem.getAllBodies().length} cuerpos celestes cargados`);
console.log('   🖱 Click en un planeta para ver información');
console.log('   ⌨ Espacio = pausa | +/- = velocidad | 0 = reset');
