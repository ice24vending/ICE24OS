# Estado de Fase 6 — Sistema de diseño, shell privado y navegación

Fecha de arranque: 10 de octubre de 2026.

## Resultado

**Gate P10 rechazado (24/10/2026).** F6-01…F6-12 integradas en `main`; integración no equivale a cierre aprobado. Véanse [matriz](../qa/phase-6/traceability.md), [declaración](../qa/phase-6/evidence/20261024-declaracion-cierre.md) y [formulario UX sin firmas](../qa/phase-6/ux-signoff.md). Bloquean la salida D-01 (habilitación de módulos por cuenta ausente; corregido en #51), D-02 (sin evidencia completa con lector de pantalla) y D-03 (shell y panel no siguen la referencia aprobada: tipografía, barra lateral, encabezado, KPI con icono, alerta crítica y filas; la primera parte, tipografía, barra lateral y encabezado, va en `fix/f6-d03-shell-reference`). Los resultados ejecutables y cualquier fallo adicional se registran en la declaración. P0 integrado en `main` (#36); ver [TASK-F6-00](../tasks/task-f6-00.md). P1 (paleta y tokens) integrado en `main` (#37), con la paleta y la dirección visual aprobadas por Dirección el 15/10/2026; ver [TASK-F6-01](../tasks/task-f6-01.md), [TASK-F6-02](../tasks/task-f6-02.md) y [ADR-025](../decisions/adr-025-brand-palette.md). P2 (componentes base accesibles) integrado en `main` (#40); ver [TASK-F6-03](../tasks/task-f6-03.md) y el [catálogo de componentes base](../design-system/components/base.md). P3 (componentes de dominio) integrado en `main` (#42) con las decisiones de negocio del 17/10/2026; ver [TASK-F6-04](../tasks/task-f6-04.md) y el [catálogo de dominio](../design-system/components/domain.md). P4 (catálogo de componentes y estados) integrado en `main` (#43); ver [TASK-F6-05](../tasks/task-f6-05.md) y el [catálogo](../design-system/catalog.md). P5 (shell responsive y navegación por permisos) integrado en `main` (#44); ver [TASK-F6-06](../tasks/task-f6-06.md), [TASK-F6-07](../tasks/task-f6-07.md) y el [shell](../design-system/shell.md). P6 (selector de contexto y persistencia segura) integrado en `main` (#45); ver [TASK-F6-08](../tasks/task-f6-08.md). P7 (layouts reutilizables y estados globales) integrado en `main` (#47); ver [TASK-F6-09](../tasks/task-f6-09.md), [TASK-F6-10](../tasks/task-f6-10.md), [layouts](../design-system/layouts.md) y [estados globales](../design-system/states.md). P8 (deep links, regresar y cambios no guardados) integrado en `main` (#48); ver [TASK-F6-11](../tasks/task-f6-11.md) y [navegación](../design-system/navigation.md). P9 (quality gate de accesibilidad y regresión visual) integrado en `main` (#49); ver [TASK-F6-12](../tasks/task-f6-12.md) y [quality gate de interfaz](../qa/phase-6/ui-quality.md). P10 documentado en `chore/f6-gate`, sobre `baababe`; no habilita salida de Fase 6 hasta resolver los bloqueantes y obtener las firmas.

Gate de entrada: Fase 3 aprobada (permisos y contexto, dependencia del [Implementation Plan](../../context/Implementation_Plan.md#fase-6--sistema-de-diseño-shell-privado-y-navegación)) y Fase 5 integrada en `main` con gate «aprobado con pendientes externos» (06/10/2026), cuya declaración habilita continuar con la Fase 6 en desarrollo. Según confirmación del responsable del 10/10/2026, las firmas de la Fase 5 y del complemento RA-01 de la Fase 4 se aprobaron de manera interna. Los pendientes externos de la Fase 5 (Stripe remoto, despliegue, antimalware, correo, hospedaje del worker, DEC-008 y DEC-017) no bloquean esta fase porque no tiene operación productiva.

Fuentes de alcance: [Implementation Plan, Fase 6](../../context/Implementation_Plan.md#fase-6--sistema-de-diseño-shell-privado-y-navegación), [TASKS](../../context/TASKS.md) (TASK-F6-01 a F6-12), [UI_UX](../../context/UI_UX.md), [AppFlow](../../context/AppFlow.md) y [reglas del proyecto](../../context/PROJECT_RULES.md). Guía de ejecución: [prompts de Fase 6](phase-6-prompts.md).

## Secuencia de ejecución

Un prompt equivale a una rama y un PR. Cada tarea conserva además las dependencias de TASKS.

| Orden | Prompt | Tareas        | Entrega                                                    | Depende de | Paralelo con | Estado al 24/10/2026       |
| ----- | ------ | ------------- | ---------------------------------------------------------- | ---------- | ------------ | -------------------------- |
| 0     | P0     | F6-00         | Sala de revisión UX: Storybook, modo demo y galería        | Fase 5     | —            | Integrada en `main` (#36)  |
| 1     | P1     | F6-01 + F6-02 | Paleta validada y tokens semánticos                        | P0         | —            | Integrada en `main` (#37)  |
| 2     | P2     | F6-03         | Componentes base accesibles                                | P1         | —            | Integrada en `main` (#40)  |
| 3     | P3     | F6-04         | Componentes especializados de dominio                      | P2         | P5           | Integrada en `main` (#42)  |
| 4     | P4     | F6-05         | Catálogo de componentes y estados                          | P2, P3     | —            | Integrada en `main` (#43)  |
| 5     | P5     | F6-06 + F6-07 | Shell responsive y navegación por permisos                 | P2         | P3           | Integrada en `main` (#44)  |
| 6     | P6     | F6-08         | Selector de contexto y persistencia segura                 | P5         | —            | Integrada en `main` (#45)  |
| 7     | P7     | F6-09 + F6-10 | Layouts reutilizables y estados globales                   | P2, P5     | P8           | Integrada en `main` (#47)  |
| 8     | P8     | F6-11         | Deep links, regresar y cambios no guardados                | P5         | P7           | Integrada en `main` (#48)  |
| 9     | P9     | F6-12         | Accesibilidad y visual regression automáticas              | P3, P5     | —            | Integrada en `main` (#49)  |
| 10    | P10    | Gate          | Trazabilidad, declaración de cierre y formulario de firmas | Todo       | —            | Rechazado; ver declaración |

## Herramientas de revisión (P0)

- **Galería de capturas:** `pnpm ux:snapshots` → `docs/qa/phase-6/ux-review/index.html`. Cada PR la publica como artefacto `ux-review-gallery` del job `ux-review` de CI.
- **Storybook:** `pnpm storybook` (http://localhost:6006) y `pnpm storybook:build` (artefacto `storybook-static`).
- **Fundamentos del sistema de diseño (P1):** Storybook › Fundamentos y las rutas `fundamentos-*` de la galería; catálogo en [tokens](../design-system/tokens.md).
- **Componentes base (P2):** Storybook › Base y las rutas `componentes-*` de la galería; catálogo en [componentes base](../design-system/components/base.md).
- **Shell y navegación (P5):** ruta «Shell y menú por rol» de la galería (una captura por persona del modo demo y viewport); diseño en [shell](../design-system/shell.md).
- **Modo demo:** `ICE24_DEMO_MODE=1 pnpm dev:private` y abrir http://localhost:3000/?demo=1.

La guía para revisores no técnicos está en [QA de Fase 6](../qa/phase-6/README.md). Cada tarea agrega sus pantallas a `tests/visual/ux-review.routes.ts` y sus componentes a Storybook.

## Referencia visual aprobada (15/10/2026)

Dirección aprobó la paleta de marca, el contorno de foco y la dirección visual del prototipo ([ADR-025](../decisions/adr-025-brand-palette.md), [evidencia](../qa/phase-6/evidence/20261015-aprobacion-identidad-visual.md)). Reglas para P2 a P9:

- Las capturas de `docs/qa/phase-6/evidence/20261015-identidad-visual/` y el prototipo exportado en [`docs/design-system/reference/`](../design-system/reference/README.md) (recibido el 16/10/2026) son la referencia visual; cada pantalla y componente nuevo debe parecerse a ellos y corregir las diferencias D2–D8 allí listadas.
- Los valores mandan desde los tokens de `packages/ui/src/tokens` y `context/UI_UX.md`; si el prototipo difiere, ganan ellos.
- El código del prototipo no se copia: se reimplementa con tokens, `authorize()`, contratos y pruebas del proyecto.
- Montserrat y el wordmark de texto siguen siendo provisionales.

## Decisiones abiertas

| Decisión                                                                                                                                                                            | Afecta              | Responsable         | Estado                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Aprobación de la paleta y tipografía de marca (DEC-020, [ADR-025](../decisions/adr-025-brand-palette.md)).                                                                          | F6-01, F6-02        | Dirección/Marketing | **Paleta aprobada** el 15/10/2026 (Axel Quevedo Zamudio, Eduardo Ramos); tipografía pendiente de la fuente oficial |
| Aprobación de prototipos (DEC-023). Dirección visual aprobada el 15/10/2026 como guía ([ADR-025](../decisions/adr-025-brand-palette.md)); la firma final de pantallas sigue en P10. | F6-03 a F6-11       | Product Owner       | Dirección **aprobada**; firma final en P10                                                                         |
| Navegadores, dispositivos y offline objetivo (DEC-018): fijan los viewports de la galería y de la regresión visual.                                                                 | F6-06, F6-09, F6-12 | UX/Tech Lead        | Propuesta; se usan 375, 768 y 1280 px                                                                              |
| Modo demo en la URL de Preview de Vercel. La regla de P0 lo bloquea con `NODE_ENV=production`, que toda compilación de Next fija; hoy solo funciona con `next dev`.                 | Revisión remota     | Tech Lead/Seguridad | Abierta: requiere decidir si se permite en Preview y cómo                                                          |
| Framework de Storybook: React + Vite (sin runtime de Next). Las pantallas que usan router o servidor se revisan en el modo demo.                                                    | F6-05               | Tech Lead           | Confirmada en P4: catálogo oficial en Storybook; pantallas reales en galería y modo demo, maquetas en Storybook    |

## Validación y salida

Cada prompt ejecuta `pnpm check`, `pnpm build`, `ICE24_BROWSER_TESTS=1 pnpm test:integration` y `pnpm ux:snapshots` (desde P9 también `pnpm test:ui`) y termina con un checklist de revisión UX. El criterio de salida de la Fase 6 en el Implementation Plan exige que autenticación, cambio de contexto, dashboard vacío y navegación por rol funcionen en móvil, tableta y escritorio con teclado y lector de pantalla básico. Además se verifican sus cuatro riesgos: navegación que no revela módulos no autorizados, accesibilidad desde el catálogo, móvil específico para operación de campo y componentes por API, no por pantalla. P10 registra D-01 y D-02 como bloqueantes; la integración de las doce tareas no acredita por sí sola ese criterio.
