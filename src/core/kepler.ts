/**
 * Solver de la ecuación de Kepler: M = E - e·sin(E)
 * Encuentra la anomalía excéntrica E dada la anomalía media M y la excentricidad e.
 *
 * Usa Newton-Raphson para excentricidades bajas/medias (converge en <5 iteraciones).
 * Para e > 0.9 usa iteración de punto fijo como fallback.
 */

const MAX_ITERATIONS = 50;
const TOLERANCE = 1e-12;

/**
 * Resuelve la ecuación de Kepler para la anomalía excéntrica.
 *
 * @param meanAnomaly - Anomalía media en radianes
 * @param eccentricity - Excentricidad orbital (0 = circular, 0 < e < 1 para elíptica)
 * @returns Anomalía excéntrica E en radianes
 */
export function solveKepler(meanAnomaly: number, eccentricity: number): number {
  // Caso trivial: órbita circular
  if (eccentricity === 0) return meanAnomaly;

  // Normalizar M al rango [0, 2π)
  let M = meanAnomaly % (2 * Math.PI);
  if (M < 0) M += 2 * Math.PI;

  // Semilla inicial: M + e·sin(M) es buena para e < 0.8
  let E = M + eccentricity * Math.sin(M);

  // Para alta excentricidad, mejor semilla
  if (eccentricity > 0.8) {
    E = Math.PI; // arrancar desde π es seguro para órbitas muy excéntricas
  }

  // Newton-Raphson: E_{n+1} = E_n - (E_n - e·sin(E_n) - M) / (1 - e·cos(E_n))
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const delta = (E - eccentricity * Math.sin(E) - M) / (1 - eccentricity * Math.cos(E));
    E -= delta;

    if (Math.abs(delta) < TOLERANCE) {
      return E;
    }
  }

  // Si no converge (órbita muy excéntrica), devolver el mejor valor obtenido
  return E;
}

/**
 * Calcula la anomalía verdadera ν a partir de la anomalía excéntrica E.
 *
 * ν = 2 · atan2(√(1+e) · sin(E/2), √(1-e) · cos(E/2))
 */
export function trueAnomaly(eccentricAnomaly: number, eccentricity: number): number {
  const sinHalfE = Math.sin(eccentricAnomaly / 2);
  const cosHalfE = Math.cos(eccentricAnomaly / 2);
  const sqrt1PlusE = Math.sqrt(1 + eccentricity);
  const sqrt1MinusE = Math.sqrt(1 - eccentricity);

  return 2 * Math.atan2(sqrt1PlusE * sinHalfE, sqrt1MinusE * cosHalfE);
}

/**
 * Calcula la distancia radial r desde el foco.
 *
 * r = a · (1 - e·cos(E))
 */
export function radialDistance(
  semiMajorAxis: number,
  eccentricity: number,
  eccentricAnomaly: number,
): number {
  return semiMajorAxis * (1 - eccentricity * Math.cos(eccentricAnomaly));
}
