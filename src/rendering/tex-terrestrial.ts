/**
 * Texturas procedurales de planetas telúricos: Tierra, Mercurio,
 * Venus, Marte y la Luna terrestre. Devuelven THREE.CanvasTexture.
 */

import * as THREE from 'three';
import { createCanvasTexture, drawContinent } from './tex-utils';

/** Tierra simplificada: océanos, continentes, hielo polar y nubes. */
export function createEarthTexture(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Océano base
  ctx.fillStyle = '#2255aa';
  ctx.fillRect(0, 0, size, size);

  // Continentes simplificados (manchas orgánicas)
  ctx.fillStyle = '#44aa33';
  drawContinent(ctx, size * 0.2, size * 0.3, size * 0.18);
  drawContinent(ctx, size * 0.45, size * 0.25, size * 0.15);
  drawContinent(ctx, size * 0.7, size * 0.35, size * 0.12);
  drawContinent(ctx, size * 0.35, size * 0.55, size * 0.14);
  drawContinent(ctx, size * 0.6, size * 0.6, size * 0.13);
  drawContinent(ctx, size * 0.25, size * 0.7, size * 0.16);
  drawContinent(ctx, size * 0.75, size * 0.7, size * 0.1);

  // Hielo polar
  ctx.fillStyle = '#eef8ff';
  ctx.fillRect(0, 0, size, size * 0.08);
  ctx.fillRect(0, size * 0.92, size, size * 0.08);

  // Nubes
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 20; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const cr = 10 + Math.random() * 30;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  return createCanvasTexture(canvas);
}

/** Mercurio: gris craterizado. */
export function createMercuryTexture(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b0b0b0';
  ctx.fillRect(0, 0, size, size);

  // Cráteres
  for (let i = 0; i < 60; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const cr = 2 + Math.random() * 15;
    const shade = 120 + Math.random() * 80;
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,200,200,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  return createCanvasTexture(canvas);
}

/** Venus: atmósfera densa amarillenta con remolinos. */
export function createVenusTexture(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#f5e6c8');
  gradient.addColorStop(0.5, '#e8d5a0');
  gradient.addColorStop(1, '#c8b080');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 8; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    ctx.fillStyle = 'rgba(255,240,210,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 20 + Math.random() * 40, 5 + Math.random() * 10, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  return createCanvasTexture(canvas);
}

/** Marte: rojo anaranjado con regiones oscuras y casquete polar. */
export function createMarsTexture(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c1440e';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#8b2500';
  drawContinent(ctx, size * 0.3, size * 0.4, size * 0.2);
  drawContinent(ctx, size * 0.6, size * 0.55, size * 0.18);
  drawContinent(ctx, size * 0.5, size * 0.25, size * 0.12);

  // Casquete polar
  ctx.fillStyle = 'rgba(255,250,240,0.6)';
  ctx.fillRect(0, 0, size, size * 0.06);

  // Cráteres
  for (let i = 0; i < 20; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const cr = 2 + Math.random() * 8;
    ctx.fillStyle = 'rgba(100,30,0,0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  return createCanvasTexture(canvas);
}

/** Luna terrestre: gris con mares oscuros y cráteres. */
export function createMoonTexture(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(0, 0, size, size);

  // Mares (manchas oscuras)
  ctx.fillStyle = '#909090';
  drawContinent(ctx, size * 0.35, size * 0.4, size * 0.2);
  drawContinent(ctx, size * 0.6, size * 0.5, size * 0.15);
  drawContinent(ctx, size * 0.5, size * 0.7, size * 0.12);

  // Cráteres
  for (let i = 0; i < 80; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const cr = 2 + Math.random() * 10;
    const shade = 140 + Math.random() * 80;
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  return createCanvasTexture(canvas);
}
