# Plan de Desarrollo — SunSystem: Simulación 3D del Sistema Solar

**Versión:** 1.0.0  
**Fecha:** Julio 2026  
**Stack elegido:** Three.js + TypeScript + Vite (Web)

---

## 1. Visión General

Simulación interactiva 3D del sistema solar en tiempo real que prioriza el realismo científico y el atractivo visual. Ejecutable en navegador web usando Three.js/WebGL, con datos astronómicos reales de NASA.

### Alcance inicial (MVP)
- Sol + 8 planetas con órbitas elípticas reales (leyes de Kepler)
- Luna terrestre y lunas principales de Júpiter y Saturno
- Anillos de Saturno procedurales
- Cinturón de asteroides
- Cámara orbital libre + fly-to en click
- Panel de datos por cuerpo celeste
- Control de velocidad de simulación (1s = 1 día / 1 mes / 1 año)
- Fondo estelar procedural + Vía Láctea
- Iluminación PBR + glow solar + sombras

### Alcance futuro (v2+)
- Planetas enanos (Plutón, Ceres, Eris)
- Tour guiado automático
- VR (WebXR)
- Audio espacial
- Modo "viaje en primera persona"

---

## 2. Stack Tecnológico

| Capa | Elección | Justificación |
|------|----------|---------------|
| **Motor 3D** | Three.js r160+ | Maduro, gran comunidad, WebGL/WebGPU, PBR nativo |
| **Lenguaje** | TypeScript 5.x | Tipado, mantenibilidad, tooling |
| **Bundler** | Vite 5 | HMR rápido, tree-shaking, optimizado para prod |
| **Física orbital** | Motor propio (Kepler) | Ligero, sin dependencias; las leyes de Kepler son cerradas |
| **UI** | HTML/CSS vanilla + canvas overlays | Simple, sin框架 adicional |
| **Texturas** | Solar System Scope / NASA Visible Earth | CC BY 4.0 o dominio público |
| **Testing** | Vitest | Nativo en ecosistema Vite |
| **CI/CD** | GitHub Actions → GitHub Pages | Gratuito, integrado |

### Dependencias runtime

```json
{
  "three": "^0.160.0",
  "lil-gui": "^0.19.0"
}
```

**Cero dependencias de framework UI.** Solo Three.js + un panel de debug (lil-gui).

---

## 3. Arquitectura del Software

