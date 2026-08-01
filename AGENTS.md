# AGENTS.md — SunSystem

## Contexto del Sistema

| Parámetro | Valor |
|-----------|-------|
| Lenguaje | TypeScript 5 (strict mode) |
| Runtime | Navegador (Vite + Three.js) |
| Tests | Vitest |
| Estilo | camelCase vars/funcs, PascalCase clases |
| Módulos | <200 líneas c/u |

## Reglas Específicas del Proyecto

1. **Separación estricta:** `core/` no importa Three.js. Solo matemática pura.
2. **Tipos explícitos:** no usar `any`. Interfaces definidas en `core/types.ts`.
3. **Funciones <30 líneas**, una sola responsabilidad.
4. **Unidades:** todo en `core/` usa SI (metros, kg, segundos) o UA. La conversión a unidades de escena ocurre en `scene/`.
5. **Datos astronómicos:** fuente única en `src/data/celestial-bodies.json`. No hardcodear valores en el código.
6. **Texturas opcionales:** el sistema debe funcionar con colores sólidos si no hay texturas.
7. **Idioma:** código en inglés, UI en español.

## Decisiones de Arquitectura

- **Sin framework UI:** HTML/CSS vanilla para HUD. Three.js para el resto.
- **Sin post-procesado pesado en MVP:** bloom y tonemapping son built-in de Three.js (sin EffectComposer externo).
- **Órbitas calculadas por frame:** sin precomputar (permite cambiar velocidad en runtime).
- **Escala artística:** planetas 1000× más grandes que la escala real respecto a distancias.

## Flujo de Trabajo

```
1. npm run dev        → Ver cambios en caliente
2. npm run lint       → TypeCheck antes de commit
3. npm test           → Tests unitarios
4. npm run build      → Verificar que build funciona
```

## Restricciones

- NO añadir dependencias sin justificar en el plan
- NO modificar tsconfig.json sin discutir
- NO crear archivos de documentación extras sin pedirlo
- PRESERVAR estilo existente al editar
