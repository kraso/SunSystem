import { describe, it, expect } from 'vitest';
import { solveKepler, trueAnomaly, radialDistance } from '../../src/core/kepler';

describe('solveKepler', () => {
  it('devuelve M para órbita circular (e=0)', () => {
    expect(solveKepler(1.5, 0)).toBeCloseTo(1.5, 10);
    expect(solveKepler(0, 0)).toBeCloseTo(0, 10);
    expect(solveKepler(Math.PI, 0)).toBeCloseTo(Math.PI, 10);
  });

  it('converge para excentricidades bajas', () => {
    // M = π/2, e = 0.1
    const E = solveKepler(Math.PI / 2, 0.1);
    // Verificar: M ≈ E - e·sin(E)
    const M_check = E - 0.1 * Math.sin(E);
    expect(M_check).toBeCloseTo(Math.PI / 2, 8);
  });

  it('converge para excentricidades medias (Marte, e=0.0934)', () => {
    const E = solveKepler(1.0, 0.0934);
    const M_check = E - 0.0934 * Math.sin(E);
    expect(M_check).toBeCloseTo(1.0, 8);
  });

  it('converge para alta excentricidad (Mercurio, e=0.2056)', () => {
    const E = solveKepler(2.0, 0.2056);
    const M_check = E - 0.2056 * Math.sin(E);
    expect(M_check).toBeCloseTo(2.0, 8);
  });

  it('maneja M negativas (normalización a [0, 2π))', () => {
    const E1 = solveKepler(-1.0, 0.1);
    const E2 = solveKepler(-1.0 + 2 * Math.PI, 0.1);
    expect(E1).toBeCloseTo(E2, 8);
  });
});

describe('trueAnomaly', () => {
  it('devuelve 0 cuando E=0', () => {
    expect(trueAnomaly(0, 0.5)).toBeCloseTo(0, 10);
  });

  it('devuelve π cuando E=π', () => {
    expect(trueAnomaly(Math.PI, 0.5)).toBeCloseTo(Math.PI, 10);
  });
});

describe('radialDistance', () => {
  it('devuelve a para órbita circular con E=π/2', () => {
    expect(radialDistance(1.0, 0, Math.PI / 2)).toBeCloseTo(1.0, 10);
  });

  it('periastro: r = a(1-e) cuando E=0', () => {
    expect(radialDistance(1.0, 0.5, 0)).toBeCloseTo(0.5, 10);
  });

  it('apoastro: r = a(1+e) cuando E=π', () => {
    expect(radialDistance(1.0, 0.5, Math.PI)).toBeCloseTo(1.5, 10);
  });
});
