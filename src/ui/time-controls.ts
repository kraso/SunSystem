/**
 * Controles de velocidad de simulación.
 *
 * Vincula la barra inferior (slider + botones) con el TimeManager.
 */

import type { TimeManager } from '../core/time-manager';
import { SPEED_LABELS } from '../core/constants';

export class TimeControls {
  private slider: HTMLInputElement;
  private label: HTMLElement;
  private pauseBtn: HTMLElement;
  private slowerBtn: HTMLElement;
  private fasterBtn: HTMLElement;

  // Mapeo de posiciones del slider (0-100) a velocidades (días/s)
  private readonly speedMap: number[];

  constructor(private timeManager: TimeManager) {
    this.slider = document.getElementById('speed-slider') as HTMLInputElement;
    this.label = document.getElementById('speed-label')!;
    this.pauseBtn = document.getElementById('btn-pause')!;
    this.slowerBtn = document.getElementById('btn-slower')!;
    this.fasterBtn = document.getElementById('btn-faster')!;

    // Construir mapeo exponencial de velocidades
    this.speedMap = this.buildSpeedMap();

    this.bindEvents();
    this.syncSliderToSpeed();
    this.updateUI();
  }

  /** Construye un mapeo exponencial: 0→0, 100→365.25 */
  private buildSpeedMap(): number[] {
    const steps = 101; // 0-100
    const map: number[] = [];

    for (let i = 0; i < steps; i++) {
      if (i === 0) {
        map.push(0);
      } else {
        // Escala exponencial: más resolución en velocidades bajas
        const t = i / 100;
        const speed = Math.pow(10, t * 2.56) - 1; // 0 → 364
        map.push(Math.max(0.1, Math.round(speed * 10) / 10));
      }
    }

    return map;
  }

  private bindEvents(): void {
    // Slider
    this.slider.addEventListener('input', () => {
      const idx = parseInt(this.slider.value);
      const speed = this.speedMap[idx];
      this.timeManager.setSpeed(speed);

      if (speed > 0 && this.timeManager.paused) {
        this.timeManager.resume();
      }

      this.updateUI();
    });

    // Botón pausa
    this.pauseBtn.addEventListener('click', () => {
      this.timeManager.togglePause();
      this.updateUI();
    });

    // Botón más lento
    this.slowerBtn.addEventListener('click', () => {
      this.timeManager.multiplySpeed(0.5);
      this.syncSliderToSpeed();
      this.updateUI();
    });

    // Botón más rápido
    this.fasterBtn.addEventListener('click', () => {
      this.timeManager.multiplySpeed(2);
      this.syncSliderToSpeed();
      this.updateUI();
    });
  }

  /** Sincroniza el slider con la velocidad actual */
  private syncSliderToSpeed(): void {
    const speed = this.timeManager.speed;
    // Encontrar el índice más cercano en el speedMap
    let closestIdx = 0;
    let closestDist = Infinity;

    for (let i = 0; i < this.speedMap.length; i++) {
      const dist = Math.abs(this.speedMap[i] - speed);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    this.slider.value = closestIdx.toString();
  }

  /** Actualiza los elementos UI */
  updateUI(): void {
    const speed = this.timeManager.speed;
    const paused = this.timeManager.paused;

    // Botón pausa
    this.pauseBtn.textContent = paused ? '▶' : '⏸';
    this.pauseBtn.title = paused ? 'Reanudar (Espacio)' : 'Pausa (Espacio)';

    // Label de velocidad
    const exactMatch = SPEED_LABELS[speed];
    if (exactMatch) {
      this.label.textContent = exactMatch;
    } else if (speed === 0) {
      this.label.textContent = paused ? 'Pausado' : '0 días/s';
    } else if (speed < 1) {
      this.label.textContent = `${(speed * 24).toFixed(1)} horas/s`;
    } else {
      this.label.textContent = `${speed.toFixed(1)} días/s`;
    }
  }
}
