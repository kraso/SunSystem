/**
 * Utilidades compartidas para generadores de texturas procedurales.
 * Cada generador dibuja en un <canvas> 2D y devuelve un THREE.CanvasTexture.
 */

import * as THREE from 'three';

/** Finaliza un canvas como CanvasTexture (colorSpace sRGB, wrap opcional). */
export function createCanvasTexture(
  canvas: HTMLCanvasElement,
  repeat = false,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  return texture;
}

/** Dibuja una mancha orgánica tipo continente/cráter en el contexto. */
export function drawContinent(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
): void {
  ctx.beginPath();
  const points = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const radius = r * (0.6 + Math.random() * 0.4);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/** Aclara un color hex (#rrggbb) en la proporción dada (0–1). */
export function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, r + (255 - r) * amount);
  const lg = Math.min(255, g + (255 - g) * amount);
  const lb = Math.min(255, b + (255 - b) * amount);
  return `rgb(${Math.round(lr)},${Math.round(lg)},${Math.round(lb)})`;
}

/** Oscurece un color hex (#rrggbb) en la proporción dada (0–1). */
export function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.max(0, r * (1 - amount));
  const dg = Math.max(0, g * (1 - amount));
  const db = Math.max(0, b * (1 - amount));
  return `rgb(${Math.round(dr)},${Math.round(dg)},${Math.round(db)})`;
}
