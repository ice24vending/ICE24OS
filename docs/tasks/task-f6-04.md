# TASK-F6-04 — Componentes especializados de dominio

Estado: implementada el 17/10/2026 en la rama `feat/f6-04-domain-components`, creada sobre `feat/f6-03-base-components` (prompt P3) porque el PR #40 de F6-03 aún no está en `main`. Sigue la dirección visual aprobada el 15/10/2026 ([ADR-025](../decisions/adr-025-brand-palette.md)).

## Objetivo

Entregar tríada de máquina, alerta crítica, comparador, sincronización, modo lectura y estado de trabajos en `@ice24/ui`, compuestos con los componentes base, presentacionales, con transiciones como callbacks que reciben la versión esperada y con el 412 recuperable; y usarlos en las pantallas de F5-15 donde el reemplazo es directo.

## Entregables

| #   | Entregable                            | Resultado                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `MachineTriad`                        | Operación/Técnico/Sanitario con los enums de API.md y textos del glosario del PRD; icono por dimensión (máquina, herramienta, escudo); `dominantDimension()` (sanitario > técnico > operación)                                                                                                    |
| 2   | `CriticalAlert`                       | Prioridad, estado, «Fijada», tiempo, fuente, responsable, escalamiento; «Marcar enterado», «Atender», «Marcar resuelta» con `(expectedVersion)`; `pending`, `feedback`, detalle                                                                                                                   |
| 3   | `Comparator`                          | Tabla con encabezados de fila, columna «Diferencia» escrita, resumen asociado, notas fuera de rango, solo cambios, tarjetas en móvil con roles explícitos                                                                                                                                         |
| 4   | `SyncStatus`                          | 8 estados (UI_UX §13.7 + §20.1), `chip` y `panel`; `onRetry(operationId)` bloqueado mientras `retrying`; `onResolve` en conflicto                                                                                                                                                                 |
| 5   | `ReadOnlyBanner`, `ReadOnlyIndicator` | Región viva siempre montada; tratamiento único advertencia + candado (D3 resuelto); `scope` cuenta/permiso                                                                                                                                                                                        |
| 6   | `JobStatus`                           | 6 estados internos (F5-07) + 4 públicos (JOB-001); `tag` y `detail` con intentos, próximo intento, error, DLQ, `onRetry(expectedVersion)`                                                                                                                                                         |
| 7   | `TransitionFeedbackBanner`            | 412 → «La información cambió» + Actualizar; error → Reintentar (misma versión y clave)                                                                                                                                                                                                            |
| 8   | Iconos                                | 17 de dominio en `Icon`: `tool`, `shield`, `drop`, `power`, `archive`, `sync`, `clock`, `device`, `download`, `conflict`, `pin`, `refresh`, `inbox`, `play`, `user`, `escalate`, `compare`                                                                                                        |
| 9   | Storybook                             | 6 archivos en **Dominio**, 20 historias con controles (incluye **CriticalAlert › Interactiva** con 412 simulado y **SyncStatus › Reintento**); 75 historias en total                                                                                                                              |
| 10  | Galería                               | 6 rutas nuevas (`componentes-triada`, `-alerta-critica`, `-comparador`, `-sincronizacion`, `-modo-lectura`, `-trabajos`) × 3 viewports = 18 capturas                                                                                                                                              |
| 11  | Web privada (F5-15)                   | Barra de modo lectura, tarjeta del Centro de alertas y estado del Centro de trabajos sustituidos (ver abajo)                                                                                                                                                                                      |
| 12  | Documentación                         | [Componentes de dominio](../design-system/components/domain.md), [base](../design-system/components/base.md), [referencia D3](../design-system/reference/README.md), [guía de QA](../qa/phase-6/README.md#qué-deben-validar-en-p3-componentes-de-dominio), [estado](../backlog/phase-6-status.md) |

## Decisiones

| Tema                         | Decisión                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dimensiones de la tríada     | UI_UX §6.4 define operativo/técnico/sanitario (no «comercial»). La publicación es otra dimensión (RF-EQP-012) y queda fuera de la tríada                    |
| Prioridad visual             | El estado crítico dominante va sólido; orden fijo de los tres chips para que se aprenda la posición. Pregunta abierta abajo                                 |
| D3 modo lectura              | Advertencia + candado en barra, banner e indicador. El neutro se confunde con «Sin datos/archivado»; el rojo se reserva para suspensión y errores           |
| Independencia del paquete    | `@ice24/ui` no importa `@ice24/contracts` (fronteras); los tipos repiten los enums y son asignables desde los de contratos                                  |
| Botones bloqueados           | `aria-disabled` + motivo visible (no `disabled`): «Marcar resuelta» sigue enfocable y explica por qué. Playwright lo trata como deshabilitado               |
| Sin animación de sincronizar | «Sincronizando…» con icono fijo (UI_UX §8.8)                                                                                                                |
| Contraste                    | 6 combinaciones nuevas en `check:contrast` (alerta fijada sobre `status-danger-bg`, fila con cambios sobre `status-warning-bg`); 86 en total, todas cumplen |

## Sustituciones en la web privada

- **Shell de cuenta**: `ReadOnlyBanner` del shell compone el de `@ice24/ui` con motivo y acción de F5-03; la suspensión conserva su banner de error.
- **Centro de alertas**: la tarjeta es `CriticalAlert`. El 412 y los errores de una transición se muestran **en la tarjeta afectada** (si salió de la vista, en la página); «Reintentar» reenvía con la misma versión y la misma clave. Mientras corre «leída» (al abrir el detalle) las demás acciones esperan, para no enviar una versión anterior a la lectura. Se retiró el CSS propio de tarjeta, chips y acciones.
- **Centro de trabajos**: `JobStatus` en tabla, detalle e historial; `statusLabels` sale de `jobStatusLabel`; el 412 del reintento usa `TransitionFeedbackBanner` con el mismo título. El formulario de reintento no cambió.
- No aplican todavía: `MachineTriad`, `Comparator` y `SyncStatus` (no hay pantallas de máquinas, conflictos ni PWA offline en F5-15).

## Archivos

Nuevos: `packages/ui/src/components/domain/` (`comparator.tsx`, `critical-alert.tsx`, `feedback.tsx`, `job-status.tsx`, `machine-triad.tsx`, `read-only.tsx`, `sync-status.tsx`, `index.ts`, `domain.css`, `domain.test.tsx`, 6 `*.stories.tsx`), `docs/design-system/components/domain.md`, este reporte.

Modificados: `packages/ui/src/index.ts`, `styles.css`, `components/base/icon.tsx` (iconos), `components/base/banner.tsx` (`titleAs="h4"`), `tokens/contrast.ts`; `apps/private-web/src/features/account-shell/access-provider.tsx`, `notifications/center.tsx`, `notifications/center.test.tsx`, `notifications/notifications.css`, `jobs/center.tsx`; `tests/integration/ui-services.test.ts` y `notifications.test.ts` (selectores `.ids-alert__status`/`.ids-job__tag` y texto «Estado: En atención» que ahora lee la dimensión); `tests/visual/ux-review.routes.ts`; documentación listada arriba.

## Pruebas

`domain.test.tsx` (21): tríada (texto + icono por dimensión, dominante único, «Sin datos», carga); alerta (fijada hasta «Enterado», versión esperada en cada transición, resolución bloqueada enfocable con motivo, bloqueo durante `pending`, 412 con encabezado h4 y «Actualizar», detalle con `aria-expanded`/`aria-controls`); comparador (resumen, «Cambió de X a Y» por fila, encabezados de fila, solo cambios, vacío); sincronización (8 estados, reintento con el mismo `operationId` y sin llamadas mientras `retrying` incluso con doble clic, «Resolver» bloqueado con motivo, contador); modo lectura (región viva montada, enlace, sin cierre, alcance); trabajos (etiquetas internas y públicas, reintento con versión y 412, sin reintento fuera de FAILED/DLQ); **axe sin violaciones** en todos los estados.

## Validación ejecutada

Entorno: Windows 11 Pro, Node 24.19.0, pnpm 11.24.0, Docker 29.7.2, Chromium de Playwright 1.62.1.

| Comando                                       | Resultado                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                  | Código 0. Prettier, ESLint sin advertencias, typecheck y `typecheck:review`, fronteras, `check:colors` (129 archivos), `check:contrast` (86 combinaciones) y Vitest: 645 pruebas en 91 archivos (21 nuevas)                                                                                                                                                                                                                        |
| `pnpm build`                                  | Código 0; 14 de 14 tareas                                                                                                                                                                                                                                                                                                                                                                                                          |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Código 0; 145 pruebas en 19 archivos, tras compilar con `ICE24_STORAGE_ORIGIN` como CI. La primera corrida falló en 4 pruebas: «Marcar enterado» se podía pulsar mientras corría «leída» (salía con versión vieja → 412) y el aviso del 412 no era encabezado; los dos fallos de archivos eran en cascada (la cuenta quedó en modo lectura). Corregido en el componente y la pantalla. Capturas de evidencia de Fase 5 restauradas |
| `pnpm ux:snapshots`                           | Código 0; 192 capturas (18 nuevas). Revisadas alerta crítica, Centro de alertas, tríada y comparador en móvil                                                                                                                                                                                                                                                                                                                      |
| `pnpm storybook:build`                        | Código 0; 75 historias (20 de Dominio)                                                                                                                                                                                                                                                                                                                                                                                             |

## Riesgos y deuda

- La prioridad visual de la tríada, los tonos de «En mantenimiento»/«Suspendida» y los textos de estados de trabajos son propuestas (ver preguntas abiertas).
- `SyncStatus` y `Comparator` no tienen consumidor real hasta la PWA y la resolución de conflictos (Fases 7–9); sus contratos de cola y conflicto pueden pedir ajustes.
- La rama depende de #40: tras el merge, rebasar sobre `main` y cambiar la base del PR.
- El Centro de trabajos sigue con tabla y paginación propias (F6-09) y `ServiceState` (F6-10).

## Checklist de revisión UX

Abrir Storybook › **Dominio** (o las capturas `componentes-*` de la galería). Probar con teclado, en **Móvil 375** y en escala de grises.

| Componente    | Historias                                               | Qué revisar                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MachineTriad  | Playground, Estados, Móvil                              | Los tres estados se leen por separado; el dominante (sólido) llama la atención sin ocultar los otros; «Sin datos» se entiende; en Playground cambiar cada estado                                                   |
| CriticalAlert | Interactiva, Estados, Playground, Móvil                 | En Interactiva: «Marcar enterado» → desaparece «Fijada» → «Atender» → conflicto dentro de la tarjeta → «Actualizar». Se entiende que «Enterado» ≠ «Resuelta»; «Marcar resuelta» explica por qué no está disponible |
| Comparator    | Estados, Playground, Móvil                              | Se ve qué cambió sin depender del color; quién y cuándo capturó cada versión; nota de fuera de rango; formulario con motivo obligatorio                                                                            |
| SyncStatus    | Reintento, Estados, Playground, Móvil                   | Ocho estados distinguibles; en Reintento, pulsar varias veces «Reintentar» → «Solicitudes enviadas» muestra una sola                                                                                               |
| Modo lectura  | Estados, Playground, Móvil                              | Barra e indicador iguales (ámbar + candado); el texto dice qué sí se puede hacer; el formulario avisa antes de empezar                                                                                             |
| JobStatus     | Estados, Playground, Móvil                              | «En DLQ» y «Fallido» se distinguen de «Reintento programado»; el reintento pide motivo; conflicto explicado                                                                                                        |
| Pantallas     | Galería `avisos-*`, `trabajos-*`, cualquier `*-lectura` | Centro de alertas con las nuevas tarjetas; barra de modo lectura con botón «Ver suscripción»                                                                                                                       |

### Preguntas de negocio abiertas

1. **Tríada**: ¿el estado sanitario siempre domina sobre un técnico «Crítico»? ¿«En mantenimiento» es advertencia (ámbar) o información (azul)? ¿«Suspendida» debe verse igual que «Fuera de servicio» (rojo)?
2. **Iconos de la tríada**: ¿icono por dimensión (máquina, herramienta, escudo, como pide UI_UX) o por gravedad (check, alerta)? ¿Escudo o gota para sanitario?
3. **Alerta crítica**: ¿«Atender» es la acción principal (azul) y «Marcar enterado» la secundaria, o al revés? ¿Fondo rojo suave para la fijada o solo borde?
4. **Textos de trabajos**: ¿mantener «En DLQ» (técnico) o usar «Requiere revisión»? ¿«Procesando» o «En curso»? ¿«Reintento programado» o «Reintentando»?
5. **Modo lectura**: ¿confirman ámbar + candado (D3) para barra e indicador? ¿«Solo consulta» es el texto correcto para roles sin permiso de edición?
6. **Sincronización**: ¿«Disponible offline» o «Disponible sin conexión»? ¿El encabezado muestra el número de pendientes?
7. **Comparador**: ¿mostrar los campos sin cambios por defecto o solo los cambios?
