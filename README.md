# SunSystem ☀️

Simulación 3D interactiva del Sistema Solar con física orbital realista.

## Características

- **Física real:** órbitas elípticas calculadas con las leyes de Kepler (elementos orbitales NASA/JPL)
- **Sistema completo:** Sol + 8 planetas + Luna + 4 lunas galileanas de Júpiter + Titán
- **Cinturón de asteroides** procedural entre Marte y Júpiter
- **Anillos de Saturno** con transparencia y scattering
- **Fondo estelar** procedural con ~5000 estrellas + Vía Láctea difusa
- **Iluminación PBR:** materiales físicamente correctos + glow solar
- **Cámara orbital libre:** rotar, zoom, paneo, volar hacia cuerpos con click
- **Panel de datos:** click en cualquier planeta/luna para ver sus propiedades
- **Control de tiempo:** slider exponencial, pausa, atajos de teclado

## Stack

| Capa | Tecnología |
|------|-----------|
| Motor 3D | Three.js r169 |
| Lenguaje | TypeScript 5 |
| Bundler | Vite 5 |
| Texturas | Solar System Scope (CC BY 4.0) |

## Instalación

```bash
cd SunSystem
npm install
```

## Desarrollo

```bash
npm run dev        # Servidor de desarrollo (http://localhost:3000)
npm run build      # Build de producción
npm run preview    # Previsualizar build
npm test           # Tests unitarios (vitest)
npm run lint       # TypeCheck
```

## Controles

| Acción | Tecla / Ratón |
|--------|---------------|
| Rotar cámara | Click izquierdo + arrastrar |
| Zoom | Rueda del ratón |
| Panear | Click derecho + arrastrar |
| Pausa / Reanudar | Espacio |
| Acelerar | + |
| Decelerar | - |
| Reset velocidad | 0 |
| Ver info del cuerpo | Click en el planeta/luna |

## Estructura del Proyecto

```
SunSystem/
├── src/
│   ├── core/           # Motor de simulación (Kepler, órbitas, tiempo)
│   ├── rendering/      # Renderer WebGL + materiales PBR
│   ├── scene/          # Objetos de escena (cuerpos, anillos, estrellas)
│   ├── camera/         # Cámara orbital + fly-to
│   ├── input/          # Mouse, teclado, raycasting
│   ├── ui/             # HUD, panel de info, controles de tiempo
│   ├── data/           # Datos astronómicos (JSON)
│   └── utils/          # Helpers matemáticos
├── assets/textures/    # Texturas planetarias (no incluidas en repo)
├── docs/               # Documentación + plan de desarrollo
└── tests/              # Tests unitarios
```

## Texturas

Las texturas deben descargarse por separado. Fuentes recomendadas:
- [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0)
- [NASA Visible Earth](https://visibleearth.nasa.gov/) (dominio público)

Colocar en `assets/textures/` con los nombres esperados (ver `src/data/celestial-bodies.json`).

Sin texturas, los planetas se muestran con colores sólidos (funcionalidad completa, menos realismo visual).

## Licencia

MIT
