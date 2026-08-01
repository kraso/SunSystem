import * as THREE from 'three';
import { AU_SCALE } from '../core/constants';

/**
 * Crea una línea de órbita circular/elíptica para visualizar la trayectoria.
 *
 * @param semiMajorAxisAu - Semieje mayor en UA
 * @param eccentricity - Excentricidad (0 = círculo perfecto)
 * @param color - Color de la línea (hex)
 * @param segments - Número de segmentos (más = más suave)
 */
export function createOrbitLine(
  semiMajorAxisAu: number,
  eccentricity: number,
  color: number = 0x334455,
  segments: number = 256,
): THREE.Line {
  const points: THREE.Vector3[] = [];
  const a = semiMajorAxisAu * AU_SCALE;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;

    if (eccentricity === 0) {
      // Círculo perfecto
      points.push(new THREE.Vector3(
        Math.cos(angle) * a,
        0,
        Math.sin(angle) * a,
      ));
    } else {
      // Órbita elíptica simplificada: r(θ) = a(1-e²)/(1+e·cos(θ))
      const r = a * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(angle));
      points.push(new THREE.Vector3(
        Math.cos(angle) * r,
        0,
        Math.sin(angle) * r,
      ));
    }
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });

  return new THREE.Line(geometry, material);
}
