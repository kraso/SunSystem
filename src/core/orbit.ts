/**
 * Cálculo de posición orbital 3D usando elementos keplerianos.
 *
 * Dado un cuerpo con elementos orbitales y un tiempo transcurrido,
 * devuelve su posición (x, y, z) en el espacio 3D relativa al foco (padre).
 */

import { solveKepler, trueAnomaly, radialDistance } from './kepler';
import type { CelestialBodyData, OrbitalElements, OrbitalPosition } from './types';
import { AU_SCALE } from './constants';

/** Convierte grados a radianes */
function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Extrae elementos orbitales en radianes de los datos de un cuerpo.
 */
export function getOrbitalElements(body: CelestialBodyData): OrbitalElements {
  return {
    semiMajorAxisAu: body.semiMajorAxisAu,
    eccentricity: body.eccentricity,
    inclinationRad: deg2rad(body.inclinationDeg),
    longitudeOfAscendingNodeRad: deg2rad(body.longitudeOfAscendingNodeDeg),
    argumentOfPeriapsisRad: deg2rad(body.argumentOfPeriapsisDeg),
    meanAnomalyAtEpochRad: deg2rad(body.meanAnomalyAtEpochDeg),
    orbitalPeriodDays: body.orbitalPeriodDays,
  };
}

/**
 * Calcula la posición 3D de un cuerpo en el espacio en unidades de escena
 * para un tiempo simulado dado (en días desde J2000).
 *
 * El sistema de coordenadas tiene:
 *   - Plano XY = plano de referencia (eclíptica)
 *   - Z positivo = norte celeste
 *
 * @param elements - Elementos orbitales del cuerpo
 * @param daysSinceEpoch - Días transcurridos desde J2000 en tiempo simulado
 * @returns Posición {x, y, z} en unidades de escena
 */
export function calculatePosition(
  elements: OrbitalElements,
  daysSinceEpoch: number,
  scaleFactor: number = AU_SCALE,
): OrbitalPosition {
  // Caso especial: cuerpo en el centro (p.ej. el Sol)
  if (elements.semiMajorAxisAu === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  // 1. Movimiento medio n = 2π / P (radianes por día)
  const meanMotion = (2 * Math.PI) / elements.orbitalPeriodDays;

  // 2. Anomalía media M = M₀ + n·Δt
  const meanAnomaly = elements.meanAnomalyAtEpochRad + meanMotion * daysSinceEpoch;

  // 3. Resolver ecuación de Kepler: M = E - e·sin(E)
  const E = solveKepler(meanAnomaly, elements.eccentricity);

  // 4. Anomalía verdadera ν
  const nu = trueAnomaly(E, elements.eccentricity);

  // 5. Distancia radial r = a · (1 - e·cos(E))
  const r = radialDistance(elements.semiMajorAxisAu, elements.eccentricity, E);

  // 6. Posición en el plano orbital (eje x hacia el periastro)
  const xOrb = r * Math.cos(nu);
  const yOrb = r * Math.sin(nu);
  // zOrb = 0 (todo en el plano orbital)

  // 7. Rotar del plano orbital al espacio 3D (eclíptica)
  //    Secuencia: Rz(-Ω) · Rx(-i) · Rz(-ω)
  const cosOmega = Math.cos(elements.longitudeOfAscendingNodeRad);
  const sinOmega = Math.sin(elements.longitudeOfAscendingNodeRad);
  const cosI = Math.cos(elements.inclinationRad);
  const sinI = Math.sin(elements.inclinationRad);
  const cosOmegaP = Math.cos(elements.argumentOfPeriapsisRad);
  const sinOmegaP = Math.sin(elements.argumentOfPeriapsisRad);

  // Primero rotar por ω en el plano orbital
  const x1 = xOrb * cosOmegaP - yOrb * sinOmegaP;
  const y1 = xOrb * sinOmegaP + yOrb * cosOmegaP;

  // Luego por inclinación i alrededor del eje x'
  const x2 = x1;
  const y2 = y1 * cosI;
  const z2 = y1 * sinI;

  // Finalmente por Ω alrededor del eje z, luego mapear a coordenadas Three.js:
  //   orbital (plano XY, Z=norte) → Three.js (plano XZ, Y=arriba)
  //   x_scene =  x_orbital
  //   y_scene =  z_orbital (norte celeste → arriba)
  //   z_scene =  y_orbital
  const xEcl = x2 * cosOmega - y2 * sinOmega;
  const yEcl = x2 * sinOmega + y2 * cosOmega;

  const x = xEcl * scaleFactor;
  const y = z2 * scaleFactor;      // Z orbital → Y de Three.js (arriba)
  const z = yEcl * scaleFactor;    // Y orbital → Z de Three.js (profundidad)

  return { x, y, z };
}
