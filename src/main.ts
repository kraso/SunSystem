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
import celestialBodiesData from './data/celestial-bodies.json';
import type { CelestialBodyData } from './core/types';

// ─── Bootstrap ────────────────────────────────────────────────────────

const app = document.getElementById('app')!;
const renderer = createRenderer(app);
const timeManager = new TimeManager(30);
const solarSystem = new SolarSystem(timeManager);
const camera = new OrbitalCamera();
const raycaster = new CelestialRaycaster(camera.camera);
const infoPanel = new InfoPanel();
const timeControls = new TimeControls(timeManager);
const labels = new Labels(camera.camera);
const statsPanel = new StatsPanel(celestialBodiesData as CelestialBodyData[]);

const simScene = solarSystem.scene;
solarSystem.load(celestialBodiesData as CelestialBodyData[]);

// Crear etiquetas para los cuerpos
labels.createForBodies(solarSystem.getAllBodies());

// ─── Cámara inicial ──────────────────────────────────────────────────
camera.lookAt(new THREE.Vector3(0, 0, 0), 50);

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

// ─── Loop de renderizado ─────────────────────────────────────────────

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const deltaSeconds = Math.min(clock.getDelta(), 1.0);

  timeManager.update(deltaSeconds);
  solarSystem.update();

  // Actualizar posiciones de etiquetas
  labels.update(solarSystem.getAllBodies());

  renderer.render(simScene, camera.camera);
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
