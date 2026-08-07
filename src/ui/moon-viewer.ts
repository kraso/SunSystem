/**
 * Visor de la Luna con VÍDEO REAL de la NASA (Moon Phases Loop, SVS 4310).
 *
 * El clip recorre un mes sinódico real (datos LRO/Clementine) con la Luna
 * girando en su eje Y (libración) y sombras físicamente correctas. Para cada
 * día seleccionado se posiciona en la edad lunar correspondiente y se reproduce
 * en bucle una pequeña ventana alrededor de ese instante, de modo que la Luna
 * gira de forma suave y realista sin recorrer el mes completo a toda velocidad.
 *
 * Sin WebGL: usa <video>, ligero para la GPU (evita el bloqueo por
 * GL_OUT_OF_MEMORY del visor anterior con Three.js).
 */

import { SYNODIC_MONTH_DAYS } from '../core/lunar-phase';

const MOON_VIDEO_URL = 'videos/moon-phases.mp4';
/** Ventana de reproducción en derredor del día (en días lunares). */
const WINDOW_DAYS = 3;

export class MoonViewer {
  private video?: HTMLVideoElement;
  private duration = 0;
  private pendingAge: number | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /** Crea el elemento <video> y carga el clip real. */
  private ensureVideo(): void {
    if (this.video) return;

    const video = document.createElement('video');
    video.src = MOON_VIDEO_URL;
    video.loop = false; // controlamos el bucle manualmente por ventana
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.background = '#02030a';
    video.style.borderRadius = '14px';
    this.container.appendChild(video);
    this.video = video;

    video.addEventListener('loadedmetadata', () => {
      this.duration = video.duration;
      if (this.pendingAge !== null) {
        this.seekToAge(this.pendingAge);
        this.play();
        this.pendingAge = null;
      }
    });

    // Bucle manual dentro de la ventana del día.
    video.addEventListener('timeupdate', () => this.onTimeUpdate());
  }

  /** Tiempo (s) del clip correspondiente a una edad lunar en días. */
  private timeForAge(ageDays: number): number {
    if (!this.duration) return 0;
    const frac = (ageDays % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
    return frac * this.duration;
  }

  /** Reproduce la ventana alrededor de la edad lunar indicada. */
  private seekToAge(ageDays: number): void {
    if (!this.video || !this.duration) return;
    const center = this.timeForAge(ageDays);
    const halfWindow = (WINDOW_DAYS / SYNODIC_MONTH_DAYS) * this.duration;
    this.windowStart = Math.max(0, center - halfWindow);
    this.windowEnd = Math.min(this.duration, center + halfWindow);
    this.video.currentTime = this.windowStart;
  }

  private windowStart = 0;
  private windowEnd = 0;

  private onTimeUpdate(): void {
    if (!this.video) return;
    if (this.video.currentTime >= this.windowEnd) {
      this.video.currentTime = this.windowStart;
    }
  }

  /** Posiciona el visor en la edad lunar (días) del día seleccionado. */
  setAgeDays(ageDays: number): void {
    this.ensureVideo();
    if (this.duration) {
      this.seekToAge(ageDays);
      this.play();
    } else {
      this.pendingAge = ageDays;
    }
  }

  /** Compatibilidad: recibe el índice de fase 0–7 y aproxima la edad. */
  setPhase(index8: number): void {
    // 0=nueva, 4=llena → edad ≈ index8/8 * mes sinódico
    this.setAgeDays((index8 / 8) * SYNODIC_MONTH_DAYS);
  }

  private play(): void {
    this.video?.play().catch(() => {
      /* autoplay puede requerir interacción; el click ya la dio */
    });
  }

  /** Libera recursos. */
  dispose(): void {
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
      if (this.video.parentElement === this.container) {
        this.container.removeChild(this.video);
      }
    }
    this.video = undefined;
  }
}
