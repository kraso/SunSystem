import * as THREE from 'three';
import type { CelestialBodyData } from '../core/types';
import { CelestialBody } from './celestial-body';
import { calculatePosition, getOrbitalElements } from '../core/orbit';
import { TimeManager } from '../core/time-manager';
import { AU_SCALE, MOON_AU_SCALE } from '../core/constants';
import { createStarfield } from './starfield';
import { createAsteroidBelt } from './asteroid-belt';
import { createOrbitLine } from './orbit-line';

/**
 * Orquestador: crea y gestiona todos los cuerpos celestes de la escena.
 */
export class SolarSystem {
  readonly scene: THREE.Scene;
  readonly timeManager: TimeManager;
  readonly textureLoader: THREE.TextureLoader;

  readonly bodies: Map<string, CelestialBody> = new Map();
  private _orderedBodies: CelestialBody[] = [];
  readonly sunOrbiters: CelestialBody[] = [];
  private _prevSimDays: number = 0;
  private _orbitLines: THREE.Object3D[] = [];

  constructor(timeManager: TimeManager) {
    this.scene = new THREE.Scene();
    this.timeManager = timeManager;
    this.textureLoader = new THREE.TextureLoader();
  }

  load(data: CelestialBodyData[]): void {
    for (const bodyData of data) {
      const body = new CelestialBody(bodyData, this.textureLoader);
      this.bodies.set(bodyData.name, body);
      if (bodyData.parent === null) {
        this.scene.add(body.orbitGroup);
      }
    }

    for (const bodyData of data) {
      const body = this.bodies.get(bodyData.name)!;
      if (bodyData.parent === null) continue;

      const parent = this.bodies.get(bodyData.parent);
      if (parent) {
        parent.orbitGroup.add(body.orbitGroup);
      } else {
        console.warn(`Padre '${bodyData.parent}' no encontrado para '${bodyData.name}'`);
        const sun = this.bodies.get('Sun');
        if (sun) sun.orbitGroup.add(body.orbitGroup);
      }

      if (bodyData.parent === 'Sun') {
        this.sunOrbiters.push(body);
        if (bodyData.semiMajorAxisAu > 0) {
          this.addOrbitLine(bodyData);
        }
      }
    }

    this._orderedBodies = Array.from(this.bodies.values());
    this.setupLighting();

    const asteroidBelt = createAsteroidBelt();
    this.scene.add(asteroidBelt);

    const starfield = createStarfield();
    this.scene.add(starfield);

    console.log(`Sistema solar cargado: ${this.bodies.size} cuerpos celestes`);
  }

  /** Añade línea orbital alineada con la inclinación real */
  private addOrbitLine(data: CelestialBodyData): void {
    const line = createOrbitLine(data.semiMajorAxisAu, data.eccentricity);

    // Grupo para rotar la línea según inclinación y nodo ascendente
    const rotGroup = new THREE.Group();
    const inclRad = (data.inclinationDeg * Math.PI) / 180;
    const nodeRad = (data.longitudeOfAscendingNodeDeg * Math.PI) / 180;

    rotGroup.rotation.x = inclRad;   // inclinación → tilt en X
    rotGroup.rotation.y = nodeRad;   // nodo ascendente → rotación en Y
    rotGroup.add(line);

    this.scene.add(rotGroup);
    this._orbitLines.push(rotGroup);
  }

  /** Muestra u oculta todas las líneas orbitales */
  setOrbitLinesVisible(visible: boolean): void {
    for (const line of this._orbitLines) {
      line.visible = visible;
    }
  }

  private setupLighting(): void {
    const sunLight = new THREE.PointLight(0xfff8e7, 200, 0, 0);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x1a1a3a, 2.0);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x8899cc, 0x080820, 1.0);
    this.scene.add(hemiLight);
  }

  update(): void {
    const daysSinceEpoch = this.timeManager.simDays;
    // Delta real de días simulados desde el frame anterior.
    // Es 0 cuando la simulación está pausada (simDays no avanza),
    // de modo que la rotación se detiene junto con la traslación.
    const deltaDays = Math.max(0, daysSinceEpoch - this._prevSimDays);
    this._prevSimDays = daysSinceEpoch;

    for (const body of this._orderedBodies) {
      const data = body.data;

      if (data.parent === null) {
        body.rotate(deltaDays);
        continue;
      }

      const elements = getOrbitalElements(data);
      const isMoon = data.parent !== 'Sun';
      const scale = isMoon ? MOON_AU_SCALE : AU_SCALE;
      const position = calculatePosition(elements, daysSinceEpoch, scale);

      body.updatePosition(position);
      body.rotate(deltaDays);
    }
  }

  getAllBodies(): CelestialBody[] {
    return this._orderedBodies;
  }

  getBody(name: string): CelestialBody | undefined {
    return this.bodies.get(name);
  }
}
