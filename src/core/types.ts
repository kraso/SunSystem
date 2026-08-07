/**
 * Tipos e interfaces del motor de simulación.
 */

/** Tipos de cuerpos celestes */
export type BodyType = 'star' | 'terrestrial' | 'gas_giant' | 'ice_giant' | 'dwarf_planet' | 'moon';

/** Configuración de anillos */
export interface RingConfig {
  innerRadiusKm: number;
  outerRadiusKm: number;
  color: [number, number, number];
  opacity: number;
  texture?: string;
}

/** Mapas de texturas */
export interface TextureConfig {
  diffuse?: string;
  normal?: string;
  specular?: string;
  clouds?: string;
  emissive?: string;
}

/**
 * Datos completos de un cuerpo celeste.
 * Coincide con la estructura JSON en celestial-bodies.json.
 */
export interface CelestialBodyData {
  name: string;
  type: BodyType;
  parent: string | null;
  radiusKm: number;
  massKg: number;
  densityGcm3: number;
  axialTiltDeg: number;
  rotationPeriodHours: number;
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  longitudeOfAscendingNodeDeg: number;
  argumentOfPeriapsisDeg: number;
  meanAnomalyAtEpochDeg: number;
  orbitalPeriodDays: number;
  textures: TextureConfig;
  color: [number, number, number];
  atmosphereColor?: [number, number, number];
  rings?: RingConfig;
  displayRadius: number;
  label: string;
  description: string;
  moons?: string[];
}

/** Posición 3D de un cuerpo en un instante dado */
export interface OrbitalPosition {
  x: number;
  y: number;
  z: number;
}

/** Elementos orbitales en radianes (para cálculo) */
export interface OrbitalElements {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationRad: number;
  longitudeOfAscendingNodeRad: number;
  argumentOfPeriapsisRad: number;
  meanAnomalyAtEpochRad: number;
  orbitalPeriodDays: number;
}

/** Evento astronómico (eclipse) curado desde fuentes verificadas. */
export interface EclipseEvent {
  /** Fecha ISO (YYYY-MM-DD). */
  date: string;
  /** Tipo de eclipse. */
  kind: 'solar' | 'lunar';
  /** Subtipo: Total, Parcial, Anular, Penumbral. */
  subtype: string;
  /** Magnitud (texto, conserva formato original). */
  magnitude: string;
  /** Duración del evento. */
  duration: string;
  /** Región de visibilidad. */
  visibility: string;
  /** Cuerpos implicados. */
  bodies: string;
  /** Nota breve. */
  note: string;
}

// ─── Planetario (cúpula celeste) ────────────────────────────────────────

/** Estrella del catálogo Hipparcos (mag <= 5). */
export interface StarData {
  hip: number;
  ra: number; // grados
  dec: number; // grados
  mag: number;
  bv: string | null;
  name: string | null;
  con: string | null;
}

/** Líneas de una constelación (coordenadas [ra, dec] en grados). */
export interface ConstellationData {
  id: string;
  name: string;
  lines: [number, number][][];
}

/** Objeto de cielo profundo (Messier/NGC). */
export interface DeepSkyData {
  id: string;
  name: string | null;
  desig: string | null;
  alt: string | null;
  type: string | null;
  typeName: string | null;
  mag: number | null;
  ra: number; // grados
  dec: number; // grados
}

/** Provincia española con su latitud/longitud. */
export interface ProvinceData {
  name: string;
  lat: number;
  lon: number;
}
