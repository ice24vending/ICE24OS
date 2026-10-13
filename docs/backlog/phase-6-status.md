# Estado de Fase 6 — Sistema de diseño, shell privado y navegación

Fecha de arranque: 10 de octubre de 2026.

## Resultado

**Fase en curso.** P0 (arranque y sala de revisión UX) preparado en la rama `feat/f6-00-ux-review-harness`; ver [TASK-F6-00](../tasks/task-f6-00.md). Ninguna tarea F6-01 a F6-12 está implementada todavía.

Gate de entrada: Fase 3 aprobada (permisos y contexto, dependencia del [Implementation Plan](../../context/Implementation_Plan.md#fase-6--sistema-de-diseño-shell-privado-y-navegación)) y Fase 5 integrada en `main` con gate «aprobado con pendientes externos» (06/10/2026), cuya declaración habilita continuar con la Fase 6 en desarrollo. Según confirmación del responsable del 10/10/2026, las firmas de la Fase 5 y del complemento RA-01 de la Fase 4 se aprobaron de manera interna. Los pendientes externos de la Fase 5 (Stripe remoto, despliegue, antimalware, correo, hospedaje del worker, DEC-008 y DEC-017) no bloquean esta fase porque no tiene operación productiva.

Fuentes de alcance: [Implementation Plan, Fase 6](../../context/Implementation_Plan.md#fase-6--sistema-de-diseño-shell-privado-y-navegación), [TASKS](../../context/TASKS.md) (TASK-F6-01 a F6-12), [UI_UX](../../context/UI_UX.md), [AppFlow](../../context/AppFlow.md) y [reglas del proyecto](../../context/PROJECT_RULES.md). Guía de ejecución: [prompts de Fase 6](phase-6-prompts.md).

## Secuencia de ejecución

Un prompt equivale a una rama y un PR. Cada tarea conserva además las dependencias de TASKS.

| Orden | Prompt | Tareas        | Entrega                                                    | Depende de | Paralelo con | Estado al 10/10/2026       |
| ----- | ------ | ------------- | ---------------------------------------------------------- | ---------- | ------------ | -------------------------- |
| 0     | P0     | F6-00         | Sala de revisión UX: Storybook, modo demo y galería        | Fase 5     | —            | Implementada; PR por abrir |
| 1     | P1     | F6-01 + F6-02 | Paleta validada y tokens semánticos                        | P0         | —            | Pendiente                  |
| 2     | P2     | F6-03         | Componentes base accesibles                                | P1         | —            | Pendiente                  |
| 3     | P3     | F6-04         | Componentes especializados de dominio                      | P2         | P5           | Pendiente                  |
| 4     | P4     | F6-05         | Catálogo de componentes y estados                          | P2, P3     | —            | Pendiente                  |
| 5     | P5     | F6-06 + F6-07 | Shell responsive y navegación por permisos                 | P2         | P3           | Pendiente                  |
| 6     | P6     | F6-08         | Selector de contexto y persistencia segura                 | P5         | —            | Pendiente                  |
| 7     | P7     | F6-09 + F6-10 | Layouts reutilizables y estados globales                   | P2, P5     | P8           | Pendiente                  |
| 8     | P8     | F6-11         | Deep links, regresar y cambios no guardados                | P5         | P7           | Pendiente                  |
| 9     | P9     | F6-12         | Accesibilidad y visual regression automáticas              | P3, P5     | —            | Pendiente                  |
| 10    | P10    | Gate          | Trazabilidad, declaración de cierre y formulario de firmas | Todo       | —            | Pendiente                  |

## Herramientas de revisión (P0)

- **Galería de capturas:** `pnpm ux:snapshots` → `docs/qa/phase-6/ux-review/index.html`. Cada PR la publica como artefacto `ux-review-gallery` del job `ux-review` de CI.
- **Storybook:** `pnpm storybook` (http://localhost:6006) y `pnpm storybook:build` (artefacto `storybook-static`).
- **Modo demo:** `ICE24_DEMO_MODE=1 pnpm dev:private` y abrir http://localhost:3000/?demo=1.

La guía para revisores no técnicos está en [QA de Fase 6](../qa/phase-6/README.md). Cada tarea agrega sus pantallas a `tests/visual/ux-review.routes.ts` y sus componentes a Storybook.

## Decisiones abiertas

| Decisión                                                                                                                                                            | Afecta              | Responsable         | Estado                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------- | --------------------------------------------------------- |
| Aprobación de la paleta y tipografía de marca (DEC-020). Hasta entonces los tokens son «provisionales no productivos».                                              | F6-01, F6-02        | Dirección/Marketing | Pendiente externo; P1 no se integra sin ella              |
| Aprobación de prototipos (DEC-023) mediante la galería y el formulario de firmas de P10.                                                                            | F6-03 a F6-11       | Product Owner       | Pendiente; el mecanismo de revisión ya existe (P0)        |
| Navegadores, dispositivos y offline objetivo (DEC-018): fijan los viewports de la galería y de la regresión visual.                                                 | F6-06, F6-09, F6-12 | UX/Tech Lead        | Propuesta; se usan 375, 768 y 1280 px                     |
| Modo demo en la URL de Preview de Vercel. La regla de P0 lo bloquea con `NODE_ENV=production`, que toda compilación de Next fija; hoy solo funciona con `next dev`. | Revisión remota     | Tech Lead/Seguridad | Abierta: requiere decidir si se permite en Preview y cómo |
| Framework de Storybook: React + Vite (sin runtime de Next). Las pantallas que usan router o servidor se revisan en el modo demo.                                    | F6-05               | Tech Lead           | Adoptada en P0; revisable en P4                           |

## Validación y salida

Cada prompt ejecuta `pnpm check`, `pnpm build`, `ICE24_BROWSER_TESTS=1 pnpm test:integration` y `pnpm ux:snapshots` (desde P9 también `pnpm test:ui`) y termina con un checklist de revisión UX. El criterio de salida es el de la Fase 6 en el Implementation Plan: navegación que no revela módulos no autorizados, accesibilidad desde el catálogo, móvil específico para operación de campo y componentes por API, no por pantalla.
