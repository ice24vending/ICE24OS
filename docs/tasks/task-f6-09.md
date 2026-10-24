# TASK-F6-09 — Layouts de lista, detalle, wizard, dashboard y pantalla móvil operativa

Estado: implementada el 22/10/2026 en la rama `feat/f6-09-10-layouts-states` (prompt P7, junto con [TASK-F6-10](task-f6-10.md)). Depende de TASK-F6-03 (componentes base) y TASK-F6-06 (shell).

## Objetivo

Plantillas de pantalla reutilizables, con todos los estados y responsive, sin ampliar el alcance del PRD: las pantallas de ejemplo existen solo en modo demo.

## Entregables

| #   | Entregable         | Resultado                                                                                                                                                                                                       |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Layouts            | `packages/ui/src/patterns/layouts`: `PageHeader`, `ListLayout`, `DetailLayout`, `WizardLayout`, `DashboardLayout` + `KpiCard` y `MobileOperationalLayout`, exportados por `@ice24/ui`                           |
| 2   | Estados en layouts | Cada layout acepta `status` (un `SystemState` de F6-10 que reemplaza el contenido y conserva encabezado, filtros y acciones) y `banner` (avisos que conviven con el contenido)                                  |
| 3   | Pantalla de campo  | Una mano y guantes: objetivos de 64 px, texto de 18 px, barra de acciones sticky por encima de la barra inferior del shell (`--ids-bottom-offset`)                                                              |
| 4   | Plantillas demo    | `/plantillas` y una pantalla por layout (`lista`, `detalle`, `asistente`, `panel`, `campo`) con máquinas de hielo ficticias leídas por la API demo; menú «Plantillas» solo en sesiones demo; 404 fuera del demo |
| 5   | Storybook          | `Layouts/*`: Normal, Modo lectura, Móvil y Matriz de estados por layout; `pnpm check:catalog` exige la matriz también en `packages/ui/src/patterns`                                                             |
| 6   | Galería            | `ux:snapshots`: rutas «Plantilla · …» con carga, vacío, error, sin permiso, sin conexión, modo lectura y conflicto a 375, 768 y 1280 px                                                                         |
| 7   | Documentación      | [Layouts](../design-system/layouts.md), [catálogo](../design-system/catalog.md), [QA de Fase 6](../qa/phase-6/README.md), [estado de la fase](../backlog/phase-6-status.md)                                     |

## Decisiones

- **Guantes (provisional, no productiva).** UI_UX no menciona guantes: fija 44 px como mínimo (§16.2), 16 px de texto en móvil (§7.2) y acciones principales en la primera pantalla para campo. `MobileOperationalLayout` usa 64 px, 18 px y 12 px entre acciones para cubrir el uso con guantes que pide el prompt. Queda como decisión provisional de diseño hasta que UX la confirme con usuarios de campo; no contradice el documento, solo es más estricta.
- **Barra sticky, no fija.** Una barra `fixed` tapaba la navegación inferior del shell y el final del contenido. La barra es `sticky` y se detiene encima de la barra inferior gracias a `--ids-bottom-offset`, que el shell define y `@ice24/ui` deja en 0 por defecto.
- **Reutilización.** `ListLayout` usa `Table` (tarjetas en móvil) y `Pagination` de F6-03 en lugar de duplicarlos; `DetailLayout` usa `Tabs`.
- **Las plantillas pasan por la API demo.** Así el panel Demo controla la red y el modo de cuenta igual que en las pantallas reales. Para vacío, sin permiso y conflicto (que la red no puede forzar) se agregó el control «Escenario de plantillas» al panel; solo afecta a `/plantillas`.
- **Sin migración ni contrato nuevo.** El BFF de las plantillas (`POST /api/plantillas`) solo existe en modo demo y no guarda nada salvo el folio de cada clave.

## Archivos

- Nuevos: `packages/ui/src/patterns/{index.ts,layouts/*}`; `apps/private-web/src/app/(account)/plantillas/**`; `apps/private-web/src/features/templates/*`; `apps/private-web/src/server/demo/templates.ts`; `apps/private-web/src/app/api/plantillas/{route.ts,route.test.ts}`; `docs/design-system/layouts.md`; este reporte.
- Modificados: `packages/ui/src/{index.ts,styles.css}`, `packages/ui/tsconfig.json`; `scripts/check-ui-catalog.mjs`; `apps/private-web/src/features/navigation/{destinations.ts,navigation.css}`; `apps/private-web/src/server/account/shell.ts`; `apps/private-web/src/server/demo/state.ts`, `features/demo/{demo-panel,demo-slot}.tsx`, `app/api/demo/route.ts` y `server/demo/gate.test.ts` (escenario de plantillas); `apps/private-web/src/app/(account)/layout.tsx`; `tests/visual/ux-review.routes.ts` y `scripts/ux-snapshots/run.ts` (rutas de plantillas y pasos previos a la captura); documentación indicada arriba.

## Requisitos cubiertos

TASK-F6-09 (plantillas reutilizables; carga, vacío, error, permiso denegado y modo lectura; breakpoints 375/768/1280; teclado y WCAG 2.2 AA); UI_UX §11.3–11.6 (lista, detalle, formulario y flujo por pasos), §13.3 (KPI «Sin datos», lista móvil), §14.3–14.8 (dashboards y orden de trabajo móvil), §16.2–16.3 (reglas responsive y transformación de tablas).

## Validación

Véase [TASK-F6-10](task-f6-10.md#validación): las dos tareas se validaron juntas.

## Riesgos y deuda

- Las pantallas reales todavía no usan los layouts: cada módulo los adoptará al construirse (Fase 7). Auditoría, Archivos, Avisos y Trabajos conservan su estructura de Fase 5, aunque sus estados ya son los de F6-10.
- Los 64 px de la pantalla de campo están por validar con usuarios reales con guantes.
- En las capturas de página completa, la barra sticky de la pantalla de campo aparece a media página (es donde queda el viewport); en el celular real se ve abajo.

## Validación manual pendiente

Revisión UX del checklist de [TASK-F6-10](task-f6-10.md#checklist-de-revisión-ux).
