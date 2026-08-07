/**
 * Cálculo de fases lunares (matemática pura, sin Three.js).
 *
 * Método de precisión media: edad lunar desde la época de referencia
 * (luna nueva 2000-01-06 18:14 UTC) usando el mes sinódico. Suficiente
 * para visualización (±0,5 días en borde de fase).
 */

/** Mes sinódico (días entre dos lunas nuevas consecutivas). */
export const SYNODIC_MONTH_DAYS = 29.530588853;

/** Época de referencia: luna nueva J2000-style (días julianos). */
const KNOWN_NEW_MOON_JD = 2451550.1; // 2000-01-06 18:14 UTC

/** Nombres de las 8 fases en español (orden creciente → menguante). */
export const PHASE_NAMES_ES = [
  'Luna Nueva',
  'Luna Creciente',
  'Cuarto Creciente',
  'Gibosa Creciente',
  'Luna Llena',
  'Gibosa Menguante',
  'Cuarto Menguante',
  'Luna Menguante',
] as const;

/** Equivalente en inglés (para consultas a APIs de la NASA, que indexan en EN). */
export const PHASE_NAMES_EN: Record<PhaseName, string> = {
  'Luna Nueva': 'new moon',
  'Luna Creciente': 'waxing crescent moon',
  'Cuarto Creciente': 'first quarter moon',
  'Gibosa Creciente': 'waxing gibbous moon',
  'Luna Llena': 'full moon',
  'Gibosa Menguante': 'waning gibbous moon',
  'Cuarto Menguante': 'last quarter moon',
  'Luna Menguante': 'waning crescent moon',
};

export type PhaseName = (typeof PHASE_NAMES_ES)[number];

export interface MoonPhase {
  /** 0–7,8 (posición en el ciclo sinódico). */
  readonly index8: number;
  /** Nombre en español de la fase. */
  readonly phaseName: PhaseName;
  /** Iluminación visible 0–1. */
  readonly illumination: number;
  /** Edad lunar en días desde la última luna nueva (0–29,53). */
  readonly age: number;
  /** Fracción del ciclo 0–1 (0 = nueva, 0,5 = llena). */
  readonly cycleFraction: number;
}

/** Días julianos para una fecha UTC (usa mediodía para estabilidad). */
function julianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const h = date.getUTCHours() + (date.getUTCMinutes() + date.getUTCSeconds() / 60) / 60;
  const d = date.getUTCDate() + (h - 12) / 24;

  // Fliegel–Van Flandern (gregoriano)
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}

