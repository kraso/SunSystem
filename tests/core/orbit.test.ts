import { describe, it, expect } from 'vitest';
import { calculatePosition, getOrbitalElements } from '../../src/core/orbit';
import type { CelestialBodyData } from '../../src/core/types';

const earthData: CelestialBodyData = {
  name: 'Earth',
  type: 'terrestrial',
  parent: 'Sun',
  radiusKm: 6371,
  massKg: 5.972e24,
  densityGcm3: 5.51,
  axialTiltDeg: 23.44,
  rotationPeriodHours: 23.9345,
  semiMajorAxisAu: 1.0,
  eccentricity: 0.0167,
  inclinationDeg: 0.0,
  longitudeOfAscendingNodeDeg: -11.261,
  argumentOfPeriapsisDeg: 114.208,
  meanAnomalyAtEpochDeg: 358.617,
  orbitalPeriodDays: 365.256,
  textures: {},
  color: [70, 130, 180],
  displayRadius: 1.0,
  label: 'Tierra',
  description: '',
};

describe('calculatePosition', () => {
  it('devuelve el origen para el Sol (a=0)', () => {
    const pos = calculatePosition(
      { ...getOrbitalElements(earthData), semiMajorAxisAu: 0 },
      100,
    );
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);
    expect(pos.z).toBe(0);
  });

  it('produce posición no nula para la Tierra', () => {
    const elements = getOrbitalElements(earthData);
    const pos = calculatePosition(elements, 100);
    // La posición debe ser no trivial
    expect(pos.x).not.toBe(0);
    // Debe estar aproximadamente a 1 UA del Sol
    const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    expect(dist).toBeGreaterThan(5); // >0.33 UA (AU_SCALE=15)
    expect(dist).toBeLessThan(25);   // <1.67 UA
  });

  it('Tierra completa una órbita en ~365 días', () => {
    const elements = getOrbitalElements(earthData);
    const pos0 = calculatePosition(elements, 0);
    const pos365 = calculatePosition(elements, 365.256);

    // Después de un período orbital, debería volver aproximadamente
    // al mismo punto (con pequeña diferencia por excentricidad)
    const distX = Math.abs(pos365.x - pos0.x);
    const distY = Math.abs(pos365.y - pos0.y);
    const distZ = Math.abs(pos365.z - pos0.z);

    expect(distX).toBeLessThan(0.5);
    expect(distY).toBeLessThan(0.5);
    expect(distZ).toBeLessThan(0.5);
  });
});
