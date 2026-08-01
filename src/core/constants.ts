/**
 * Constantes astronómicas fundamentales.
 * Unidades: SI (metros, kilogramos, segundos) excepto donde se indique.
 */

/** Constante gravitacional universal (m³ kg⁻¹ s⁻²) */
export const G = 6.6743e-11;

/** Unidad Astronómica en km */
export const AU_KM = 149_597_870.7;

/** Días julianos en la época J2000.0 */
export const J2000 = 2451545.0;

/** Segundos en un día */
export const SECONDS_PER_DAY = 86400;

/** Días en un año juliano */
export const DAYS_PER_YEAR = 365.25;

/**
 * Escala de la escena: 1 UA = AU_SCALE unidades de Three.js.
 * Ajustable para balancear distancias vs visibilidad.
 */
export const AU_SCALE = 15;

/**
 * Escala para lunas: las distancias reales en UA son minúsculas.
 * Multiplicamos por este factor para que las lunas sean visibles
 * alrededor de sus planetas en la escala artística.
 */
export const MOON_AU_SCALE = 1500;

/**
 * Factor de escala para radios planetarios (escala artística).
 * Los radios reales son demasiado pequeños respecto a las distancias orbitales.
 * A 1 UA = 10 unidades, el radio de la Tierra (6371 km) = 0.000426 unidades.
 * Multiplicamos por este factor para hacerlos visibles.
 */
export const PLANET_RADIUS_SCALE = 1000;

/** Velocidades predefinidas de simulación (días simulados por segundo real) */
export const SPEED_PRESETS = {
  PAUSED: 0,
  DAY_PER_SECOND: 1,
  WEEK_PER_SECOND: 7,
  MONTH_PER_SECOND: 30,
  YEAR_PER_SECOND: 365.25,
  DECADE_PER_SECOND: 3652.5,
} as const;

/** Labels de velocidad para UI */
export const SPEED_LABELS: Record<number, string> = {
  0: 'Pausado',
  1: '1 día/s',
  7: '1 semana/s',
  30: '1 mes/s',
  365.25: '1 año/s',
  3652.5: '10 años/s',
};