```
SunSystem/
├── index.html                 # Entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
├── AGENTS.md                  # Reglas para agentes
│
├── src/
│   ├── main.ts                # Bootstrap: crea escena, cámara, renderer, loop
│   │
│   ├── core/                  # Motor de simulación
│   │   ├── constants.ts       # Constantes astronómicas (G, UA, masas, etc.)
│   │   ├── kepler.ts          # Solver de ecuaciones de Kepler
│   │   ├── orbit.ts           # Cálculo de posición orbital (x,y,z) dado tiempo
│   │   ├── time-manager.ts    # Control de tiempo simulado (Δt, speed, pause)
│   │   └── types.ts           # Interfaces: CelestialBody, OrbitalElements, etc.
│   │
│   ├── rendering/             # Capa de renderizado Three.js
│   │   ├── renderer.ts        # WebGLRenderer setup (LinearToneMapping, exposure 3.0)
│   │   ├── materials.ts       # Fábrica de materiales PBR por tipo de cuerpo
│   │   ├── tex-utils.ts       # Helpers compartidos (canvas → CanvasTexture, color utils)
│   │   ├── tex-sun.ts         # Textura procedural del Sol
│   │   ├── tex-gas-giants.ts  # Júpiter, Saturno, Urano, Neptuno
│   │   ├── tex-terrestrial.ts # Tierra, Mercurio, Venus, Marte, Luna
│   │   ├── tex-moons.ts       # Ío, Europa
│   │   └── starfield.ts       # Fondo estelar procedural
│   │
│   ├── scene/                 # Objetos de escena
│   │   ├── solar-system.ts    # Orquestador: crea todos los cuerpos
│   │   ├── celestial-body.ts  # Clase base: mesh + órbita + label
│   │   ├── sun.ts             # Sol: mesh emisivo + glow
│   │   ├── planet.ts          # Planeta: mesh PBR + rotación + anillos opcionales
│   │   ├── rings.ts           # Anillos de Saturno procedurales
│   │   ├── asteroid-belt.ts   # Cinturón de asteroides (instanced mesh)
│   │   ├── orbit-line.ts      # Línea de trayectoria orbital
│   │   └── starfield.ts       # Skybox estelar procedural
│   │
│   ├── camera/                # Sistema de cámara
│   │   ├── orbital-camera.ts  # Cámara orbital con zoom/pan/rotate
│   │   ├── fly-to.ts          # Animación de vuelo hacia un cuerpo
│   │   └── presets.ts         # Vistas predefinidas (top-down, edge-on, etc.)
│   │
│   ├── ui/                    # Interfaz de usuario
│   │   ├── hud.ts             # HUD principal (overlay HTML)
│   │   ├── info-panel.ts      # Panel de datos del cuerpo seleccionado
│   │   ├── time-controls.ts   # Slider y botones de velocidad
│   │   ├── labels.ts          # Etiquetas flotantes CSS sobre cuerpos
│   │   └── styles.css         # Estilos de la UI
│   │
│   ├── input/                 # Manejo de entrada
│   │   ├── mouse.ts           # Eventos de ratón (click, wheel, drag)
│   │   ├── keyboard.ts        # Atajos de teclado
│   │   ├── touch.ts           # Gestos táctiles (mobile)
│   │   └── raycaster.ts       # Raycasting para click en planetas
│   │
│   ├── data/                  # Datos astronómicos
│   │   └── celestial-bodies.json  # Parámetros orbitales y físicos reales
│   │
│   └── utils/                 # Utilidades
│       ├── math.ts            # Helpers: deg2rad, clamp, lerp
│       ├── loader.ts          # TextureLoader + cache
│       └── logger.ts          # Logger de debug
│
├── assets/                    # Recursos estáticos
│   └── textures/              # Texturas planetarias (no commiteadas; .gitignore)
│
├── tests/                     # Tests unitarios
│   ├── core/
│   │   ├── kepler.test.ts
│   │   └── orbit.test.ts
│   └── utils/
│       └── math.test.ts
│
└── docs/
    ├── plan.md                # Este documento
    ├── architecture.md        # Diagrama de arquitectura
    └── data-sources.md        # Fuentes de datos astronómicos
```

### Principios de diseño
- **Módulos < 200 líneas.** Si un archivo crece, se divide.
- **Funciones < 30 líneas, una sola responsabilidad.**
- **Nomenclatura:** camelCase para funciones/variables, PascalCase para clases.
- **Tipado estricto:** `strict: true` en tsconfig, sin `any` sin justificar.
- **Cero acoplamiento entre core/ y rendering/:** `core/` no importa Three.js.

---

## 4. Datos Astronómicos

### Estructura de datos (`CelestialBody`)

```typescript
interface CelestialBody {
  name: string;
  type: 'star' | 'terrestrial' | 'gas_giant' | 'ice_giant' | 'dwarf_planet' | 'moon';
  parent: string | null;               // Nombre del cuerpo padre (null = Sol)
  
  // Físicos
  radiusKm: number;                    // Radio ecuatorial en km
  massKg: number;                      // Masa en kg
  densityGcm3: number;                 // Densidad en g/cm³
  axialTiltDeg: number;                // Inclinación axial en grados
  rotationPeriodHours: number;         // Período de rotación en horas
  
  // Orbitales (relativos al padre)
  semiMajorAxisAu: number;             // Semieje mayor en UA
  eccentricity: number;                // Excentricidad (0 = circular)
  inclinationDeg: number;              // Inclinación orbital en grados
  longitudeOfAscendingNodeDeg: number; // Ω - Longitud del nodo ascendente
  argumentOfPeriapsisDeg: number;      // ω - Argumento del periastro
  meanAnomalyAtEpochDeg: number;       // M₀ - Anomalía media en época J2000
  orbitalPeriodDays: number;           // Período orbital en días terrestres
  
  // Visuales
  textures: {
    diffuse?: string;                  // Mapa de color/albedo
    normal?: string;                   // Mapa de normales
    specular?: string;                 // Mapa especular
    clouds?: string;                   // Capa de nubes (animada)
    emissive?: string;                 // Solo para el Sol
  };
  rings?: {
    innerRadiusKm: number;
    outerRadiusKm: number;
    color: [number, number, number];
    opacity: number;
  };
  atmosphereColor?: [number, number, number];
  color: [number, number, number];     // Color base (fallback sin texturas)
  
  // Visualización
  displayRadius: number;               // Radio en unidades de escena (escala artística)
  label: string;                       // Nombre mostrado en UI
  description: string;                 // Descripción corta para info-panel
  moons?: string[];                    // Nombres de lunas (referencia a otros bodies)
}
```

