import * as THREE from 'three';
import type { StarData, ConstellationData, DeepSkyData, ProvinceData } from '../core/types';
import { getHorizonPos } from '../core/sky';

const DOME_RADIUS = 400;

// Para algunas constelaciones el catálogo trae la figura completa (con patas
// muy largas) y el asterismo principal es más reconocible. En esos casos el
// planetario dibuja solo las lineas indicadas (indices sobre c.lines).
const ASTERISM_LINES: Record<string, number[]> = {
  "Osa Mayor": [0], // el Carro (Big Dipper), linea 0 = las 7 estrellas del cazo
};

function drawLinesOf(c: ConstellationData): number[][][] {
  const idx = ASTERISM_LINES[c.name as keyof typeof ASTERISM_LINES];
  if (idx) return idx.map((i) => c.lines[i]).filter(Boolean);
  return c.lines;
}

export interface SkyLabel {
  text: string;
  pos: THREE.Vector3;
}

interface PickResult {
  index: number;
  star: StarData;
  constellation: string | null;
}

/**
 * Cúpula celeste 3D: proyecta estrellas, constelaciones y objetos de cielo
 * profundo desde coordenadas alt/az a una esfera (domo). Expone las etiquetas
 * (constelaciones y objetos) como listas de posiciones 3D para que la UI las
 * pinte como HTML superpuesto. Incluye picking de estrellas al hover.
 */
export class Planetarium {
  readonly group: THREE.Group;
  private stars: StarData[];
  private constellations: ConstellationData[];
  private deepSky: DeepSkyData[];
  private starPoints!: THREE.Points;
  private constellationLines!: THREE.LineSegments;
  private deepSkyMarkers!: THREE.Group;
  private starToConstellation: Map<number, string> = new Map();
  private latDeg = 40.4168;
  private lonDeg = -3.7038;
  private date = new Date();
  private showDeepSky = true;
  private showConstLabels = true;
  private showObjLabels = true;
  constellationLabels: SkyLabel[] = [];
  objectLabels: SkyLabel[] = [];

  constructor(
    stars: StarData[],
    constellations: ConstellationData[],
    deepSky: DeepSkyData[],
  ) {
    this.stars = stars;
    this.constellations = constellations;
    this.deepSky = deepSky;
    this.group = new THREE.Group();
    this.buildStarConstellationMap();
    this.buildStars();
    this.buildConstellations();
    this.buildDeepSky();
    this.buildHorizon();
    this.update();
  }

  private buildStarConstellationMap(): void {
    const centroids: { name: string; v: THREE.Vector3 }[] = [];
    for (const c of this.constellations) {
      const acc = new THREE.Vector3();
      let n = 0;
      for (const line of c.lines) {
        for (const [ra, dec] of line) {
          acc.add(raDecToUnit(ra, dec));
          n++;
        }
      }
      if (n > 0) centroids.push({ name: c.name, v: acc.divideScalar(n).normalize() });
    }
    const cosThreshold = Math.cos((18 * Math.PI) / 180);
    for (const s of this.stars) {
      if (s.con) {
        this.starToConstellation.set(s.hip, s.con);
        continue;
      }
      const sv = raDecToUnit(s.ra, s.dec);
      let best: string | null = null;
      let bestDot = cosThreshold;
      for (const c of centroids) {
        const dot = sv.dot(c.v);
        if (dot > bestDot) {
          bestDot = dot;
          best = c.name;
        }
      }
      if (best) this.starToConstellation.set(s.hip, best);
    }
  }

  setProvince(p: ProvinceData): void {
    this.latDeg = p.lat;
    this.lonDeg = p.lon;
    this.update();
  }

  setDate(d: Date): void {
    this.date = d;
    this.update();
  }

  /** Altitud/azimut actuales de un objeto (RA/Dec) para la provincia y hora. */
  altAzFor(raDeg: number, decDeg: number): { altDeg: number; azDeg: number } {
    const hp = getHorizonPos(raDeg, decDeg, this.latDeg, this.lonDeg, this.date);
    return { altDeg: hp.altDeg, azDeg: hp.azDeg };
  }

  toggleLines(v: boolean): void {
    this.constellationLines.visible = v;
  }

  toggleDeepSky(v: boolean): void {
    this.showDeepSky = v;
    this.deepSkyMarkers.visible = v;
  }

  toggleConstellationLabels(v: boolean): void {
    this.showConstLabels = v;
    this.rebuildLabels();
  }

  toggleObjectLabels(v: boolean): void {
    this.showObjLabels = v;
    this.rebuildLabels();
  }

  private altAzToVec(altDeg: number, azDeg: number): THREE.Vector3 {
    const alt = (altDeg * Math.PI) / 180;
    const az = (azDeg * Math.PI) / 180;
    const r = DOME_RADIUS * Math.cos(alt);
    const y = DOME_RADIUS * Math.sin(alt);
    const x = r * Math.sin(az);
    const z = -r * Math.cos(az);
    return new THREE.Vector3(x, y, z);
  }

