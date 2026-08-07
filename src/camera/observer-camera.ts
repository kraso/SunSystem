import * as THREE from 'three';

/**
 * Cámara de observador: el espectador está en el origen (sobre la Tierra)
 * y mira hacia la bóveda celeste. El arrastre gira la dirección de mira
 * (yaw/pitch) y la rueda hace zoom cambiando el FOV. Vista interior, no
 * orbital: nunca se ve "desde fuera" de la cúpula.
 *
 * Convención de mira: yaw=0 apunta al norte (az=0), yaw=π al sur (az=180).
 * pitch=π/2 es el cénit. resetView() apunta al sur a 40° de altura, que es
 * la vista estándar de un observador del hemisferio norte (horizonte abajo).
 */
export class ObserverCamera {
  readonly camera: THREE.PerspectiveCamera;
  private yaw = Math.PI; // sur
  private pitch = (40 * Math.PI) / 180; // 40° sobre el horizonte
  private fov = 70;
  private dragging = false;
  private last = { x: 0, y: 0 };

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      window.innerWidth / window.innerHeight,
      0.1,
      2000,
    );
    this.camera.position.set(0, 0, 0);
    this.apply();
    this.bindEvents();
  }

  /** Apunta la mira a una altitud/azimut dadas (grados). az: 0=N, 90=E. */
  lookAtAltAz(altDeg: number, azDeg: number): void {
    this.yaw = (azDeg * Math.PI) / 180;
    this.pitch = (altDeg * Math.PI) / 180;
    this.pitch = Math.max(-0.15, Math.min(Math.PI + 0.15, this.pitch));
    this.apply();
  }

  /** Restablece la mira a la vista estándar del observador (sur, 28°). */
  resetView(): void {
    this.yaw = Math.PI;
    this.pitch = (28 * Math.PI) / 180;
    this.fov = 75;
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    this.apply();
  }

  private apply(): void {
    const cp = Math.cos(this.pitch);
    const dir = new THREE.Vector3(
      cp * Math.sin(this.yaw),
      Math.sin(this.pitch),
      -cp * Math.cos(this.yaw),
    );
    this.camera.lookAt(dir);
  }

  private bindEvents(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.fov = Math.max(20, Math.min(100, this.fov + e.deltaY * 0.03));
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }, { passive: false });

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.dragging = true;
      this.last = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.last.x;
      const dy = e.clientY - this.last.y;
      this.last = { x: e.clientX, y: e.clientY };
      this.yaw -= dx * 0.0025;
      this.pitch += dy * 0.0025;
      // Limita la mira entre el horizonte y un poco por debajo (no bajo tus pies)
      this.pitch = Math.max(-0.15, Math.min(Math.PI + 0.15, this.pitch));
      this.apply();
    });

    window.addEventListener('mouseup', () => {
      this.dragging = false;
    });

    canvas.addEventListener('contextmenu', (e: Event) => e.preventDefault());
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
