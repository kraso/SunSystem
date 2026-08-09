# SunSystem ☀️

Aplicación web 3D interactiva del Sistema Solar y la esfera celeste, con física
orbital realista, un planetario, cartas de constelaciones y un histórico de
misiones espaciales.

## Secciones de la aplicación

SunSystem se compone de varias páginas (multi-página Vite) accesibles desde la
barra superior:

- **Sistema Solar 3D** (`index.html`) — simulación principal con Three.js: Sol,
  8 planetas, Luna, 4 lunas galileanas de Júpiter y Titán, cinturón de
  asteroides y anillos de Saturno. Incluye:
  - *Panel de datos* (botón **Datos**): propiedades de cualquier cuerpo al hacer click.
  - *Luna* (botón **Luna**): panel con las fases de la Luna.
  - *Estadísticas* (botón **Estadísticas**): panel con datos estadísticos de los cuerpos.
  - Controles de tiempo (pausa, velocidad exponencial, líneas orbitales, etiquetas).
- **Planetario** (`planetario.html`) — cúpula celeste en vista de observador:
  estrellas, constelaciones y objetos de cielo profundo proyectados en la esfera.
  Permite elegir la provincia española (Madrid por defecto) para ajustar el horizonte.
- **Constelaciones** (`constelaciones.html`) — cartas de las 88 constelaciones con
  figura SVG editable (arrastrar estrellas + deslizador de expansión + restablecer)
  y un panel **Referencia real** con una foto de campo estelar de la constelación.
- **Misiones** (`misiones.html`) — histórico de misiones espaciales reales
  (tripuladas, no tripuladas y estaciones), ordenadas cronológicamente, con
  tripulación, objetivos, resultado, detalles y una foto propia de cada misión.
  Incluye la ISS y misiones fallidas. Buscador rápido por nombre, agencia o astronauta.

## Características

- **Física real:** órbitas elípticas con las leyes de Kepler (elementos orbitales NASA/JPL).
- **Sistema completo:** Sol + 8 planetas + Luna + lunas galileanas + Titán.
- **Cinturón de asteroides** procedural y **anillos de Saturno** con scattering.
- **Fondo estelar / cúpula:** ~2850 estrellas reales (catálogo HYG) + constelaciones + cielo profundo.
- **Iluminación PBR:** materiales físicamente correctos + glow solar.
- **Cámara orbital libre:** rotar, zoom, paneo, fly-to con click.
- **Planetario interactivo** con selección de localización (provincias de España).
- **Cartas de constelaciones editables** con referencia fotográfica real.
- **Histórico de misiones** con fotos y buscador.
- **Control de tiempo:** slider exponencial, pausa, atajos de teclado.

## Stack

| Capa | Tecnología |
|------|-----------|
| Motor 3D | Three.js r169 |
| Lenguaje | TypeScript 5 (strict) |
| Bundler | Vite 5 (multi-página) |
| Datos | JSON en `src/data/` |
| Texturas | Solar System Scope (CC BY 4.0) / NASA Visible Earth |

## Instalación

```bash
cd SunSystem
npm install
```

## Desarrollo

```bash
npm run dev        # Servidor de desarrollo (http://127.0.0.1:5173)
npm run build      # Build de producción
npm run preview    # Previsualizar build
npm test           # Tests unitarios (vitest)
npm run lint       # TypeCheck
```

## Controles (Sistema Solar 3D)

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
├── index.html              # Sistema Solar 3D (principal)
├── planetario.html         # Planetario (cúpula celeste)
├── constelaciones.html     # Cartas de constelaciones
├── misiones.html           # Histórico de misiones
├── src/
│   ├── main.ts             # Bootstrap de la simulación 3D
│   ├── planetario-app.ts   # Lógica del Planetario
│   ├── constelaciones-app.ts
│   ├── misiones-app.ts
│   ├── core/               # Motor de simulación (Kepler, órbitas, tiempo)
│   ├── rendering/          # Renderer WebGL + materiales PBR
│   ├── scene/              # Objetos de escena (cuerpos, anillos, estrellas)
│   ├── camera/             # Cámara orbital + observador
│   ├── input/              # Mouse, teclado, raycasting
│   ├── ui/                 # HUD, paneles (info, Luna, estadísticas), controles
│   ├── data/               # Datos astronómicos (JSON)
│   └── utils/              # Helpers matemáticos
├── assets/
│   ├── constellation-photos/     # Fotos de referencia de constelaciones (en repo)
│   ├── constellation-photos-v2/  # Banco reserva (NO se sube al repo, ver .gitignore)
│   ├── mission-photos/           # Fotos de las misiones (en repo)
│   ├── constellation-charts/     # Cartas SVG generadas
│   ├── photos/  textures/  videos/
├── scripts/                # Scripts de automatización (Python)
├── docs/                   # Documentación + plan de desarrollo
└── tests/                  # Tests unitarios
```

## Datos (`src/data/`)

Fuentes verificadas, sin hardcodear en el código:

- `celestial-bodies.json` — cuerpos del Sistema Solar (elementos orbitales NASA/JPL).
- `constellations.json` — líneas de las 88 constelaciones (catálogo IAU).
- `stars.json` — catálogo estelar HYG (Hipparcos) filtrado a magnitud ≤ 5.5.
- `constellation-info.json` — estrellas notables y objetos de cielo profundo por constelación.
- `deep-sky.json` — objetos de cielo profundo (galaxias, nebulosas, cúmulos).
- `eclipses.json` — datos de eclipses.
- `missions.json` — misiones espaciales (incluye `image` con la foto en `mission-photos/`).
- `spanish-provinces.json` — provincias de España para el Planetario.

## Scripts de automatización (`scripts/`)

Descarga y generación de datos desde fuentes abiertas:

- `gen_constellation_charts.py` — genera las cartas SVG de las constelaciones.
- `fetch_constellation_photos.py` — fotos de constelaciones desde NASA Images API.
- `fetch_commons_photos.py` — fotos de constelaciones desde Wikimedia Commons.
- `fetch_better_photos.py` — reemplaza fotos no válidas por campo estelar (NASA/Commons).
- `fetch_survey_photos.py` — campo estelar DSS2 por coordenadas (Aladin HiPS2FITS) para constelaciones sin astrofoto.
- `fetch_mission_photos.py` — fotos de cada misión desde Wikimedia Commons.
- `fetch_astro_photos.py` — fotos astronómicas generales (NASA).
- `process_sky_data.py` — procesado de datos de catálogos.

> Nota: `assets/constellation-photos-v2/` es un banco reserva y está excluido del
> repositorio en `.gitignore` (`assets/constellation-photos-v2/`).

## Texturas

Las texturas planetarias se descargan por separado. Fuentes recomendadas:
- [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0)
- [NASA Visible Earth](https://visibleearth.nasa.gov/) (dominio público)

Colocar en `assets/textures/` con los nombres esperados (ver `src/data/celestial-bodies.json`).
Sin texturas, los planetas se muestran con colores sólidos (funcionalidad completa, menos realismo).

## Licencia

MIT

<div style="text-align: left">
  <img src="assets/textures/sun.ico" width="350" height="350" >
</div>
