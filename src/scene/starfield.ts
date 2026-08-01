import * as THREE from 'three';

/**
 * Shader de fondo estelar procedural.
 *
 * Genera un skybox con ~5000 estrellas de brillo variable
 * y una banda difusa simulando la Vía Láctea.
 */

const vertexShader = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vDirection;

  // Ruido pseudoaleatorio
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  // Ruido de Perlin simplificado para la Vía Láctea
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(
        mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );
  }

  void main() {
    vec3 dir = normalize(vDirection);

    // --- Estrellas ---
    // Dividir el cielo en celdas
    float scale = 64.0;
    vec3 cell = floor(dir * scale);
    vec3 local = fract(dir * scale);

    float starBrightness = 0.0;
    vec3 starColor = vec3(0.0);

    // Muestrear celdas vecinas para estrellas suaves
    for (int dx = -1; dx <= 1; dx++) {
      for (int dy = -1; dy <= 1; dy++) {
        for (int dz = -1; dz <= 1; dz++) {
          vec3 neighbor = cell + vec3(float(dx), float(dy), float(dz));
          float h = hash(neighbor);

          // Solo algunas celdas tienen estrella (umbral de densidad)
          if (h > 0.998) {
            vec3 starPos = neighbor + vec3(
              hash(neighbor + vec3(0.1, 0.0, 0.0)),
              hash(neighbor + vec3(0.0, 0.1, 0.0)),
              hash(neighbor + vec3(0.0, 0.0, 0.1))
            );

            vec3 delta = starPos - (cell + local);
            float dist = length(delta) * scale;

            // Tamaño de la estrella: varía por magnitud
            float mag = hash(neighbor + vec3(0.5));
            float size = 0.002 + mag * 0.008;
            float glow = exp(-dist * dist / (size * size));

            // Color de la estrella: varía entre azul, blanco y amarillo
            float colorVar = hash(neighbor + vec3(0.3));
            vec3 col = mix(
              vec3(0.7, 0.8, 1.0),  // Azul
              mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.85, 0.6), colorVar), // Blanco → Amarillo
              mag
            );

            starBrightness += glow * (0.5 + mag * 0.5);
            starColor += col * glow * (0.5 + mag * 0.5);
          }
        }
      }
    }

    // --- Vía Láctea (banda difusa) ---
    float galacticLat = abs(dir.y * 0.8 + dir.z * 0.2); // Simplificación
    float milkyWay = exp(-galacticLat * 6.0) * 0.08;

    // Añadir estructura filamentosa con ruido
    float detail = noise(dir * 20.0) * 0.5 + 0.5;
    milkyWay *= 0.5 + detail * 0.5;

    vec3 milkyColor = vec3(0.15, 0.12, 0.2) * milkyWay;

    // --- Composición final ---
    vec3 finalColor = starColor + milkyColor;
    finalColor = clamp(finalColor, 0.0, 1.0);

    // Luz ambiental muy tenue
    finalColor += vec3(0.005, 0.005, 0.008);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Crea una esfera invertida con shader de estrellas procedural.
 * Se coloca como skybox de la escena.
 */
export function createStarfield(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(500, 32, 32);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
}
