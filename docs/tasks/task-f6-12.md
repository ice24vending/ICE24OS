# TASK-F6-12 — Pruebas automáticas de accesibilidad y regresión visual

Estado: implementada el 23/10/2026 en la rama `feat/f6-12-ui-quality-gate` (prompt P9). Depende de TASK-F6-03, TASK-F6-04 y TASK-F6-06. Usa la lista de pantallas de F6-00 a F6-11 (`tests/visual/ux-review.routes.ts`) y el Storybook de F6-05.

## Objetivo

Un quality gate de componentes y pantallas en cada PR: cero violaciones serias o críticas de WCAG 2.2 AA, recorridos de teclado del shell, diálogos y formularios, y cambios visuales que se detectan y requieren aprobación UX. Sin ampliar el alcance del PRD.

## Entregables

| #   | Entregable                   | Resultado                                                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Accesibilidad de pantallas   | `tests/e2e/accessibility/screens.spec.ts`: axe (`@axe-core/playwright` 4.13.0, etiquetas WCAG 2.0/2.1/2.2 A y AA) en cada ruta y estado de la galería, a 375 y 1280 px                                                                                                                                                                                  |
| 2   | Accesibilidad de componentes | `tests/e2e/accessibility/stories.spec.ts`: axe en cada historia del Storybook compilado. Sustituye al test-runner de Storybook con la misma herramienta y el mismo reporte; el panel Accessibility de Storybook pasa de `todo` a `error`                                                                                                                |
| 3   | Teclado                      | `tests/e2e/accessibility/keyboard.spec.ts`: «Ir al contenido», menú completo con foco visible, drawer de tableta, selector de contexto (foco atrapado, Escape, foco devuelto), diálogo de cambios no guardados, errores del flujo por pasos y filtros de Auditoría                                                                                      |
| 4   | Regresión visual             | `tests/visual/screens.visual.ts`: `toHaveScreenshot` de página completa en ruta × estado × 375/768/1280 px, más fundamentos y matrices de Storybook. Baselines en `tests/visual/__screenshots__`                                                                                                                                                        |
| 5   | Sin falsos positivos         | Reloj congelado en el mismo instante en el servidor (`scripts/ui-quality/frozen-clock.mjs`, cargado con `NODE_OPTIONS=--import` solo por `pnpm test:ui`) y en el navegador (`page.clock.setFixedTime`); zona `America/Mexico_City`; animaciones desactivadas; espera a `document.fonts.ready`; indicador de Next oculto (`tests/visual/screenshot.css`) |
| 6   | Mismo entorno que CI         | Baselines generadas en `mcr.microsoft.com/playwright:v1.62.1-noble`. `pnpm test:ui` usa Docker fuera de Linux (`scripts/ui-quality/{run.mjs,container.sh}`); el job de CI corre en el mismo contenedor                                                                                                                                                  |
| 7   | Scripts                      | `pnpm test:ui` (accesibilidad + visual) y `pnpm test:ui:update` (regenera baselines). `playwright.config.ts` en la raíz levanta la web en modo demo y el Storybook estático                                                                                                                                                                             |
| 8   | CI                           | `.github/workflows/ui-quality.yml`, job `ui-quality`: `test:ui`, `ux:snapshots` y `storybook:build`; artefactos `playwright-report` (con diffs), `ux-review-gallery` y `storybook-static`. El job `ux-review` de `ci.yml` se integra aquí                                                                                                               |
| 9   | Correcciones                 | Panel Demo encima de la barra inferior (`target-size`); encabezado vacío de `Table` en tarjetas (`aria-required-children`); muestras de controles de la historia Contraste (`color-contrast`)                                                                                                                                                           |
| 10  | Documentación                | [Quality gate de interfaz](../qa/phase-6/ui-quality.md) (cómo correr, actualizar baselines, aprobación UX, cómo leer un diff, protección de rama), [excepciones](../qa/phase-6/a11y-exceptions.md), [QA de Fase 6](../qa/phase-6/README.md), [catálogo](../design-system/catalog.md), estado                                                            |

## Decisiones

- **Una sola lista para todo.** La galería, axe y la regresión visual leen `ux-review.routes.ts` y preparan cada estado con el mismo código (`tests/visual/review-page.ts`, extraído de `scripts/ux-snapshots/run.ts`). Una pantalla nueva entra en las tres sin tocar las pruebas.
- **Playwright en lugar del test-runner de Storybook.** El test-runner usa Jest y otro runtime de Playwright. Recorrer `storybook-static/index.json` con el mismo `AxeBuilder` da la misma cobertura, un solo reporte y un solo navegador. El complemento de accesibilidad de Storybook también ejecuta axe dentro de cada historia; si las dos ejecuciones chocan, la prueba reintenta.
- **Solo violaciones serias y críticas fallan el check**, como pide la tarea. Las moderadas y menores siguen visibles en el panel de Storybook.
- **Accesibilidad a 375 y 1280 px.** La tableta comparte el marcado de uno u otro tamaño; la regresión visual sí cubre los tres.
- **`next dev` en modo demo.** El modo demo está bloqueado en compilaciones de producción por diseño (F6-00), así que el gate usa el mismo servidor que la galería. La primera compilación de cada ruta es lenta; `retries: 1` la absorbe, y una regresión real falla dos veces.
- **Baselines en git, sin LFS.** Son unos 460 PNG (~45 MB). Con LFS, las descargas de cada corrida de CI agotarían la cuota gratuita de transferencia de GitHub en pocos días.
- **El reloj se congela fuera del producto.** Congelar solo el navegador provocaba errores de hidratación: el servidor calculaba «hace N min» con la hora real. Un preload que fija `Date` en el proceso de `next dev` iguala servidor y navegador sin tocar el código de la app; los temporizadores siguen corriendo.
- **Tolerancia `maxDiffPixelRatio: 0.001`.** Con el mismo contenedor, el ruido de suavizado es casi nulo; un cambio real mueve mucho más que una milésima de los píxeles.

