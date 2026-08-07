# Arquitectura de SunSystem

## Diagrama de Componentes

```
┌──────────────────────────────────────────────────────────────────────┐
│                          main.ts (bootstrap)                         │
│  Crea e interconecta todos los componentes                           │
└──────┬───────┬──────────┬──────────┬───────────┬────────────────────┘
       │       │          │          │           │
       ▼       ▼          ▼          ▼           ▼
┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────────────────┐
│ renderer │ │  camera  │ │  input │ │   ui   │ │    solar-system    │
│ WebGL    │ │ orbital  │ │ mouse  │ │  HUD   │ │   (orquestador)    │
│ + tonemap│ │ + fly-to │ │ + keyb │ │ + info │ └────────┬───────────┘
└──────────┘ └──────────┘ │ + ray  │ │ + time │          │
                          └────────┘ └────────┘          │
                                     ┌───────────────────┤
                                     ▼                   ▼
                              ┌────────────┐    ┌────────────────┐
                              │time-manager│    │ celestial-body │
                              │  Δt sim    │    │ mesh + órbita  │
                              └────────────┘    │ + anillos      │
                                                │ + glow (Sol)   │
                                                └───────┬────────┘
                                                        │
                                                        ▼
                                                ┌────────────────┐
                                                │  kepler + orbit│
                                                │  (matemática)  │
                                                └────────────────┘
```

## Flujo de Datos

```
1. main.ts → requestAnimationFrame loop
2. timeManager.update(deltaSeconds) → avanza simDays
3. solarSystem.update()
   └→ para cada CelestialBody:
      ├─ orbit.calculatePosition(elements, simDays) → {x, y, z}
      ├─ body.updatePosition(pos) → mueve orbitGroup
      └─ body.rotate(deltaDays) → gira sobre su eje
4. renderer.render(scene, camera) → frame a pantalla
```

## Jerarquía de la Escena

```
Scene
├── AmbientLight + HemisphereLight + PointLight (Sol)
├── Starfield (esfera invertida con shader)
│
└── Sol.orbitGroup
    ├── Sol.mesh (+ glowMesh)
    │
    ├── Mercury.orbitGroup → Mercury.mesh
    ├── Venus.orbitGroup   → Venus.mesh
    ├── Earth.orbitGroup   → Earth.mesh (+ cloudMesh)
    │   └── Moon.orbitGroup → Moon.mesh
    ├── Mars.orbitGroup    → Mars.mesh
    ├── Jupiter.orbitGroup → Jupiter.mesh
    │   ├── Io.orbitGroup      → Io.mesh
    │   ├── Europa.orbitGroup  → Europa.mesh
    │   ├── Ganymede.orbitGroup → Ganymede.mesh
    │   └── Callisto.orbitGroup → Callisto.mesh
    ├── Saturn.orbitGroup  → Saturn.mesh (+ ringsMesh)
    │   └── Titan.orbitGroup   → Titan.mesh
    ├── Uranus.orbitGroup  → Uranus.mesh
    └── Neptune.orbitGroup → Neptune.mesh
```

## Sistema de Coordenadas

- Plano XZ = eclíptica (plano orbital de referencia)
- Y positivo = norte celeste (arriba)
- Origen (0, 0, 0) = Sol
- 1 UA = 15 unidades de escena (AU_SCALE = 15, ver `src/core/constants.ts`)

## Datos Astronómicos

### Fuentes
- Elementos orbitales: JPL Horizons (época J2000.0)
- Parámetros físicos: NASA Planetary Fact Sheets
- Texturas: Solar System Scope (CC BY 4.0)

### Época de referencia
- J2000.0 = 1 de enero de 2000, 12:00 TT
- Día juliano: 2451545.0
- `timeManager.simDays = 0` corresponde a J2000.0