### Fuentes de datos
- NASA Planetary Fact Sheets: https://nssdc.gsfc.nasa.gov/planetary/factsheet/
- JPL Horizons (elementos orbitales J2000): https://ssd.jpl.nasa.gov/horizons/
- Texturas: Solar System Scope (CC BY 4.0), NASA Visible Earth (dominio público)

---

## 5. Motor de Simulación Orbital

### Algoritmo: Solución de la Ecuación de Kepler

Para cada cuerpo en cada frame:

1. **Calcular anomalía media** M = M₀ + n·(t - t₀), donde n = 2π/P
2. **Resolver ecuación de Kepler** M = E - e·sin(E) para E (anomalía excéntrica)
   - Método: Newton-Raphson (converge en <5 iteraciones para e < 0.25)
   - Fallback: iteración de punto fijo para altas excentricidades
3. **Calcular anomalía verdadera** ν:
   ```
   ν = 2 · atan2(√(1+e) · sin(E/2), √(1-e) · cos(E/2))
   ```
4. **Calcular distancia** r = a · (1 - e·cos(E))
5. **Posición en plano orbital:**
   ```
   x_orb = r · cos(ν)
   y_orb = r · sin(ν)
   z_orb = 0
   ```
6. **Rotar por argumento del periastro (ω), inclinación (i), y longitud del nodo (Ω):**
   ```
   R = Rz(-Ω) · Rx(-i) · Rz(-ω)
   pos = R · [x_orb, y_orb, z_orb]
   ```

### Escala en la escena
- **1 UA = 15 unidades de escena** (`AU_SCALE = 15`, ver `src/core/constants.ts`)
- **Radio solar:** escala logarítmica para visibilidad sin perder proporción
- **Radios planetarios:** multiplicados por factor 1000 respecto a la escala de distancias (escala artística)
- **Toggle "escala realista":** usar factores 1:1 (planetas diminutos, distancias enormes)

### Time Manager
```typescript
class TimeManager {
  private simTime: number;        // Tiempo simulado en días julianos desde J2000
  private speed: number;          // Días simulados por segundo real
  private paused: boolean;
  
  update(deltaSeconds: number): void;
  setSpeed(daysPerSecond: number): void;
  getSimulationDate(): Date;
}
```

---

## 6. Renderizado y Visuales

### Materiales PBR por tipo
| Tipo | MeshStandardMaterial params | Notas |
|------|---------------------------|-------|
| Estrella (Sol) | emissive + emissiveIntensity=2, roughness=0.9 | MeshBasicMaterial + glow shader aparte |
| Rocoso | roughness=0.8, metalness=0.1 | Sin metal; tierra/roca |
| Gaseoso | roughness=0.6, metalness=0.0 | Bandas atmosféricas via textura |
| Hielo | roughness=0.4, metalness=0.0 | Brillo sutil |
| Anillos | ShaderMaterial custom | Partículas con alpha y scattering |

### Iluminación
- **PointLight** en la posición del Sol (intensidad ~2, decay=2)
- **AmbientLight** tenue (intensidad 0.05) para que el lado oscuro no sea negro puro
- **No directional light adicional** — solo el Sol ilumina

