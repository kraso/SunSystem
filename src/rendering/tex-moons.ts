/**
 * Texturas procedurales de lunas: Ío (volcánica) y Europa (hielo con grietas).
 * Devuelven THREE.CanvasTexture.
 */

import * as THREE from 'three';
import { createCanvasTexture } from './tex-utils';

/** Ío: superficie volcánica amarillo-naranja con manchas. */
export function createIoTexture(size: number = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ddaa33';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 15; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? '#664400' : '#ffcc44';
    ctx.beginPath();
    ctx.arc(cx, cy, 5 + Math.random() * 15, 0, Math.PI * 2);
    ctx.fill();
  }

  return createCanvasTexture(canvas);
}

/** Europa: hielo blanco atravesado por grietas oscuras. */
export function createEuropaTexture(size: number = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e8e0d8';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#8b7355';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += (Math.random() - 0.5) * size * 0.3;
      y += (Math.random() - 0.5) * size * 0.3;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  return createCanvasTexture(canvas);
}
