import * as THREE from 'three';
import type { CelestialBody } from '../scene/celestial-body';

/**
 * Etiquetas flotantes CSS que siguen a los cuerpos celestes en pantalla.
 *
 * Cada label es un div posicionado con coordenadas de pantalla
 * proyectadas desde la posición 3D del cuerpo.
 */
export class Labels {
  private container: HTMLElement;
  private labels: Map<string, HTMLElement> = new Map();
  private camera: THREE.PerspectiveCamera;
  private visible: boolean = true;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;

    // Contenedor de todas las etiquetas (sobre el canvas)
    this.container = document.createElement('div');
    this.container.id = 'labels-container';
    this.container.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 5;
    `;
    document.body.appendChild(this.container);

    // Vincular checkbox
    const checkbox = document.getElementById('show-labels') as HTMLInputElement;
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        this.visible = checkbox.checked;
        this.container.style.display = this.visible ? 'block' : 'none';
      });
    }
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
        font-family: 'Segoe UI', system-ui, sans-serif;
        text-shadow: 0 0 6px rgba(0,0,0,0.8);
        white-space: nowrap;
        will-change: transform;
        transform: translate3d(-50%, -50%, 0);
        pointer-events: none;
      `;
      this.container.appendChild(el);
      this.labels.set(body.data.name, el);
    }
  }

  /** Actualiza posiciones de todas las etiquetas (llamar cada frame) */
  update(bodies: CelestialBody[]): void {
    if (!this.visible) return;

    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;

    for (const body of bodies) {
      const el = this.labels.get(body.data.name);
      if (!el) continue;

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