### Post-procesado y tone mapping
- **Tone mapping:** `LinearToneMapping` con `toneMappingExposure = 3.0` (`src/rendering/renderer.ts`). Se eligió lineal en lugar de ACES Filmic porque realza la viveza de los colores de los cuerpos.
- **Bloom/glow solar:** el Sol usa `MeshBasicMaterial` (brillo propio, sin depender de luces) + una `glowMesh` adicional; no se usa `EffectComposer`/`UnrealBloomPass` para mantener el bundle ligero y evitar dependencias extra de post-procesado.
- **Anti-aliasing:** `antialias: true` en el `WebGLRenderer` (MSAA nativo).

### Fondo estelar
- Shader procedural (no skybox de 6 texturas)
- ~5000 estrellas con magnitudes variables (distribución Gaussiana de brillo)
- Vía Láctea como banda difusa (ruido Perlin + gradiente)
- Parallax sutil al rotar cámara

---

## 7. Interactividad

### Cámara Orbital
- **Rotación:** click izquierdo + arrastrar = órbita alrededor del punto focal
- **Zoom:** scroll wheel (con límites min/max)
- **Paneo:** click derecho + arrastrar (o Ctrl+arrastrar)
- **Punto focal:** cualquier cuerpo celeste

### Click en Planetas
- Raycaster sobre todos los meshes de cuerpos celestes
- Al detectar click: fly-to animation (3 segundos, easing easeInOutCubic)
- Se actualiza info-panel con datos del cuerpo

### Controles de Tiempo
- **Slider:** velocidad de simulación (0x a 1000x)
- **Botones predefinidos:** 1 día/s, 1 mes/s, 1 año/s, pausa
- **Atajos de teclado:** Space (pausa), + / - (acelerar/decelerar), 0 (reset)

### UI Layout
```
┌──────────────────────────────────────────────┐
│ [Logo] SunSystem              [Info Panel ▸] │ ← Top bar
├──────────────────────────────────────────────┤
│                                              │
│                                              │
│              VENTANA 3D                      │
│                                              │
│                                              │
├──────────────────────────────────────────────┤
│ [⏮] [⏸] [⏭]  Speed: ───●─── 2x   [Labels ✓]│ ← Bottom bar
└──────────────────────────────────────────────┘
```

---

## 8. Fases de Desarrollo

### Fase 1: MVP — Núcleo orbital + Sol + Tierra + Luna (Semana 1-2)
- [x] Estructura del proyecto (Vite + TS + Three.js)
- [ ] `src/data/celestial-bodies.json` con Sol + Tierra + Luna
- [ ] `src/core/kepler.ts`: solver de ecuación de Kepler
- [ ] `src/core/orbit.ts`: cálculo de posición 3D
- [ ] `src/core/time-manager.ts`: control de tiempo
- [ ] `src/scene/celestial-body.ts`: mesh esférico básico
- [ ] `src/scene/sun.ts`: Sol con PointLight
- [ ] `src/scene/solar-system.ts`: crea Sol + Tierra + Luna
- [ ] `src/camera/orbital-camera.ts`: cámara orbital básica
- [ ] `src/main.ts`: loop de render + update
- [ ] **Milestone:** Sol, Tierra y Luna orbitando con física real

### Fase 2: Sistema completo (Semana 3-4)
- [ ] Datos de los 8 planetas + lunas principales (Ío, Europa, Ganímedes, Calisto, Titán)
- [ ] `src/scene/asteroid-belt.ts`: cinturón de asteroides con instanced mesh
- [ ] `src/scene/rings.ts`: anillos de Saturno
- [ ] `src/scene/orbit-line.ts`: trayectorias orbitales visibles
- [ ] Inclinaciones axiales visibles (rotación del mesh)
- [ ] **Milestone:** Sistema solar completo visible con todas las órbitas

### Fase 3: Realismo visual (Semana 5-7)
- [ ] Carga de texturas HD (diffuse + normal) desde `assets/textures/`
- [ ] `src/rendering/materials.ts`: materiales PBR por tipo
- [ ] `src/rendering/shaders/sun-glow.ts`: shader de corona solar
- [ ] `src/rendering/post-processing.ts`: bloom + tonemapping
- [ ] Sombras básicas (solo Tierra-Luna para rendimiento)
- [ ] `src/scene/starfield.ts`: fondo estelar procedural
- [ ] **Milestone:** Simulación visualmente atractiva con texturas reales

