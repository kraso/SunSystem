/**
 * Gestor del tiempo simulado.
 *
 * Controla la velocidad de la simulación (días simulados por segundo real),
 * pausa/reanuda, y expone el tiempo transcurrido desde la época J2000.
 */

// SECONDS_PER_DAY disponible en constants.ts para cálculos futuros

export class TimeManager {
  /** Días simulados transcurridos desde J2000 */
  private _simDays: number;

  /** Factor de velocidad: días simulados por segundo real */
  private _speed: number;

  /** Si la simulación está pausada */
  private _paused: boolean;

  constructor(initialSpeed: number = 5) {
    this._simDays = 0;
    this._speed = initialSpeed;
    this._paused = false;
  }

  /** Días simulados desde J2000 (solo lectura) */
  get simDays(): number {
    return this._simDays;
  }

  /** Velocidad actual en días/s */
  get speed(): number {
    return this._speed;
  }

  /** Si está pausado */
  get paused(): boolean {
    return this._paused;
  }

  /**
   * Avanza el tiempo simulado.
   * @param deltaSeconds - Segundos reales transcurridos desde el último frame
   */
  update(deltaSeconds: number): void {
    if (this._paused) return;

    // Clamp delta para evitar saltos enormes (p.ej. al cambiar de pestaña)
    const clampedDelta = Math.min(deltaSeconds, 1.0);

    this._simDays += clampedDelta * this._speed;
  }

  /** Pausa la simulación */
  pause(): void {
    this._paused = true;
  }

  /** Reanuda la simulación */
  resume(): void {
    this._paused = false;
  }

  /** Alterna pausa/reanudar */
  togglePause(): void {
    this._paused = !this._paused;
  }

  /** Cambia la velocidad de simulación */
  setSpeed(daysPerSecond: number): void {
    this._speed = Math.max(0, daysPerSecond);
  }

  /** Multiplica la velocidad actual por un factor */
  multiplySpeed(factor: number): void {
    this._speed = Math.max(0, this._speed * factor);
  }

  /** Reinicia el tiempo simulado a 0 (J2000) */
  reset(): void {
    this._simDays = 0;
  }
}
