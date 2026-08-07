import * as THREE from 'three';
import { AU_SCALE } from '../core/constants';

/**
 * Cinturón de asteroides entre Marte y Júpiter.
 *
 * Renderizado como un anillo sutil y semi-transparente.
 * Geometría de roca irregular (icosaedro deformado + flatShading)
 * que solo se aprecia de muy cerca; de lejos es una línea tenue.
 */

const ASTEROID_COUNT = 1500;
const INNER_RADIUS_AU = 2.1;  // ~Marte
const OUTER_RADIUS_AU = 3.3;  // ~Júpiter
const BELT_HALF_THICKNESS = 0.08; // UA, grosor del cinturón (más delgado)

/** Geometría de roca irregular: icosaedro pequeño deformado. */
function createRockGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(0.03, 1);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 1 + (Math.sin(v.x * 9.1) * 0.18 + Math.cos(v.y * 7.3) * 0.14 + Math.sin(v.z * 11.7) * 0.12);
    v.multiplyScalar(n);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Crea el cinturón de asteroides como un anillo sutil.
 * 1500 asteroides diminutos, semitransparentes, que solo se
 * distinguen de cerca; de lejos es una línea tenue en el plano.
 */
export function createAsteroidBelt(): THREE.InstancedMesh {
  const geometry = createRockGeometry();
  const material = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.95,
    metalness: 0.05,
    transparent: true,
    opacity: 0.5,
    flatShading: true,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, ASTEROID_COUNT);
  mesh.castShadow = false; // Sutil: no proyecta sombras
  mesh.receiveShadow = false;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const midRadius = (INNER_RADIUS_AU + OUTER_RADIUS_AU) / 2;

  for (let i = 0; i < ASTEROID_COUNT; i++) {
    const t = i / ASTEROID_COUNT;
    const angle = t * Math.PI * 2 * 3;

    // Radio: pico en ~2.7 UA, con jitter
    const radiusJitter = (Math.random() - 0.5) * (OUTER_RADIUS_AU - INNER_RADIUS_AU);
    const radiusAu = midRadius + radiusJitter;
    const radius = radiusAu * AU_SCALE;

    const globalRotation = t * Math.PI * 50;
    const theta = angle + globalRotation + (Math.random() - 0.5) * 0.3;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    const y = (Math.random() - 0.5) * BELT_HALF_THICKNESS * AU_SCALE * 2;

    dummy.position.set(x, y, z);

    // Tamaño: muy pequeños la mayoría, unos pocos apenas mayores
    const big = Math.random() < 0.008;
    const scale = big ? 0.9 + Math.random() * 0.8 : 0.15 + Math.random() * 0.55;
    dummy.scale.setScalar(scale);

    dummy.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );

    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // Color oscuro y apagado (más sutil)
    const tone = Math.random();
    const gray = 0.15 + Math.random() * 0.2;
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
