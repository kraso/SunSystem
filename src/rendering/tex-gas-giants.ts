/**
 * Texturas procedurales de los gigantes gaseosos (Júpiter, Saturno)
 * e gigantes de hielo (Urano, Neptuno). Devuelven THREE.CanvasTexture.
 */

import * as THREE from 'three';
import { createCanvasTexture, lightenColor, darkenColor } from './tex-utils';

/** Júpiter: bandas gaseosas + Gran Mancha Roja. */
export function createJupiterTexture(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bands = [
    { y: 0, h: 0.08, color: '#c4a46c' },
    { y: 0.08, h: 0.12, color: '#e8d5a3' },
    { y: 0.20, h: 0.06, color: '#b8956a' },
    { y: 0.26, h: 0.10, color: '#d4b896' },
    { y: 0.36, h: 0.08, color: '#a0522d' }, // Banda marrón-rojiza
    { y: 0.44, h: 0.06, color: '#c49a6c' },
    { y: 0.50, h: 0.08, color: '#e0c8a0' },
    { y: 0.58, h: 0.06, color: '#b08050' },
    { y: 0.64, h: 0.12, color: '#d4b080' },
    { y: 0.76, h: 0.06, color: '#c09060' },
    { y: 0.82, h: 0.10, color: '#e0cca0' },
    { y: 0.92, h: 0.08, color: '#b89068' },
  ];

  for (const band of bands) {
    const y = band.y * size;
    const h = band.h * size;
    const gradient = ctx.createLinearGradient(0, y, 0, y + h);
    gradient.addColorStop(0, band.color);
    gradient.addColorStop(0.3, band.color);
    gradient.addColorStop(0.5, lightenColor(band.color, 0.15));
    gradient.addColorStop(0.7, band.color);
    gradient.addColorStop(1, darkenColor(band.color, 0.1));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, size, h);
  }

  // Turbulencia en las bandas
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const turb = Math.sin(y * 0.05 + Math.sin(x * 0.02) * 3) * 0.08 +
                   Math.cos(x * 0.03 + y * 0.04) * 0.06;
      const idx = (y * size + x) * 4;
      data[idx] = Math.min(255, data[idx] * (1 + turb));
      data[idx + 1] = Math.min(255, data[idx + 1] * (1 + turb));
      data[idx + 2] = Math.min(255, data[idx + 2] * (1 + turb));
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Gran Mancha Roja (ovalada, desplazada del centro)
  ctx.save();
  ctx.translate(size * 0.55, size * 0.38);
  ctx.rotate(0.1);
  ctx.fillStyle = 'rgba(180,80,50,0.7)';
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.08, size * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,100,60,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.06, size * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  return createCanvasTexture(canvas);
}

/** Saturno: bandas pálidas amarillo-crema. */
export function createSaturnTexture(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const colors = ['#e8d5a0', '#f0e0b8', '#ddd0a0', '#e8dbb0', '#dcc898', '#eee0c0', '#e0d0a8'];
  const bandHeight = size / colors.length;

  for (let i = 0; i < colors.length; i++) {
    const y = i * bandHeight;
    const gradient = ctx.createLinearGradient(0, y, 0, y + bandHeight);
    gradient.addColorStop(0, colors[i]);
    gradient.addColorStop(0.5, lightenColor(colors[i], 0.08));
    gradient.addColorStop(1, darkenColor(colors[i], 0.05));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, size, bandHeight);
  }

  return createCanvasTexture(canvas);
}

/** Urano: azul-verdoso suave y uniforme. */
export function createUranusTexture(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#b8e8e0');
  gradient.addColorStop(0.5, '#90d0d4');
  gradient.addColorStop(1, '#60a8b0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return createCanvasTexture(canvas);
}

/** Neptuno: azul intenso con Gran Mancha Oscura (más clara). */
export function createNeptuneTexture(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#4060f0');
  gradient.addColorStop(0.4, '#3050d0');
  gradient.addColorStop(1, '#1838a0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Parche brillante (Gran Mancha Oscura — en Neptuno es más clara)
  ctx.fillStyle = 'rgba(100,140,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(size * 0.55, size * 0.45, size * 0.1, size * 0.06, 0.2, 0, Math.PI * 2);
  ctx.fill();

  return createCanvasTexture(canvas);
}