  private buildStars(): void {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.stars.length * 3);
    const col = new Float32Array(this.stars.length * 3);
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const bv = s.bv ? parseFloat(s.bv) : 0;
      const t = Math.max(-0.4, Math.min(2.0, bv));
      col[i * 3] = 0.6 + 0.4 * (t / 2);
      col[i * 3 + 1] = 0.7 - 0.1 * t;
      col[i * 3 + 2] = 1.0 - 0.4 * (t / 2);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
    });
    this.starPoints = new THREE.Points(geo, mat);
    this.group.add(this.starPoints);
  }

  private buildConstellations(): void {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.constellations.length * 64 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x4a6fa5,
      transparent: true,
      opacity: 0.5,
    });
    this.constellationLines = new THREE.LineSegments(geo, mat);
    this.group.add(this.constellationLines);
  }

  private buildDeepSky(): void {
    this.deepSkyMarkers = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(2.2, 3.2, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x88ffcc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    for (const o of this.deepSky) {
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.userData = o;
      this.deepSkyMarkers.add(ring);
    }
    this.group.add(this.deepSkyMarkers);
  }

  /** Línea de horizonte (círculo en alt=0), suelo y radios cardinales. */
  private buildHorizon(): void {
    const segs = 128;
    const pts: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const az = (i / segs) * Math.PI * 2;
      const v = this.altAzToVec(0, (az * 180) / Math.PI);
      pts.push(v.x, v.y, v.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x5fa8e0,
      transparent: true,
      opacity: 0.85,
    });
    this.group.add(new THREE.Line(geo, lineMat));

    // Suelo semitransparente bajo el horizonte (sensación de "estar en la Tierra")
    const floorGeo = new THREE.CircleGeometry(DOME_RADIUS, 96);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x0a1626,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.group.add(new THREE.Mesh(floorGeo, floorMat));
  }

  private update(): void {
    const pos = this.starPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const hp = getHorizonPos(s.ra, s.dec, this.latDeg, this.lonDeg, this.date);
      const v = this.altAzToVec(hp.altDeg, hp.azDeg);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;

    const segs: number[] = [];
    for (const c of this.constellations) {
      const lines = drawLinesOf(c);
      for (const line of lines) {
        for (let i = 0; i < line.length - 1; i++) {
          const ha = getHorizonPos(line[i][0], line[i][1], this.latDeg, this.lonDeg, this.date);
          const hb = getHorizonPos(line[i + 1][0], line[i + 1][1], this.latDeg, this.lonDeg, this.date);
          if (!ha.visible || !hb.visible) continue;
          const va = this.altAzToVec(ha.altDeg, ha.azDeg);
          const vb = this.altAzToVec(hb.altDeg, hb.azDeg);
          segs.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
        }
      }
    }
    const lgeo = this.constellationLines.geometry as THREE.BufferGeometry;
    lgeo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    lgeo.attributes.position.needsUpdate = true;
    lgeo.setDrawRange(0, segs.length / 3);

    let idx = 0;
    for (const o of this.deepSky) {
      const ring = this.deepSkyMarkers.children[idx++] as THREE.Mesh;
      const hp = getHorizonPos(o.ra, o.dec, this.latDeg, this.lonDeg, this.date);
      const v = this.altAzToVec(hp.altDeg, hp.azDeg);
      ring.position.copy(v);
      ring.visible = hp.visible && this.showDeepSky;
    }

    this.rebuildLabels();
  }

  private rebuildLabels(): void {
    this.constellationLabels = [];
    this.objectLabels = [];
    if (!this.showConstLabels && !this.showObjLabels) return;

    if (this.showConstLabels) {
      for (const c of this.constellations) {
        const lines = drawLinesOf(c);
        const pts: THREE.Vector3[] = [];
        for (const line of lines) {
          for (let i = 0; i < line.length - 1; i++) {
            const ha = getHorizonPos(line[i][0], line[i][1], this.latDeg, this.lonDeg, this.date);
            const hb = getHorizonPos(line[i + 1][0], line[i + 1][1], this.latDeg, this.lonDeg, this.date);
            if (ha.visible) pts.push(this.altAzToVec(ha.altDeg, ha.azDeg));
            if (hb.visible) pts.push(this.altAzToVec(hb.altDeg, hb.azDeg));
          }
        }
        if (pts.length === 0) continue;
        const mid = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length);
        this.constellationLabels.push({ text: c.name, pos: mid });
      }
    }

    if (this.showObjLabels) {
      for (const o of this.deepSky) {
        const hp = getHorizonPos(o.ra, o.dec, this.latDeg, this.lonDeg, this.date);
        if (!hp.visible) continue;
        const v = this.altAzToVec(hp.altDeg, hp.azDeg);
        const label = (o.name || o.desig || o.id) ?? o.id;
        this.objectLabels.push({ text: label, pos: v });
      }
    }
  }

  pickStar(raycaster: THREE.Raycaster): PickResult | null {
    const hits = raycaster.intersectObject(this.starPoints);
    if (hits.length === 0) return null;
    const index = hits[0].index;
    if (index === undefined) return null;
    const star = this.stars[index];
    return {
      index,
      star,
      constellation: this.starToConstellation.get(star.hip) ?? null,
    };
  }
}

/** Vector unitario 3D a partir de RA/Dec (convención: X=E, Y=up, Z=-N). */
function raDecToUnit(raDeg: number, decDeg: number): THREE.Vector3 {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const x = Math.cos(dec) * Math.sin(ra);
  const y = Math.sin(dec);
  const z = -Math.cos(dec) * Math.cos(ra);
  return new THREE.Vector3(x, y, z);
}
