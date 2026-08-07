import * as THREE from 'three';

/**
 * Cámara orbital libre.
 *
 * Permite rotar alrededor de un punto focal, hacer zoom (scroll)
 * y paneo (arrastrar con botón derecho).
 */
export class OrbitalCamera {
  readonly camera: THREE.PerspectiveCamera;

  /** Punto focal (lo que la cámara mira) */
  private _target: THREE.Vector3;

  /** Distancia al punto focal */
  private _distance: number;

  /** Ángulo esférico theta (horizontal, en radianes) */
  private _theta: number;

  /** Ángulo esférico phi (vertical, en radianes) */
  private _phi: number;

  /** Límites */
  readonly minDistance: number;
  readonly maxDistance: number;
  readonly minPhi: number;
  readonly maxPhi: number;

  /** Sensibilidad */
  readonly rotateSpeed: number;
  readonly zoomSpeed: number;
  readonly panSpeed: number;

  /** Estado de arrastre */
  private isDragging = false;
  private dragButton: number = 0;
  private lastMouse = { x: 0, y: 0 };

  constructor(
    fov = 60,
    aspect = window.innerWidth / window.innerHeight,
    near = 0.1,
    far = 1000,
  ) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    this._target = new THREE.Vector3(0, 0, 0);
    this._distance = 30;
    this._theta = Math.PI / 4;
    this._phi = Math.PI / 4;

    // Límites
    this.minDistance = 1;
    this.maxDistance = 700;
    this.minPhi = 0.1;
    this.maxPhi = Math.PI - 0.1;

    // Sensibilidad
    this.rotateSpeed = 0.005;
    this.zoomSpeed = 1.0;
    this.panSpeed = 0.02;

    this.updatePosition();
    this.bindEvents();
  }

  get target(): THREE.Vector3 {
    return this._target.clone();
  }

  get distance(): number {
    return this._distance;
  }

  /** Actualiza la posición de la cámara según coordenadas esféricas */
  private updatePosition(): void {
    const x =
      this._target.x +
      this._distance * Math.sin(this._phi) * Math.cos(this._theta);
    const y = this._target.y + this._distance * Math.cos(this._phi);
    const z =
      this._target.z +
      this._distance * Math.sin(this._phi) * Math.sin(this._theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this._target);
  }

  /** Apunta la cámara hacia un nuevo objetivo */
  lookAt(target: THREE.Vector3, distance?: number): void {
    this._target.copy(target);
    if (distance !== undefined) {
      this._distance = distance;
    }
    this.updatePosition();
  }

  /** Zoom por cantidad delta */
  zoom(delta: number): void {
    this._distance += delta * this.zoomSpeed;
    this._distance = Math.max(this.minDistance, Math.min(this.maxDistance, this._distance));
    this.updatePosition();
  }

  /** Vincula eventos de ratón */
  private bindEvents(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    // Rueda del ratón → zoom
    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      // Ctrl + scroll → zoom acelerado (más rápido)
      const factor = e.ctrlKey ? 5 : 1;
      this.zoom(e.deltaY * 0.01 * factor);
    }, { passive: false });

    // Mouse down → iniciar arrastre
    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true;
      this.dragButton = e.button;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    // Mouse move → rotar o panear
    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return;

      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.lastMouse = { x: e.clientX, y: e.clientY };

      if (this.dragButton === 0) {
        // Botón izquierdo: rotar
        this._theta -= dx * this.rotateSpeed;
        this._phi -= dy * this.rotateSpeed;
        this._phi = Math.max(this.minPhi, Math.min(this.maxPhi, this._phi));
        this.updatePosition();
      } else if (this.dragButton === 2) {
        // Botón derecho: panear
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        this.camera.getWorldDirection(new THREE.Vector3());
        right.crossVectors(this.camera.up, new THREE.Vector3().subVectors(this.camera.position, this._target).normalize()).normalize();
        up.crossVectors(new THREE.Vector3().subVectors(this.camera.position, this._target).normalize(), right).normalize();

        const panOffset = right.multiplyScalar(-dx * this.panSpeed).add(up.multiplyScalar(dy * this.panSpeed));
        this._target.add(panOffset);
        this.updatePosition();
      }
    });

    // Mouse up → soltar
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Prevenir menú contextual al hacer click derecho
    canvas.addEventListener('contextmenu', (e: Event) => e.preventDefault());
  }

  /** Actualiza aspect ratio al redimensionar */
  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
