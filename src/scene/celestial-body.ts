import * as THREE from 'three';
import type { CelestialBodyData } from '../core/types';
import { createMaterial, loadTexture } from '../rendering/materials';
import { createSunTexture } from '../rendering/tex-sun';
import {
  createJupiterTexture,
  createSaturnTexture,
  createUranusTexture,
  createNeptuneTexture,
} from '../rendering/tex-gas-giants';
import {
  createEarthTexture,
  createMercuryTexture,
  createVenusTexture,
  createMarsTexture,
  createMoonTexture,
} from '../rendering/tex-terrestrial';
import { createIoTexture, createEuropaTexture } from '../rendering/tex-moons';

/**
 * Representa un cuerpo celeste en la escena 3D.
 *
 * Jerarquía de transformaciones:
 *   orbitGroup        ← movido por la órbita (position)
 *     └── tiltGroup   ← inclinación axial (rotation.x)
 *          └── mesh   ← esfera del planeta (rotateY para día/noche)
 *               └── ringsMesh / cloudMesh / glowMesh
 */
export class CelestialBody {
  readonly data: CelestialBodyData;
  readonly mesh: THREE.Mesh;
  readonly orbitGroup: THREE.Group;
  readonly tiltGroup: THREE.Group;

  ringsMesh?: THREE.Mesh;
  cloudMesh?: THREE.Mesh;
  glowMesh?: THREE.Mesh;

  private textureLoader: THREE.TextureLoader;
  readonly visualRadius: number;

  constructor(data: CelestialBodyData, textureLoader: THREE.TextureLoader) {
    this.data = data;
    this.textureLoader = textureLoader;
    this.visualRadius = data.displayRadius;

    // ── Geometría y material ──────────────────────────────────────
    const geometry = new THREE.SphereGeometry(this.visualRadius, 64, 64);
    const material = createMaterial(data);

    // Prioriza la foto REAL del archivo; solo cae a procedural si falta.
    const fileTex = loadTexture(textureLoader, data.textures.diffuse);
    if (fileTex) {
      (material as THREE.MeshStandardMaterial).map = fileTex;
    } else {
      const proceduralTex = this.getProceduralTexture(data.name);
      if (proceduralTex) {
        (material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial).map = proceduralTex;
      }
    }

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // ── Grupos de transformación ──────────────────────────────────
    // tiltGroup: aplica la inclinación axial del planeta
    this.tiltGroup = new THREE.Group();
    const axialTiltRad = (data.axialTiltDeg * Math.PI) / 180;
    this.tiltGroup.rotation.x = axialTiltRad;
    this.tiltGroup.add(this.mesh);

    // orbitGroup: posicionado por la órbita
    this.orbitGroup = new THREE.Group();
    this.orbitGroup.add(this.tiltGroup);

    // ── Efectos visuales ──────────────────────────────────────────
    if (data.type === 'star') {
      this.createGlow();
      this.createCorona();
    }

    if (data.rings) {
      this.createRings(data);
    }

    if (data.textures.clouds) {
      this.createCloudLayer(data.textures.clouds);
    }
  }

  /** Devuelve textura procedural según el nombre del cuerpo, o null */
  private getProceduralTexture(name: string): THREE.Texture | null {
    switch (name) {
      case 'Sun': return createSunTexture();
      case 'Mercury': return createMercuryTexture();
      case 'Venus': return createVenusTexture();
      case 'Earth': return createEarthTexture();
      case 'Moon': return createMoonTexture();
      case 'Mars': return createMarsTexture();
      case 'Jupiter': return createJupiterTexture();
      case 'Io': return createIoTexture();
      case 'Europa': return createEuropaTexture();
      case 'Saturn': return createSaturnTexture();
      case 'Uranus': return createUranusTexture();
      case 'Neptune': return createNeptuneTexture();
      default: return null;
    }
  }

