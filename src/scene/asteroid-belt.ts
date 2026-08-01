import * as THREE from 'three';
import { AU_SCALE } from '../core/constants';

/**
 * Cinturón de asteroides entre Marte y Júpiter.
 *
 * Usa InstancedMesh para renderizar miles de asteroides
 * en una sola draw call. Distribución toroidal con densidad
 * variable simulando la estructura real del cinturón.
 */

const ASTEROID_COUNT = 3000;
const INNER_RADIUS_AU = 2.0;  // ~Marte
const OUTER_RADIUS_AU = 3.5;  // ~Júpiter
const BELT_HALF_THICKNESS = 0.15; // UA, grosor del cinturón

/**
 * Crea el cinturón de asteroides como InstancedMesh.
 * Cada asteroide es un pequeño icosaedro con rotación y escala aleatorias.
 */
export function createAsteroidBelt(): THREE.InstancedMesh {
  // Geometría base: icosaedro pequeño (parece roca irregular)
  const geometry = new THREE.IcosahedronGeometry(0.08, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.9,
    metalness: 0.1,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, ASTEROID_COUNT);
  mesh.castShadow = true;
  mesh.receiveShadow = false; // Demasiados asteroides para recibir sombras

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < ASTEROID_COUNT; i++) {
    // Distribución radial con más densidad en el centro del cinturón
    const t = i / ASTEROID_COUNT;
    const angle = t * Math.PI * 2 * 3; // ~3 vueltas de distribución (no uniforme)

    // Radio: distribución con pico en ~2.7 UA (centro del cinturón)
    const midRadius = (INNER_RADIUS_AU + OUTER_RADIUS_AU) / 2;
    const radiusJitter = (Math.random() - 0.5) * (OUTER_RADIUS_AU - INNER_RADIUS_AU);
    const radiusAu = midRadius + radiusJitter;
    const radius = radiusAu * AU_SCALE;

    // Ángulo: distribución con rotación global + jitter
    const globalRotation = t * Math.PI * 50; // Rotación global para efecto de anillo
    const theta = angle + globalRotation + (Math.random() - 0.5) * 0.3;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    // Altura: distribución gaussiana alrededor del plano eclíptico (Y=0)
    const y = (Math.random() - 0.5) * BELT_HALF_THICKNESS * AU_SCALE * 2;

    dummy.position.set(x, y, z);

    // Escala aleatoria (0.3x a 1.5x del tamaño base)
    const scale = 0.3 + Math.random() * 1.2;
    dummy.scale.setScalar(scale);

    // Rotación aleatoria
    dummy.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );

    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // Color variable (grises con toques marrones)
    const gray = 0.3 + Math.random() * 0.4;
    const r = gray * (0.8 + Math.random() * 0.4);
    const g = gray * (0.7 + Math.random() * 0.5);
    const b = gray * (0.6 + Math.random() * 0.5);
    color.setRGB(r, g, b);
    mesh.setColorAt(i, color);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor!.needsUpdate = true;

  return mesh;
}
