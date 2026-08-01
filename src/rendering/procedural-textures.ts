/**
 * Generador de texturas procedurales para cuerpos celestes.
 *
 * Como no podemos depender de texturas descargadas,
 * generamos texturas por código usando Canvas 2D.
 *
 * Cada generador devuelve un THREE.CanvasTexture listo para usar.
 */

import * as THREE from 'three';

/** Crea una textura procedural del Sol con granulación y limb darkening */
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Crea una textura procedural tipo Júpiter (bandas gaseosas) */
export function createJupiterTexture(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Bandas horizontales
  const bands = [
    { y: 0, h: 0.08, color: '#c4a46c' },
    { y: 0.08, h: 0.12, color: '#e8d5a3' },
    { y: 0.20, h: 0.06, color: '#b8956a' },
    { y: 0.26, h: 0.10, color: '#d4b896' },
    { y: 0.36, h: 0.08, color: '#a0522d' },  // Banda marrón-rojiza (Gran Mancha Roja cercana)
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

  // Añadir turbulencia a las bandas
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Crea textura de Saturno (bandas pálidas) */
export function createSaturnTexture(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Bandas sutiles amarillo-pálido
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Crea textura de Urano (azul-verdoso suave) */
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Crea textura de Neptuno (azul intenso) */
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Crea textura tipo Tierra simplificada */
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Mercurio: gris craterizado */
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
    // Borde brillante
    ctx.strokeStyle = `rgba(200,200,200,0.5)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Venus: atmósfera densa amarillenta */
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

  // Remolinos atmosféricos
  for (let i = 0; i < 8; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    ctx.fillStyle = 'rgba(255,240,210,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 20 + Math.random() * 40, 5 + Math.random() * 10, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Marte: rojo anaranjado con regiones oscuras */
export function createMarsTexture(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c1440e';
  ctx.fillRect(0, 0, size, size);

  // Regiones más oscuras
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
    ctx.fillStyle = `rgba(100,30,0,0.4)`;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Luna terrestre: gris con cráteres y mares oscuros */
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Ío: volcánico amarillo-naranja */
export function createIoTexture(size: number = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ddaa33';
  ctx.fillRect(0, 0, size, size);

  // Manchas volcánicas oscuras
  for (let i = 0; i < 15; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? '#664400' : '#ffcc44';
    ctx.beginPath();
    ctx.arc(cx, cy, 5 + Math.random() * 15, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Europa: hielo blanco con grietas */
export function createEuropaTexture(size: number = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e8e0d8';
  ctx.fillRect(0, 0, size, size);

  // Grietas (líneas oscuras)
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function drawContinent(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
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

function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, r + (255 - r) * amount);
  const lg = Math.min(255, g + (255 - g) * amount);
  const lb = Math.min(255, b + (255 - b) * amount);
  return `rgb(${Math.round(lr)},${Math.round(lg)},${Math.round(lb)})`;
}

function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.max(0, r * (1 - amount));
  const dg = Math.max(0, g * (1 - amount));
  const db = Math.max(0, b * (1 - amount));
  return `rgb(${Math.round(dr)},${Math.round(dg)},${Math.round(db)})`;
}
