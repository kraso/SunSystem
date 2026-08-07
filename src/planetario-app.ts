import * as THREE from 'three';
import { createRenderer } from './rendering/renderer';
import { Planetarium } from './scene/planetarium';
import { ObserverCamera } from './camera/observer-camera';
import starsData from './data/stars.json';
import constellationsData from './data/constellations.json';
import deepSkyData from './data/deep-sky.json';
import provincesData from './data/spanish-provinces.json';
import type {
  StarData,
  ConstellationData,
  DeepSkyData,
  ProvinceData,
} from './core/types';

const app = document.getElementById('app')!;
const renderer = createRenderer(app);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060c);

// Vista de observador: cámara en el origen (sobre la Tierra) mirando al cielo.
const camera = new ObserverCamera();

const planetarium = new Planetarium(
  starsData as StarData[],
  constellationsData as ConstellationData[],
  deepSkyData as DeepSkyData[],
);
scene.add(planetarium.group);

// ─── Provincias (Madrid por defecto) ────────────────────────────────
const provinces = provincesData as ProvinceData[];
const sel = document.getElementById('province-select') as HTMLSelectElement;
for (const p of provinces) {
  const opt = document.createElement('option');
  opt.value = p.name;
  opt.textContent = p.name;
  sel.appendChild(opt);
}
sel.value = 'Madrid';
const madrid = provinces.find((p) => p.name === 'Madrid')!;
planetarium.setProvince(madrid);
camera.resetView();
sel.addEventListener('change', () => {
  const p = provinces.find((x) => x.name === sel.value);
  if (p) {
    planetarium.setProvince(p);
    camera.resetView();
  }
});

// ─── Controles de fecha y toggles ───────────────────────────────────
const dateInput = document.getElementById('pl-datetime') as HTMLInputElement;
const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
dateInput.addEventListener('change', () => {
  if (dateInput.value) planetarium.setDate(new Date(dateInput.value));
});

const bindToggle = (id: string, fn: (v: boolean) => void) => {
  const el = document.getElementById(id) as HTMLInputElement;
  el?.addEventListener('change', () => fn(el.checked));
};
bindToggle('pl-lines', (v) => planetarium.toggleLines(v));
bindToggle('pl-deepsky', (v) => planetarium.toggleDeepSky(v));
bindToggle('pl-const-labels', (v) => planetarium.toggleConstellationLabels(v));
bindToggle('pl-obj-labels', (v) => planetarium.toggleObjectLabels(v));

// ─── Leyenda de objetos astronómicos (búsqueda + lista) ────────────
interface LegendItem {
  name: string;
  kind: 'const' | 'obj';
  ra: number; // grados
  dec: number; // grados
}

