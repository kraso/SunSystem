/**
 * Cálculo astronómico puro de la posición del cielo (SIN three.js).
 *
 * Convierte RA/Dec (coordenadas ecuatoriales) a alt/az (horizontales) para
 * una latitud/longitud y fecha/hora dadas, usando tiempo sidéreo local.
 *
 * Fórmulas: Meeus, "Astronomical Algorithms".
 */

/** Días julianos desde una fecha (fórmula de Fliegel–Van Flandern). */
export function julianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d =
    date.getUTCDate() +
    (date.getUTCHours() +
      (date.getUTCMinutes() + date.getUTCSeconds() / 60) / 60) /
      24;

  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn =
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045;
  return jdn - 0.5;
}

/** Tiempo sidéreo medio de Greenwich (grados) para un día juliano. */
export function gmstDeg(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let deg =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  deg = ((deg % 360) + 360) % 360;
  return deg;
}

/** Tiempo sidéreo local (grados) dada longitud (positiva al este). */
export function localSiderealTimeDeg(jd: number, lonDeg: number): number {
  return (gmstDeg(jd) + lonDeg) % 360;
}

/**
 * Convierte RA/Dec ecuatoriales a alt/az horizontales.
 * @param raDeg  Ascensión recta en grados
 * @param decDeg Declinación en grados
 * @param latDeg Latitud del observador (positiva N)
 * @param lstDeg Tiempo sidéreo local en grados
 * @returns altitud (grados, >0 sobre horizonte) y azimut (grados, 0=N, 90=E)
 */
export function equatorialToHorizontal(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lstDeg: number,
): { altDeg: number; azDeg: number } {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const lst = (lstDeg * Math.PI) / 180;

  const ha = lst - ra; // ángulo horario

  const sinAlt = Math.sin(dec) * Math.sin(lat) +
    Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const cosAz =
    (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) /
    (Math.cos(alt) * Math.cos(lat));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(ha) > 0) az = 2 * Math.PI - az;

  return {
    altDeg: (alt * 180) / Math.PI,
    azDeg: (az * 180) / Math.PI,
  };
}

export interface SkyPosition {
  altDeg: number;
  azDeg: number;
  visible: boolean;
}

/** Calcula alt/az de un objeto para una fecha y lugar. */
export function getHorizonPos(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  date: Date,
): SkyPosition {
  const jd = julianDay(date);
  const lst = localSiderealTimeDeg(jd, lonDeg);
  const { altDeg, azDeg } = equatorialToHorizontal(raDeg, decDeg, latDeg, lst);
  return { altDeg, azDeg, visible: altDeg > 0 };
}
