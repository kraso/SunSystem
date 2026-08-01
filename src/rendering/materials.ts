import * as THREE from 'three';
import type { CelestialBodyData } from '../core/types';
import { normalizeColor } from '../utils/math';

/**
 * Fábrica de materiales según el tipo de cuerpo celeste.
 *
 * - Estrella (Sol): MeshBasicMaterial — siempre a pleno brillo, no depende de luces.
 * - Planetas/lunas: MeshStandardMaterial PBR con roughness variable.
 */
export function createMaterial(body: CelestialBodyData): THREE.Material {
  const color = new THREE.Color(...normalizeColor(body.color));

  switch (body.type) {
    case 'star':
      // Sol: MeshBasicMaterial para que brille con luz propia SIEMPRE
      return new THREE.MeshBasicMaterial({ color });

    case 'terrestrial':
    case 'moon':
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.02,
      });

    case 'gas_giant':
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.0,
      });

    case 'ice_giant':
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.25,
        metalness: 0.0,
      });

    case 'dwarf_planet':
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.6,
        metalness: 0.03,
      });

    default:
      return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05 });
  }
}

/** Carga una textura desde archivo. Null si no existe. */
export function loadTexture(
  loader: THREE.TextureLoader,
  path: string | undefined,
): THREE.Texture | null {
  if (!path) return null;
  try {
    const texture = loader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  } catch {
    console.warn(`No se pudo cargar la textura: ${path}`);
    return null;
  }
}
