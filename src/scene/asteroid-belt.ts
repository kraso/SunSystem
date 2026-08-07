import * as THREE from 'three';
import { AU_SCALE } from '../core/constants';

/**
 * Cinturón de asteroides entre Marte y Júpiter.
 *
 * Usa InstancedMesh para renderizar miles de asteroides
 * en una sola draw call. Geometría de roca irregular (icosaedro
 * deformado + flatShading) para que de cerca se vean como
 * rocas facetadas, no como pelotitas grises.
 */

const ASTEROID_COUNT = 4000;
const INNER_RADIUS_AU = 2.0;  // ~Marte
const OUTER_RADIUS_AU = 3.5;  // ~Júpiter
const BELT_HALF_THICKNESS = 0.15; // UA, grosor del cinturón

/** Geometría de roca irregular: icosaedro con vértices deformados. */
function createRockGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(0.08, 1);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Deformación pseudoaleatoria por vértice (look de roca irregular)
    const n = 1 + (Math.sin(v.x * 9.1) * 0.18 + Math.cos(v.y * 7.3) * 0.14 + Math.sin(v.z * 11.7) * 0.12);
    v.multiplyScalar(n);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Crea el cinturón de asteroides como InstancedMesh.
 * Tamaños muy variables (algunos grandes tipo Ceres/Vesta) y
 * colores gris-marrón para dar escala y variedad al acercar.
 */
export function createAsteroidBelt(): THREE.InstancedMesh {
  const geometry = createRockGeometry();
  const material = new THREE.MeshStandardMaterial({
    color: 0x999999,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, ASTEROID_COUNT);
  mesh.castShadow = true;
  mesh.receiveShadow = false; // Demasiados asteroides para recibir sombras

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const midRadius = (INNER_RADIUS_AU + OUTER_RADIUS_AU) / 2;

  for (let i = 0; i < ASTEROID_COUNT; i++) {
    // Distribución radial con más densidad en el centro del cinturón
    const t = i / ASTEROID_COUNT;
    const angle = t * Math.PI * 2 * 3; // ~3 vueltas (no uniforme)

    // Radio: pico en ~2.7 UA (centro), con jitter
    const radiusJitter = (Math.random() - 0.5) * (OUTER_RADIUS_AU - INNER_RADIUS_AU);
    const radiusAu = midRadius + radiusJitter;
    const radius = radiusAu * AU_SCALE;

    // Ángulo: rotación global + jitter
    const globalRotation = t * Math.PI * 50;
    const theta = angle + globalRotation + (Math.random() - 0.5) * 0.3;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    // Altura: distribución alrededor del plano eclíptico (Y=0)
    const y = (Math.random() - 0.5) * BELT_HALF_THICKNESS * AU_SCALE * 2;

    dummy.position.set(x, y, z);

    // Tamaño variable: la mayoría pequeños, unos pocos algo mayores
    // (variedad sutil, sin asteroides gigantes que destaquen).
    const big = Math.random() < 0.015;
    const scale = big ? 1.5 + Math.random() * 1.3 : 0.25 + Math.random() * 1.0;
    dummy.scale.setScalar(scale);

    // Rotación aleatoria (cada asteroide gira distinto)
    dummy.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );

    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // Color variable: grises con toques marrones/rojizos
    const tone = Math.random();
    const gray = 0.32 + Math.random() * 0.4;
    const r = gray * (0.85 + tone * 0.35);
    const g = gray * (0.78 + tone * 0.2);
    const b = gray * (0.7 + (1 - tone) * 0.15);
    color.setRGB(r, g, b);
    mesh.setColorAt(i, color);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor!.needsUpdate = true;

  return mesh;
}
