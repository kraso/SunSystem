import * as THREE from 'three';
import type { CelestialBody } from '../scene/celestial-body';

/**
 * Detecta clicks en cuerpos celestes usando raycasting.
 */
export class CelestialRaycaster {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  /** Callback cuando se hace click en un cuerpo */
  onClick: ((body: CelestialBody | null) => void) | null = null;

  constructor(private camera: THREE.PerspectiveCamera) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.bindEvents();
  }

  private bindEvents(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('click', (e: MouseEvent) => {
      // Solo procesar si no fue un arrastre (drag)
      // Verificar si el ratón se movió desde mousedown
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Buscar intersecciones con los meshes de todos los cuerpos
      // (esto lo maneja solar-system pasando los meshes)
    });
  }

  /**
   * Detecta qué cuerpo está bajo el cursor dado un conjunto de cuerpos.
   * @param bodies - Lista de cuerpos a testear
   * @returns El cuerpo intersectado o null
   */
  intersect(bodies: CelestialBody[]): CelestialBody | null {
    const meshes = bodies.map((b) => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      // Buscar el cuerpo que contiene este mesh
      for (const body of bodies) {
        if (body.mesh === hitMesh) {
          return body;
        }
      }
    }

    return null;
  }

  /** Devuelve la intersección más cercana (distancia) */
  getClosestIntersection(bodies: CelestialBody[]): {
    body: CelestialBody;
    point: THREE.Vector3;
    distance: number;
  } | null {
    const meshes = bodies.map((b) => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitMesh = hit.object as THREE.Mesh;

      for (const body of bodies) {
        if (body.mesh === hitMesh) {
          return {
            body,
            point: hit.point,
            distance: hit.distance,
          };
        }
      }
    }

    return null;
  }

  /** Actualiza la posición del ratón para el raycaster */
  setMouse(clientX: number, clientY: number): void {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }
}