## Archivos

- Nuevos: `playwright.config.ts`; `.github/workflows/ui-quality.yml`; `scripts/ui-quality/{run.mjs,container.sh,serve-static.mjs,frozen-clock.mjs}`; `tests/e2e/accessibility/{axe.ts,screens.spec.ts,stories.spec.ts,keyboard.spec.ts}`; `tests/visual/{review-page.ts,screens.visual.ts,screenshot.css}`; `tests/visual/__screenshots__/*.png`; `docs/qa/phase-6/{ui-quality.md,a11y-exceptions.md}`; este reporte.
- Modificados: `package.json` y `pnpm-lock.yaml` (`@playwright/test` 1.62.1, `@axe-core/playwright` 4.13.0, scripts `test:ui` y `test:ui:update`); `.github/workflows/ci.yml` (sin `ux-review`); `.storybook/preview.ts` (`a11y.test: "error"`); `scripts/ux-snapshots/run.ts` (usa `review-page.ts`); `tsconfig.review.json`; `apps/private-web/src/features/demo/demo-panel.css`; `packages/ui/src/components/base/base.css`; `packages/ui/src/foundations/foundation-kit.tsx`; `docs/design-system/catalog.md`; `docs/qa/phase-6/README.md`; `docs/backlog/phase-6-status.md`.

## Requisitos cubiertos

TASK-F6-12 (quality gate de componentes; carga, vacío, error, permiso denegado y modo lectura en los breakpoints definidos; teclado y WCAG 2.2 AA; pruebas en CI; evidencia responsive y visual); UI_UX §8.6 (contraste y foco), §10 (shell), §19 (accesibilidad); WCAG 2.2 AA, incluidos 1.4.3, 2.1.1, 2.1.2, 2.4.1, 2.4.3, 2.4.7 y 2.5.8.

## Validación

Comandos ejecutados el 23/10/2026 en Windows 11 con Node 24.19, Docker Desktop 29.7.2 y `mcr.microsoft.com/playwright:v1.62.1-noble`:

| Comando                                       | Resultado                                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`                                  | Pasa: formato, lint, tipos, límites, infraestructura, identidad, colores, contraste, catálogo (48 componentes) y 774 pruebas unitarias                                                           |
| `pnpm build`                                  | Pasa (14 tareas)                                                                                                                                                                                 |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Pasa: 19 archivos, 151 pruebas (web compilada con `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329`, como en CI)                                                                                     |
| `pnpm test:ui`                                | Pasa en el contenedor: 793 pruebas en 16.6 min, sin reintentos. Accesibilidad: 186 estados de pantalla (375 y 1280 px), 141 historias y 7 recorridos de teclado. Visual: 459 capturas comparadas |
| `pnpm ux:snapshots`                           | Pasa: 459 capturas sin observaciones; ahora prepara cada estado con `tests/visual/review-page.ts`, igual que el gate                                                                             |

Las baselines se generaron con `pnpm test:ui:update` y se verificaron con una corrida limpia de `pnpm test:ui`. La primera verificación encontró el folio aleatorio de «sin permiso por URL» (4 capturas); ahora se enmascara.

## Riesgos y deuda

- **Tiempo de CI.** El job recorre unas 1 400 páginas (axe, visual y galería) con `next dev`; el límite es de 60 minutos. Si crece mucho, conviene repartir rutas entre varios jobs (`--shard`).
- **Peso del repositorio.** Cada cambio visual intencional reescribe PNG. Hay que revisar en el PR que solo cambien las baselines esperadas.
- **`next dev` y no la compilación de producción.** El gate no detecta diferencias que solo aparezcan en producción. Las pruebas de integración (`ci.yml`) sí corren sobre la web compilada.
- **Docker en las máquinas de desarrollo.** `pnpm test:ui` fuera de Linux necesita Docker Desktop; la primera corrida descarga la imagen, Node y las dependencias.
- **La aprobación UX es humana.** Con las baselines nuevas en el PR, el check pasa en verde. La regla de que solo se integra con la aprobación de UX la sostienen la revisión del PR y la protección de rama (revisión obligatoria).

## Validación manual pendiente

- Marcar `ui-quality` como check requerido en la regla de `main` y quitar `ux-review` si estaba requerido ([protección de rama](../qa/phase-6/ui-quality.md#protección-de-rama)).
- Primera revisión de un diff visual por Producto/UX con la guía de [ui-quality.md](../qa/phase-6/ui-quality.md#cómo-leer-un-diff-visual).