### Fase 4: Interactividad (Semana 8-10)
- [ ] `src/input/raycaster.ts`: detección de click en cuerpos
- [ ] `src/camera/fly-to.ts`: animación de vuelo
- [ ] `src/ui/info-panel.ts`: panel lateral con datos
- [ ] `src/ui/time-controls.ts`: slider de velocidad
- [ ] `src/ui/labels.ts`: etiquetas CSS flotantes
- [ ] `src/input/keyboard.ts`: atajos de teclado
- [ ] `src/ui/styles.css`: diseño responsive
- [ ] **Milestone:** Experiencia interactiva completa

### Fase 5: Pulido y optimización (Semana 11-12)
- [ ] LOD: texturas de baja resolución para cuerpos lejanos
- [ ] Frustum culling (Three.js lo hace por defecto)
- [ ] Mobile responsive + touch controls
- [ ] Modo daltonismo (filtros CSS)
- [ ] Tests unitarios (`vitest`) para core/kepler y core/orbit
- [ ] `AGENTS.md` actualizado
- [ ] **Milestone:** Proyecto pulido, tested, documentado

### Fase 6: Extras (opcional, v2)
- [ ] Tour guiado automático
- [ ] Audio espacial (Web Audio API)
- [ ] WebXR / VR mode
- [ ] Modo "viaje en primera persona"

---

## 9. Rendimiento

### Targets
- **Desktop:** 60 FPS en GPU integrada (Intel UHD 620 o equivalente)
- **Mobile:** 30 FPS en Safari/Chrome iOS, Chrome Android
- **Draw calls:** < 100 por frame (instanced mesh para asteroides)
- **Memoria:** < 200 MB con texturas HD cargadas

### Estrategias
- Texturas progresivas: 2K base, 8K on-demand (al hacer zoom)
- InstancedMesh para cinturón de asteroides (~5000 asteroides en 1 draw call)
- Rings: shader procedural, no geometría de partículas
- Starfield: shader en fullscreen quad, no point sprites
- LOD implícito: los cuerpos lejanos ocupan pocos píxeles; Three.js los rasteriza eficientemente

---

## 10. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Carga de texturas HD lenta | Media | Medio | Carga progresiva + placeholder coloreado |
| Precisión numérica en órbitas lejanas (Neptuno) | Baja | Bajo | UA → unidades de escena manejables, double precision no necesaria |
| Rendimiento en móviles | Media | Alto | Detección de dispositivo → degradar texturas y post-procesado |
| Anillos de Saturno no se ven bien desde ciertos ángulos | Alta | Medio | Shader con alpha blending correcto; testear múltiples ángulos |
| Datos astronómicos incorrectos | Baja | Alto | Validar contra NASA Fact Sheets; incluir fuente en `data-sources.md` |

---

## 11. Estimación de Horas

| Fase | Horas estimadas |
|------|----------------|
| Fase 1: MVP | 30-40h |
| Fase 2: Sistema completo | 25-35h |
| Fase 3: Realismo visual | 35-45h |
| Fase 4: Interactividad | 25-35h |
| Fase 5: Pulido | 20-30h |
| **Total** | **135-185h** |

---

## 12. Diagrama de Componentes

Ver `docs/architecture.md` para el diagrama SVG detallado.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   main.ts   │────▶│ solar-system │────▶│ celestial-body  │
│  (bootstrap)│     │ (orquestador)│     │ (mesh + órbita) │
└──────┬──────┘     └──────┬───────┘     └────────┬────────┘
       │                   │                      │
       ▼                   ▼                      ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  renderer   │     │  time-manager│     │  kepler + orbit  │
│  + post-fx  │     │  (Δ simulado)│     │  (matemática)   │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                                        │
       ▼                                        ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  camera     │     │  input       │     │  ui / hud       │
│  orbital    │     │  mouse+keyb  │     │  info+tiempo    │
└─────────────┘     └──────────────┘     └─────────────────┘
```

---

*Plan generado según especificaciones del prompt de desarrollo.*
*Próximo paso: ejecutar Fase 1 — implementar MVP.*