/** Devuelve los datos de fase lunar para una fecha dada. */
export function getMoonPhase(date: Date): MoonPhase {
  const jd = julianDay(date);
  const daysSinceNew = jd - KNOWN_NEW_MOON_JD;
  const cycleFraction = ((daysSinceNew % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) %
    SYNODIC_MONTH_DAYS / SYNODIC_MONTH_DAYS;
  const age = cycleFraction * SYNODIC_MONTH_DAYS;

  let index8: number;
  if (cycleFraction < 0.0625 || cycleFraction >= 0.9375) index8 = 0;
  else if (cycleFraction < 0.1875) index8 = 1;
  else if (cycleFraction < 0.3125) index8 = 2;
  else if (cycleFraction < 0.4375) index8 = 3;
  else if (cycleFraction < 0.5625) index8 = 4;
  else if (cycleFraction < 0.6875) index8 = 5;
  else if (cycleFraction < 0.8125) index8 = 6;
  else index8 = 7;

  // Iluminación: 0 en nueva, 1 en llena, 0 en siguiente nueva.
  const illumination = (1 - Math.cos(cycleFraction * 2 * Math.PI)) / 2;

  return {
    index8,
    phaseName: PHASE_NAMES_ES[index8],
    illumination,
    age,
    cycleFraction,
  };
}

/** Descripción detallada de la fase (geometría Sol–Tierra–Luna). */
export function getPhaseDescription(phaseName: PhaseName): string {
  const map: Record<PhaseName, string> = {
    'Luna Nueva':
      'La Luna está entre la Tierra y el Sol. El hemisferio iluminado apunta al Sol y el lado visible es oscuro. No se ve desde la Tierra (excepto en eclipse solar).',
    'Luna Creciente':
      'La Luna ha avanzado y vemos una fina franja iluminada en el lado derecho (hemisferio norte). El Sol ilumina <50% de la cara visible.',
    'Cuarto Creciente':
      'Exactamente la mitad de la cara visible está iluminada. La Luna forma un ángulo de 90° con el Sol visto desde la Tierra.',
    'Gibosa Creciente':
      'Más de la mitad iluminada y creciendo. El terminador retrocede hacia el lado oriental.',
    'Luna Llena':
      'La Tierra está entre el Sol y la Luna: el hemisferio iluminado apunta hacia nosotros. Máxima iluminación (≈100%).',
    'Gibosa Menguante':
      'Más de la mitad iluminada pero decreciendo. La luz retrocede por el lado izquierdo (hemisferio norte).',
    'Cuarto Menguante':
      'La mitad occidental de la cara visible está iluminada. Otro ángulo de 90° con el Sol.',
    'Luna Menguante':
      'Franja decreciente en el lado izquierdo. La Luna se acerca a la conjunción con el Sol (siguiente luna nueva).',
  };
  return map[phaseName];
}

/**
 * Distancia geocéntrica Tierra–Luna (km) para una fecha dada.
 * Modelo completo de Meeus (Astronomical Algorithms, Cap. 47): 23 términos
 * periódicos en la anomalía media (M'), elongación (D) y argumento de latitud (F).
 * Valores en grados con t en días desde J2000. Precisión ~±100 km frente a efemérides.
 */
export function getMoonDistanceKm(date: Date): number {
  const jd = julianDay(date);
  const t = jd - 2451545.0; // días desde J2000
  const r = Math.PI / 180;
  const Mp = (134.96341138 + 13.06499295363 * t) * r; // anomalía media
  const D = (297.85020420 + 12.19074911753 * t) * r; // elongación media
  const F = (93.2720950 + 483202.0175233 * t) * r; // argumento de latitud

  return (
    385000.56 -
    20905.355 * Math.cos(Mp) -
    3699.111 * Math.cos(2 * D - Mp) -
    2955.968 * Math.cos(2 * D) -
    569.925 * Math.cos(2 * Mp) +
    204.571 * Math.cos(2 * Mp - 2 * D) +
    129.622 * Math.cos(Mp) -
    108.744 * Math.cos(2 * F) -
    104.444 * Math.cos(2 * F - 2 * D + Mp) -
    79.920 * Math.cos(2 * F - 2 * D - Mp) -
    49.333 * Math.cos(2 * D + Mp) -
    37.031 * Math.cos(2 * D - Mp) -
    24.495 * Math.cos(2 * F + Mp) +
    22.632 * Math.cos(2 * F - Mp) +
    20.211 * Math.cos(2 * F + 2 * D - Mp) -
    18.650 * Math.cos(2 * F + 2 * D) +
    15.896 * Math.cos(2 * F + 2 * D + Mp) -
    11.422 * Math.cos(2 * D - 2 * Mp) +
    9.599 * Math.cos(2 * F + Mp) -
    8.528 * Math.cos(2 * F + 2 * D - 2 * Mp) -
    7.389 * Math.cos(2 * Mp) -
    6.119 * Math.cos(2 * F - 2 * D) +
    4.813 * Math.cos(2 * F - 2 * D + 2 * Mp)
  );
}

/** Umbral de distancia (km) para clasificar una Luna Llena como superluna. */
export const SUPERMOON_DISTANCE_KM = 360000;

/**
 * Determina si una fecha es una superluna: Luna Llena cuya distancia al perigeo
 * es <= SUPERMOON_DISTANCE_KM (360.000 km, según PLAN §6.2 / §8.5).
 * Si la fecha no es Luna Llena, evalúa la distancia mínima de la lunación.
 */
export function isSupermoon(date: Date): boolean {
  if (getMoonPhase(date).index8 !== 4) return false; // solo Luna Llena

  let minDist = Infinity;
  for (let off = -18; off <= 18; off++) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + off);
    const dist = getMoonDistanceKm(d);
    if (dist < minDist) minDist = dist;
  }
  return minDist <= SUPERMOON_DISTANCE_KM;
}