  /** Crea el efecto de glow alrededor del Sol */
  private createGlow(): void {
    const glowGeometry = new THREE.SphereGeometry(this.visualRadius * 1.5, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(1.0, 0.55, 0.08) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vPosition = worldPos.xyz;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 uColor;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = 1.0 - abs(dot(viewDir, vNormal));
          fresnel = pow(fresnel, 2.5);
          float alpha = fresnel * 0.55;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(this.glowMesh);
  }

  /** Corona exterior más tenue del Sol */
  private createCorona(): void {
    const coronaGeometry = new THREE.SphereGeometry(this.visualRadius * 2.2, 32, 32);
    const coronaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(1.0, 0.4, 0.05) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vPosition = worldPos.xyz;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 uColor;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = 1.0 - abs(dot(viewDir, vNormal));
          fresnel = pow(fresnel, 4.0);
          float alpha = fresnel * 0.25;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    const coronaMesh = new THREE.Mesh(coronaGeometry, coronaMaterial);
    this.mesh.add(coronaMesh);
  }

  /** Crea anillos procedurales planos en XZ (el tiltGroup ya los inclina) */
  private createRings(data: CelestialBodyData): void {
    if (!data.rings) return;

    const innerR = (data.rings.innerRadiusKm / data.radiusKm) * this.visualRadius;
    const outerR = (data.rings.outerRadiusKm / data.radiusKm) * this.visualRadius;

    const ringGeometry = new THREE.RingGeometry(innerR, outerR, 128, 1);

    // UVs radiales: u = distancia normalizada al centro, v = ángulo.
    // Así la textura de anillos (bandas concéntricas) se aplica correctamente.
    const pos = ringGeometry.attributes.position;
    const uv = ringGeometry.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const radius = v3.length();
      const u = (radius - innerR) / (outerR - innerR);
      const v = (Math.atan2(v3.z, v3.x) + Math.PI) / (2 * Math.PI);
      uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;

    // Dejar el anillo plano en XZ (el tiltGroup ya aplica la inclinación axial)
    ringGeometry.rotateX(-Math.PI / 2);

    const ringTex = data.rings.texture
      ? loadTexture(this.textureLoader, data.rings.texture)
      : null;

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(
        data.rings.color[0] / 255,
        data.rings.color[1] / 255,
        data.rings.color[2] / 255,
      ),
      map: ringTex || undefined,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: data.rings.opacity,
      depthWrite: false,
    });

    this.ringsMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    // Los anillos van como hijos del mesh (sin tilt extra: el tiltGroup ya los inclina)
    this.mesh.add(this.ringsMesh);
  }

  /** Crea una capa de nubes ligeramente más grande que el planeta */
  private createCloudLayer(cloudPath: string): void {
    const cloudGeometry = new THREE.SphereGeometry(this.visualRadius * 1.01, 64, 64);
    const cloudTexture = loadTexture(this.textureLoader, cloudPath);

    const cloudMaterial = new THREE.MeshStandardMaterial({
      map: cloudTexture || undefined,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    this.cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    this.mesh.add(this.cloudMesh);
  }

  /** Actualiza la posición orbital */
  updatePosition(position: { x: number; y: number; z: number }): void {
    this.orbitGroup.position.set(position.x, position.y, position.z);
  }

  /**
   * Rota el planeta sobre su eje (Y local, ya inclinado por tiltGroup).
   */
  rotate(deltaDays: number): void {
    if (this.data.rotationPeriodHours === 0) return;
    const rotPerDay = (2 * Math.PI) / (this.data.rotationPeriodHours / 24);
    this.mesh.rotateY(rotPerDay * deltaDays);

    if (this.cloudMesh) {
      this.cloudMesh.rotateY(rotPerDay * deltaDays * 1.2);
    }
  }

  /** Obtiene la posición mundial del mesh */
  getWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.mesh.getWorldPosition(pos);
    return pos;
  }
}
