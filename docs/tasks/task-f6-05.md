# TASK-F6-05 — Catálogo de componentes y estados

Estado: implementada el 17/10/2026 en la rama `feat/f6-05-component-catalog` (prompt P4), apilada sobre el PR #42 de F6-04 porque aún no está en `main`. Sigue la dirección visual aprobada el 15/10/2026 ([ADR-025](../decisions/adr-025-brand-palette.md)).

## Objetivo

Convertir Storybook en el catálogo oficial del sistema de diseño: bienvenida en español, secciones Fundamentos / Base / Dominio / Patrones / Pantallas, documentación de uso en cada componente y una matriz de estados por componente; impedir con `pnpm check` que un componente exportado quede sin historia o sin prueba, y llevar las matrices a la galería `ux:snapshots` con un índice filtrable.

## Entregables

| #   | Entregable                 | Resultado                                                                                                                                                                                                                                             |
| --- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Bienvenida                 | **Catálogo › Bienvenida** (`stories/bienvenida.mdx`): qué es ICE24 OS, cómo navegar, cómo revisar un componente y reglas comunes. Orden fijo de secciones en `.storybook/preview.ts`                                                                  |
| 2   | Documentación por historia | `componentDocs()` (`stories/catalog-kit.tsx`) en cada componente: sección de UI_UX, **Cuándo usar**, **Cuándo no usar**, **Accesibilidad** y **Textos recomendados**                                                                                  |
| 3   | Matriz de estados          | `StateMatrix` con ocho celdas obligatorias (normal, carga, vacío, error, permiso denegado, modo lectura, deshabilitado, foco); `na("motivo")` para los que no aplican. Historia `MatrizDeEstados` en los 20 archivos de componentes                   |
| 4   | Patrones                   | Formulario en modo lectura, lista con estados (y móvil), confirmación de acción sensible y conflicto de versión (`stories/patterns.stories.tsx`)                                                                                                      |
| 5   | Pantallas                  | Introducción (`stories/pantallas.mdx`: dónde ver las pantallas reales) y maqueta **Expediente de máquina** en escritorio y móvil                                                                                                                      |
| 6   | Iconos y feedback          | Historias nuevas para `Icon` (Base) y `TransitionFeedbackBanner` (Dominio), que no tenían                                                                                                                                                             |
| 7   | Regla automática           | `scripts/check-ui-catalog.mjs` (`pnpm check:catalog`, dentro de `pnpm check`): falla si un componente exportado por `@ice24/ui` no aparece en una historia o en una prueba, o si un archivo de historias no tiene la matriz. 39 componentes cubiertos |
| 8   | Galería                    | Secciones (Pantallas, Fundamentos, Componentes base, de dominio, Matrices de estados, Patrones), índice navegable y filtros por sección, pantalla o componente, tamaño y estado. Una ruta por matriz, descubierta del `index.json` de Storybook       |
| 9   | Documentación              | [Catálogo](../design-system/catalog.md), [guía de QA](../qa/phase-6/README.md#qué-deben-validar-en-p4-catálogo-de-componentes-y-estados), [estado](../backlog/phase-6-status.md)                                                                      |

## Decisiones

| Tema                       | Decisión                                                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework de Storybook     | Se confirma React + Vite. Las pantallas reales se revisan en la galería y el modo demo; Storybook solo tiene maquetas armadas con el catálogo                                     |
| Estados que no aplican     | Se muestran en la matriz con su motivo, no se omiten: el revisor ve que el caso se pensó                                                                                          |
| Foco en capturas           | La celda de foco dibuja el anillo de forma estática; con Tab se ve el real                                                                                                        |
| Qué cuenta como componente | Export en PascalCase como `function` o `const` (los `UPPER_CASE` son datos). Cubierto si se renderiza (`<Nombre`) o es el `component:` de una historia                            |
| Storybook publicado        | Artefacto `storybook-static` de CI (30 días). Se sirve con un comando de una línea porque los navegadores bloquean sus módulos desde `file://`; la galería sí abre con doble clic |

## Correcciones encontradas al documentar

- `StatusPanel` usaba el título como `id`: con espacios, `aria-labelledby` no nombraba nada. Ahora usa `useId()`.
- `RadioGroup` aplicaba `defaultValue` solo a las opciones de `options`; los `Radio` hijos lo ignoraban. El valor inicial viaja ahora por el contexto del grupo.

## Archivos

Nuevos: `packages/ui/src/stories/` (`bienvenida.mdx`, `pantallas.mdx`, `catalog-kit.tsx`, `catalog.css`, `patterns.stories.tsx`, `machine-file.stories.tsx`), `components/base/icon.stories.tsx`, `icon.test.tsx`, `components/domain/feedback.stories.tsx`, `status-panel.test.tsx`, `scripts/check-ui-catalog.mjs` y su prueba, `scripts/ux-snapshots/gallery.test.ts`, `docs/design-system/catalog.md`, este reporte.

Modificados: los 18 `*.stories.tsx` existentes (docs y matriz), `choice.tsx`, `status-panel.tsx`, pruebas de `choice`, `field`, `toast` y dominio; `.storybook/main.ts` y `preview.ts`; `scripts/ux-snapshots/gallery.ts` y `run.ts`; `tests/visual/ux-review.routes.ts`; `package.json` (`check:catalog`); `vitest.config.ts` (pruebas `scripts/**/*.test.ts`); `packages/ui/tsconfig.json` y `tsconfig.review.json`; documentación listada arriba.

## Pruebas

14 nuevas: el script de catálogo (detecta componentes y no constantes ni tipos, uso real y no por prefijo, reporta historia, prueba y matriz faltantes); la galería (una ruta por matriz, cada estado una vez en el filtro, agrupación por sección y etiquetas para filtrar); `StatusPanel` (región nombrada con título con espacios); `Icon` (decorativo sin etiqueta, imagen con ella, todo el juego de iconos); `RadioGroup` con `Radio` hijos; `Field` (etiqueta, ayuda y error asociados); `Toast` sin temporizador; `TransitionFeedbackBanner` (412 → «Actualizar», error → «Reintentar»). Todas con axe sin violaciones donde renderizan.

## Validación ejecutada

Entorno: Windows 11 Pro, Node 24.19.0, pnpm 11.24.0, Docker Desktop, Supabase CLI 2.115.0, Chromium de Playwright.

| Comando                                       | Resultado                                                                                                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                  | Código 0. Prettier, ESLint, typecheck y `typecheck:review`, fronteras, `check:colors` (131 archivos), `check:contrast` (86), `check:catalog` (39 componentes) y Vitest: 659 pruebas en 95 archivos |
| `pnpm build`                                  | Código 0; 14 de 14 tareas (también con `ICE24_STORAGE_ORIGIN` como CI)                                                                                                                             |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Código 0; 145 pruebas en 19 archivos. La corrida reescribe capturas de evidencia de Fase 5, que no forman parte de este cambio                                                                     |
| `pnpm ux:snapshots`                           | Código 0; 267 capturas (75 nuevas: 20 matrices y 5 historias de patrones y pantallas × 3 tamaños). Revisadas matrices de Button (escritorio) y MachineTriad (móvil)                                |
| `pnpm storybook:build`                        | Código 0; 106 historias y 29 páginas de documentación                                                                                                                                              |

## Riesgos y deuda

- La rama depende de #42: tras el merge, rebasar sobre `main` y cambiar la base del PR.
- `check:catalog` usa expresiones regulares, no el compilador: un componente exportado de otra forma (por ejemplo `export { X as Y }`) no se detectaría. Basta mientras `@ice24/ui` mantenga la convención documentada en el catálogo.
- La maqueta del expediente es una propuesta de jerarquía para la Fase 7, no una pantalla aprobada.
- Los fallos de axe en Storybook siguen como aviso (`a11y: todo`); F6-12 los convierte en gate.

## Checklist de revisión UX

**Cómo compartir el catálogo**: en el PR › **Checks** › **CI** › **Artifacts**:

- `ux-review-gallery`: descomprimir y abrir `index.html` con doble clic. Es lo más sencillo; trae las mismas matrices en imagen.
- `storybook-static`: descomprimir y, en esa carpeta, ejecutar `npx serve storybook-static` y abrir la dirección que muestra (los navegadores no abren Storybook con doble clic).

| Qué                   | Dónde                                                         | Qué revisar                                                                                                           |
| --------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Bienvenida            | Storybook › Catálogo › Bienvenida                             | Alguien que no conoce el proyecto entiende qué es ICE24 OS y cómo recorrer el catálogo                                |
| Matrices de estados   | Cada componente › **Matriz de estados**, o galería › Matrices | Los ocho estados se distinguen; las celdas «No aplica» tienen una razón convincente                                   |
| Docs de componentes   | Cada componente › **Docs**                                    | Los textos recomendados suenan a ICE24 (claros, sin tecnicismos); las reglas de «Cuándo no usar» son razonables       |
| Patrones              | Storybook › Patrones                                          | El formulario en modo lectura avisa antes de empezar; la confirmación dice qué se conserva; el conflicto exige motivo |
| Expediente de máquina | Storybook › Pantallas › Expediente de máquina (y Móvil)       | La jerarquía (identidad, tres estados, alerta fijada, pestañas) es la esperada para la Fase 7                         |
| Galería               | `index.html` › filtros                                        | Ej.: Tamaño «Móvil 375» + Estado «Cuenta en modo lectura» muestra solo eso; «Quitar filtros» vuelve a todo            |