function fmtRA(raDeg: number): string {
  let deg = raDeg % 360;
  if (deg < 0) deg += 360;
  const hours = deg / 15;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function fmtDec(decDeg: number): string {
  const sign = decDeg >= 0 ? '+' : '−';
  const a = Math.abs(decDeg);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  return `${sign}${d}° ${m.toString().padStart(2, '0')}′`;
}

// Construye la lista: constelaciones (RA/Dec centroide) + objetos Messier.
const legendItems: LegendItem[] = [];
for (const c of constellationsData as ConstellationData[]) {
  // Promedio de vectores unitarios (evita el salto en 0h/24h de RA).
  let x = 0;
  let y = 0;
  let z = 0;
  let n = 0;
  for (const line of c.lines) {
    for (const [ra, dec] of line) {
      const raR = (ra * Math.PI) / 180;
      const decR = (dec * Math.PI) / 180;
      x += Math.cos(decR) * Math.cos(raR);
      y += Math.cos(decR) * Math.sin(raR);
      z += Math.sin(decR);
      n++;
    }
  }
  if (n > 0) {
    const raC = (Math.atan2(y, x) * 180) / Math.PI;
    const decC = (Math.asin(z / n) * 180) / Math.PI;
    legendItems.push({ name: c.name, kind: 'const', ra: raC, dec: decC });
  }
}
for (const o of deepSkyData as DeepSkyData[]) {
  const label = (o.name || o.desig || o.id) ?? o.id;
  legendItems.push({ name: label, kind: 'obj', ra: o.ra, dec: o.dec });
}
legendItems.sort((a, b) => a.name.localeCompare(b.name));

const legendList = document.getElementById('pl-legend-list') as HTMLDivElement;
const searchInput = document.getElementById('pl-search') as HTMLInputElement;

function renderLegend(filter: string): void {
  const f = filter.trim().toLowerCase();
  legendList.innerHTML = '';
  for (const it of legendItems) {
    if (f && !it.name.toLowerCase().includes(f)) continue;
    const el = document.createElement('div');
    el.className = `pl-legend-item kind-${it.kind}`;
    el.innerHTML = `<div class="pl-legend-name">${it.name}</div>` +
      `<div class="pl-legend-coord">RA ${fmtRA(it.ra)} · Dec ${fmtDec(it.dec)}</div>`;
    el.addEventListener('click', () => {
      const { altDeg, azDeg } = planetarium.altAzFor(it.ra, it.dec);
      camera.lookAtAltAz(altDeg, azDeg);
    });
    legendList.appendChild(el);
  }
}
renderLegend('');

searchInput.addEventListener('input', () => renderLegend(searchInput.value));

document.getElementById('pl-legend-toggle')?.addEventListener('click', (e) => {
  const leg = document.getElementById('pl-legend')!;
  leg.classList.toggle('collapsed');
  (e.target as HTMLElement).textContent = leg.classList.contains('collapsed') ? '+' : '–';
});

// ─── Etiquetas DOM (constelaciones y objetos) ──────────────────────
const labelsLayer = document.getElementById('pl-labels') as HTMLDivElement;
const constEls: HTMLDivElement[] = [];
const objEls: HTMLDivElement[] = [];

function ensureLabelPool(pool: HTMLDivElement[], n: number, cls: string): void {
  while (pool.length < n) {
    const el = document.createElement('div');
    el.className = cls;
    labelsLayer.appendChild(el);
    pool.push(el);
  }
  for (let i = 0; i < pool.length; i++) pool[i].style.display = i < n ? 'block' : 'none';
}

// ─── Tooltip al pasar el ratón sobre estrellas ──────────────────────
const tooltip = document.getElementById('pl-tooltip') as HTMLDivElement;
const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 4 };
const mouse = new THREE.Vector2();

app.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera.camera);
  const hit = planetarium.pickStar(raycaster);
  if (hit && hit.star) {
    const s = hit.star;
    const name = s.name ? `${s.name} (HIP ${s.hip})` : `HIP ${s.hip}`;
    const cons = hit.constellation ? `<br>Constelación: ${hit.constellation}` : '';
    tooltip.innerHTML = `<strong>${name}</strong><br>Mag: ${s.mag}${cons}`;
    tooltip.style.left = `${e.clientX + 14}px`;
    tooltip.style.top = `${e.clientY + 14}px`;
    tooltip.style.display = 'block';
  } else {
    tooltip.style.display = 'none';
  }
});

// ─── Bucle de render ────────────────────────────────────────────────
function animate(): void {
  camera.camera.updateMatrixWorld();
  renderer.render(scene, camera.camera);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const v = new THREE.Vector3();

  const cl = planetarium.constellationLabels;
  ensureLabelPool(constEls, cl.length, 'pl-label pl-const');
  for (let i = 0; i < cl.length; i++) {
    v.copy(cl[i].pos).project(camera.camera);
    const el = constEls[i];
    el.textContent = cl[i].text;
    if (v.z > 1) { el.style.display = 'none'; continue; }
    const x = (v.x * 0.5 + 0.5) * w;
    const y = (-v.y * 0.5 + 0.5) * h;
    if (x < -60 || x > w + 60 || y < -60 || y > h + 60) {
      el.style.display = 'none';
      continue;
    }
    el.style.display = 'block';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  const ol = planetarium.objectLabels;
  ensureLabelPool(objEls, ol.length, 'pl-label pl-obj');
  for (let i = 0; i < ol.length; i++) {
    v.copy(ol[i].pos).project(camera.camera);
    const el = objEls[i];
    el.textContent = ol[i].text;
    if (v.z > 1) { el.style.display = 'none'; continue; }
    const x = (v.x * 0.5 + 0.5) * w;
    const y = (-v.y * 0.5 + 0.5) * h;
    if (x < -60 || x > w + 60 || y < -60 || y > h + 60) {
      el.style.display = 'none';
      continue;
    }
    el.style.display = 'block';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.resize(window.innerWidth, window.innerHeight);
});

