/**
 * Textura procedural del Sol: granulación convectiva, limb darkening
 * y manchas solares. Devuelve un THREE.CanvasTexture con wrap repetido.
 */

import * as THREE from 'three';
import { createCanvasTexture } from './tex-utils';

export function createSunTexture(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Fondo base: gradiente radial de blanco-amarillo a naranja oscuro
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#fffbe6');
  gradient.addColorStop(0.3, '#ffe08a');
  gradient.addColorStop(0.6, '#ffb833');
  gradient.addColorStop(0.85, '#f57c00');
  gradient.addColorStop(1, '#c43e00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Granulación: pequeñas celdas brillantes (simula células de convección)
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      const dist = Math.sqrt(dx * dx + dy * dy) / (size / 2);

      // Limb darkening: bordes más oscuros
      const mu = Math.sqrt(Math.max(0, 1 - dist * dist));
      const limbFactor = 0.3 + 0.7 * mu;

      // Ruido de granulación (pseudoaleatorio determinista)
      const noiseX = Math.sin(x * 0.3 + y * 0.7) * Math.cos(y * 0.5 + x * 0.3);
      const noiseY = Math.sin(y * 0.4 - x * 0.6) * Math.cos(x * 0.6 - y * 0.4);
      const noise = (noiseX + noiseY) * 0.12;

      const idx = (y * size + x) * 4;
      const factor = limbFactor + noise;

      // Aplicar factor a RGB (sin tocar alpha)
      data[idx] = Math.min(255, data[idx] * factor);
      data[idx + 1] = Math.min(255, data[idx + 1] * factor);
      data[idx + 2] = Math.min(255, data[idx + 2] * factor);
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Manchas solares: pequeños puntos oscuros aleatorios
  ctx.fillStyle = 'rgba(80,20,0,0.4)';
  for (let i = 0; i < 30; i++) {
    const sx = size * 0.15 + Math.random() * size * 0.7;
    const sy = size * 0.15 + Math.random() * size * 0.7;
    const sr = 2 + Math.random() * 8;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();

    // Penumbra alrededor de la mancha
    ctx.fillStyle = 'rgba(120,60,10,0.2)';
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(80,20,0,0.4)';
  }

  return createCanvasTexture(canvas, true);
}
