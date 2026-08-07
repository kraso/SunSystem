import * as THREE from 'three';
import type { CelestialBody } from '../scene/celestial-body';

type LabelMode = 'all' | 'planets' | 'moons' | 'none';

/**
 * Etiquetas flotantes CSS que siguen a los cuerpos celestes en pantalla.
 *
 * Cada label es un div posicionado con coordenadas de pantalla
 * proyectadas desde la posición 3D del cuerpo.
 */
export class Labels {
  private container: HTMLElement;
  private labels: Map<string, { el: HTMLElement; type: string }> = new Map();
  private camera: THREE.PerspectiveCamera;
  private mode: LabelMode = 'all';

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;

    // Contenedor de todas las etiquetas (sobre el canvas)
    this.container = document.createElement('div');
    this.container.id = 'labels-container';
    this.container.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 5;
    `;
    document.body.appendChild(this.container);

    // Vincular selector de modo
    const select = document.getElementById('label-mode') as HTMLSelectElement;
    if (select) {
      select.addEventListener('change', () => {
        this.mode = select.value as LabelMode;
        this.applyMode();
      });
    }
  }

  /** Aplica el modo actual: oculta/muestra según tipo de cuerpo */
  private applyMode(): void {
    for (const { el, type } of this.labels.values()) {
      const isPlanet = type !== 'moon' && type !== 'star';
      const show =
        this.mode === 'all' ||
        (this.mode === 'planets' && isPlanet) ||
        (this.mode === 'moons' && type === 'moon');
      el.dataset.modeVisible = show ? '1' : '0';
    }
    // Forzar re-evaluación de posición/visibilidad en el próximo frame
    this.container.style.display = this.mode === 'none' ? 'none' : 'block';
  }

  /** Crea etiquetas para una lista de cuerpos */
  createForBodies(bodies: CelestialBody[]): void {
    for (const body of bodies) {
      // Solo etiquetar planetas y lunas principales (no asteroides ni el Sol)
      if (body.data.type === 'star') continue;
      if (body.data.displayRadius < 0.08) continue; // lunas muy pequeñas

      const el = document.createElement('div');
      el.className = 'planet-label';
      el.textContent = body.data.label;
      el.style.cssText = `
        position: absolute;
        left: 0; top: 0;
        color: rgba(255,255,255,0.85);
        font-size: 11px;
        font-family: 'Audiowide', 'Segoe UI', system-ui, sans-serif;
        text-shadow: 0 0 6px rgba(0,0,0,0.8);
        white-space: nowrap;
        will-change: transform;
        transform: translate3d(-50%, -50%, 0);
        pointer-events: none;
      `;
      this.container.appendChild(el);
      this.labels.set(body.data.name, { el, type: body.data.type });
    }
    this.applyMode();
  }

  /** Actualiza posiciones de todas las etiquetas (llamar cada frame) */
  update(bodies: CelestialBody[]): void {
    if (this.mode === 'none') {
      this.container.style.display = 'none';
      return;
    }
    this.container.style.display = 'block';

    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;

    for (const body of bodies) {
      const entry = this.labels.get(body.data.name);
      if (!entry) continue;
      const el = entry.el;

      // Oculto por modo
      if (el.dataset.modeVisible === '0') {
        el.style.display = 'none';
        continue;
      }

      const worldPos = body.getWorldPosition();

      // Proyectar posición 3D → coordenadas de pantalla
      const screenPos = worldPos.clone().project(this.camera);

      // Si está detrás de la cámara, ocultar
      if (screenPos.z > 1) {
        el.style.display = 'none';
        continue;
      }

      const x = (screenPos.x * halfW) + halfW;
      const y = -(screenPos.y * halfH) + halfH;

      // Ocultar si está fuera de pantalla
      if (x < -50 || x > window.innerWidth + 50 || y < -50 || y > window.innerHeight + 50) {
        el.style.display = 'none';
        continue;
      }

      el.style.display = 'block';
      // Posicionado por GPU (translate3d) en vez de left/top para evitar
      // el temblor de 1px al mover la cámara: las coordenadas sub-píxel se
      // interpolan suavemente en la capa compuesta.
      const offsetY = body.visualRadius * 30;
      el.style.transform = `translate3d(${x}px, ${y + offsetY}px, 0) translate(-50%, -50%)`;
    }
  }
}
