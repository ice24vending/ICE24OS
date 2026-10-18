# Catálogo de componentes y estados de ICE24 OS

Estado: catálogo oficial desde el 17/10/2026 ([TASK-F6-05](../tasks/task-f6-05.md)). Storybook es la referencia del sistema de diseño: cada componente exportado por `@ice24/ui` tiene página de documentación, Playground con controles, **Matriz de estados** y prueba unitaria; `pnpm check` falla si falta alguna.

## Cómo abrirlo

| Forma                   | Cómo                                                                                                                                                                                                              | Para quién                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Artefacto del PR**    | En el PR › **Checks** › job `ux-review` › **Artifacts** › descargar `storybook-static`. Descomprimir y servir la carpeta (`npx http-server storybook-static` o `pnpm dlx serve storybook-static`) y abrir la URL. | Revisores sin el repositorio |
| **Local**               | `pnpm storybook` → http://localhost:6006                                                                                                                                                                          | Equipo de desarrollo         |
| **Compilado local**     | `pnpm storybook:build` → carpeta `storybook-static/` (se sirve igual que el artefacto)                                                                                                                            | Antes de subir un PR         |
| **Galería de capturas** | Artefacto `ux-review-gallery` del mismo job (o `pnpm ux:snapshots`) → abrir `index.html` con doble clic                                                                                                           | Revisión rápida sin servidor |

> Storybook compilado carga sus archivos con módulos de JavaScript, que los navegadores bloquean desde `file://`: por eso el artefacto se **sirve** con un comando de una línea. La galería, en cambio, es HTML plano y se abre con doble clic. El job de CI publica ambos artefactos durante 30 días (`.github/workflows/ci.yml`, job `ux-review`).

## Estructura

| Sección                   | Contenido                                                                                                                                                                                                                        | Documentación                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Catálogo › Bienvenida** | Qué es ICE24 OS, cómo navegar, cómo revisar un componente y reglas comunes                                                                                                                                                       | `packages/ui/src/stories/bienvenida.mdx`       |
| **Fundamentos**           | Colores, contraste, tipografía, espaciado, radios, breakpoints, elevación y movimiento                                                                                                                                           | [Tokens](tokens.md)                            |
| **Base**                  | Button, campos (TextField, TextArea, Select, DateField, Field), selección (Checkbox, RadioGroup/Radio, Switch), Table/EmptyState, Card, StatusTag/Badge, Banner, Dialog, Toast, Tabs, navegación, Iconos, StatusPanel (heredado) | [Componentes base](components/base.md)         |
| **Dominio**               | MachineTriad, CriticalAlert, Comparator, SyncStatus, ReadOnlyBanner/Indicator, JobStatus, TransitionFeedbackBanner                                                                                                               | [Componentes de dominio](components/domain.md) |
| **Patrones**              | Formulario en modo lectura, lista con estados, confirmación de acción sensible, conflicto de sincronización                                                                                                                      | `packages/ui/src/stories/patterns.stories.tsx` |
| **Pantallas**             | Dónde revisar las pantallas reales (galería y modo demo) y maquetas armadas con el catálogo: **Expediente de máquina**                                                                                                           | `packages/ui/src/stories/pantallas.mdx`        |

## Qué tiene cada página de componente

1. **Docs**: resumen con la sección de UI_UX que implementa y cuatro apartados fijos — **Cuándo usar**, **Cuándo no usar**, **Accesibilidad** y **Textos recomendados** (`componentDocs()` de `packages/ui/src/stories/catalog-kit.tsx`).
2. **Playground**: controles (`args`) para manipular textos, variantes y estados.
3. **Historias de estados** y **Móvil** (viewport de 375 px).
4. **Matriz de estados** (`MatrizDeEstados`): los ocho estados en una sola vista — normal, carga, vacío, error, permiso denegado, modo lectura, deshabilitado y foco. `StateMatrix` exige las ocho celdas por tipo; un estado que no aplica se declara con `na("motivo")` y se muestra así. La celda de foco dibuja el anillo de foco de forma estática para las capturas (con Tab se ve el real).

## Reglas automáticas

| Regla                                                                                        | Dónde                                                                  |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Cada componente exportado por `@ice24/ui` se renderiza en al menos una historia y una prueba | `pnpm check:catalog` (`scripts/check-ui-catalog.mjs`), en `pnpm check` |
| Cada archivo de historias de componentes exporta `MatrizDeEstados`                           | Mismo script                                                           |
| La galería incluye una ruta por cada matriz, descubierta desde el índice de Storybook        | `matrixRoutes()` en `tests/visual/ux-review.routes.ts`                 |
| Sin colores literales y 86 combinaciones de contraste AA                                     | `pnpm check:colors`, `pnpm check:contrast`                             |
| axe sin violaciones en las pruebas de componentes                                            | `expectNoAxeViolations()` en `*.test.tsx`                              |

Un componente se considera tal si se exporta con nombre en PascalCase como `function` o `const` (los `UPPER_CASE` son datos). Cuenta como cubierto si aparece renderizado (`<Nombre`) o como `component:` de una historia.

## Cómo agregar un componente

1. Implementarlo en `packages/ui/src/components/{base|domain}` con sus estados y exportarlo desde el `index.ts` de su carpeta.
2. Historias en `<componente>.stories.tsx` con `title: "Base/…"` o `"Dominio/…"`, `parameters.docs.description.component: componentDocs({...})`, Playground y `MatrizDeEstados`.
3. Prueba con Testing Library y `expectNoAxeViolations()`.
4. Documentarlo en `components/base.md` o `components/domain.md`.
5. `pnpm check` lo verifica; `pnpm ux:snapshots` agrega su matriz a la galería sin más cambios.

## Galería de capturas

`pnpm ux:snapshots` genera `docs/qa/phase-6/ux-review/index.html`: secciones **Pantallas**, **Fundamentos**, **Componentes base**, **Componentes de dominio**, **Matrices de estados** y **Patrones**, con un índice navegable y filtros por sección, pantalla o componente, tamaño (Móvil 375, Tableta 768, Escritorio 1280) y estado (normal, modo lectura, error, sin conexión, carga, sin permiso…). Funciona sin servidor y, sin JavaScript, muestra todo.
