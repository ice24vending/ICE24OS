# Expediente de máquinas y navegación de mantenimiento

Fecha: 2026-11-03. Cambios locales, sin commit ni push.

## Dictamen de arquitectura

El flujo **Ticket (reporte de falla) → Orden de trabajo (ejecución)** es correcto. `context/Database.md` define `ticket_id` como ticket origen; `packages/contracts/src/private/maintenance/work-orders.ts` mantiene `sourceType`, `sourceId`, `ticketId` y `activityId`. Una orden también puede proceder de una actividad programada. No se fusionan los dos expedientes ni se altera esa relación.

«Ver reporte original» mantiene el destino `/maintenance/tickets/[ticketId]`. La orden muestra el folio del ticket cuando puede consultarlo con los permisos de la sesión. La navegación lleva `fromOrder`, validado como UUID en servidor; solo se muestra «Volver a OT-…» si la orden consultada realmente referencia ese ticket. Un parámetro de otra orden no genera una asociación falsa. Las pestañas activas y los breadcrumbs existentes cambian al módulo de destino.

## Expediente de máquinas

Se conserva un panel dentro de la página para disponer de espacio para componentes, frecuencias, acciones e historia. Un drawer estrecharía estos formularios y requeriría otro ciclo de apertura/cierre y gestión de cambios pendientes.

- Cada selección, incluida la misma máquina, enfoca el expediente y ejecuta `scrollIntoView` suave. Con movimiento reducido, el desplazamiento es inmediato.
- El panel tiene nombre accesible, borde semántico de selección, sombra ligera, separación superior y margen de desplazamiento para no quedar bajo la cabecera fija.
- Iconos: resumen `activity`, componentes `layers`, frecuencias `clock`, calendario `calendar`; configuración de cuenta conserva `sliders`.
- «Reportar una falla» es secundario, con icono de advertencia y espaciado propio. Su URL incluye `machineId`; el formulario de ticket lo preselecciona.

## Filtros de órdenes

El fallo real era la reintroducción de `machineId=""` después de limpiar parámetros vacíos. «Todas» provocaba una validación UUID fallida, incluso cuando se filtraba solo por estado. Ahora se convierte en ausencia de filtro.

La barra es desplegable, abierta por defecto, y distribuye los campos en una fila en escritorio. Se adapta a columnas en anchos menores. Cambiar una opción envía la consulta GET al servidor; se conserva también Aplicar y Limpiar. La interfaz indica carga, cantidad de resultados en la página y la restricción cuando el contexto fija una máquina. Los filtros se combinan sobre la consulta completa, no sobre las filas de la página en memoria. Las opciones de máquina provienen del selector autorizado; un responsable seleccionado permanece visible aunque la combinación devuelva cero filas. El cursor se reinicia al cambiar filtros.

## Archivos de implementación

| Archivo                                                                | Cambio                                                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `apps/private-web/src/features/equipment/workspace.tsx`                | Activación, foco, desplazamiento, panel y acciones de máquina; iconos explícitos de pestañas.                      |
| `apps/private-web/src/features/equipment/configuration-ui.tsx`         | Icono configurable por pestaña, conservando el comportamiento existente en otros expedientes.                      |
| `apps/private-web/src/features/equipment/equipment.css`                | Separación, borde, sombra y espaciado del expediente.                                                              |
| `packages/ui/src/components/base/icon.tsx`                             | SVG semántico `layers`.                                                                                            |
| `apps/private-web/src/features/work-orders/work-orders-page.tsx`       | Corrección del filtro vacío, opciones autorizadas y lectura del folio del ticket origen.                           |
| `apps/private-web/src/features/work-orders/work-orders-screen.tsx`     | Filtros desplegables y conectados, feedback y referencia al ticket.                                                |
| `apps/private-web/src/features/maintenance/tickets-page.tsx`           | Validación de la orden de procedencia y asociación con el ticket.                                                  |
| `apps/private-web/src/features/maintenance/tickets-screen.tsx`         | Referencia y regreso a la orden.                                                                                   |
| `apps/private-web/src/features/maintenance/tickets.css`                | Filtros compactos y referencias de origen.                                                                         |
| `apps/private-web/src/app/(account)/maintenance/tickets/[id]/page.tsx` | Propagación de parámetros de navegación al cargador de ticket.                                                     |
| `tests/e2e/maintenance/machine-order-navigation.spec.ts`               | Recorridos móvil/escritorio, foco, preselección, filtros combinados, breadcrumbs y rechazo de asociaciones falsas. |
| `tests/visual/ux-review.routes.ts`                                     | Expediente abierto, órdenes filtradas y ticket abierto desde una orden.                                            |

## Enlace directo desde mantenimiento — 06/11/2026

Se conserva el dictamen: expediente dentro de `/machines`, sin drawer ni modal. `/machines?machineId=<uuid>` valida el parámetro en servidor y lo busca exclusivamente en el listado de máquinas autorizado del contexto. No consulta un endpoint por un ID arbitrario. Parámetros inválidos, repetidos, ajenos, fuera del ámbito o sin capacidad de lectura producen la pantalla normal sin selección ni mensaje específico de existencia.

La página usa las capacidades del shell; el servicio de equipos y el demo mantienen `authorize()` real. El cliente vuelve a encontrar el ID validado en su listado actual antes de seleccionar. La selección inicial reutiliza `MachineDetail`: foco con `preventScroll`, desplazamiento suave y desplazamiento inmediato con movimiento reducido. No modifica la selección manual existente.

UI-MNT-01 (mes, semana y agenda) y UI-MNT-02 muestran «código · nombre» como enlace solo si la sesión puede consultar Máquinas. Los selectores de día y los enlaces son controles hermanos, nunca un enlace dentro de un botón. La acción de asignar/crear orden se conserva. El destino usa la navegación y los breadcrumbs de Máquinas; no se añaden parámetros de regreso.

Personas verificables: Dueño y Solo lectura dentro de su cuenta; Administrador de sucursal y Técnico dentro de su ámbito autorizado. Los recorridos cubren lista y los tres modos del calendario, ID ajeno a la cuenta, ID fuera de sucursal, parámetro repetido y valor inválido, en 375 y 1440 px. También comprueban foco, desplazamiento y navegación activa.

Archivos de esta mejora:

- `apps/private-web/src/app/(account)/machines/page.tsx` y `maintenance/page.tsx`.
- `apps/private-web/src/features/equipment/section-page.tsx`, `machine-selection.ts`, `machine-selection.test.ts` y `workspace.tsx`.
- `apps/private-web/src/features/maintenance/machine-link.tsx`, `machine-link.test.tsx`, `scheduled-screen.tsx`, `scheduled-screen.stories.tsx`, `maintenance-calendar.tsx` y `maintenance.css`.
- `tests/e2e/maintenance/machine-order-navigation.spec.ts`, `machine-record-flow.ts`, `tests/visual/ux-review.routes.ts`, `tests/visual/review-page.ts`, `tests/visual/walkthroughs/maintenance.ts` y `scripts/ux-walkthroughs/run.ts`.
- Baselines afectadas de mantenimiento y expediente; aprobación P7–P9 y trazabilidad/documentación de esta mejora.

Validación de esta mejora (06/11/2026):

- `pnpm check`: 128 archivos y 1.012 pruebas correctos; tipos, lint, formato y comprobaciones del sistema de diseño aprobados.
- `pnpm build`: 14 tareas correctas.
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: 201 pruebas correctas en 21 archivos.
- Actualización dirigida en Linux: 170 casos correctos. Solo se regeneraron las rutas afectadas: 28 imágenes modificadas de UI-MNT-01/02 y mantenimiento vencido, más 16 nuevas del expediente desde mantenimiento (cuatro personas × cuatro tamaños).
- `pnpm test:ui -- --workers=6` en Linux: 2.241 pruebas correctas en 17,9 minutos, sin actualizar imágenes en esta pasada completa.
- `pnpm ux:snapshots` en Linux: 1.272 capturas, cero observaciones y cero archivos faltantes; incluye 16 estados/tamaños del nuevo expediente. [Galería local](../phase-6/ux-review/index.html).
- `pnpm ux:walkthroughs` en Linux: 10 recorridos verificados, diez videos referenciados y ninguno faltante. Se inspeccionó el fotograma final del [nuevo recorrido por teclado](walkthroughs/maintenance-machine-record.webm): expediente visible y enfocado en móvil. [Índice de videos](walkthroughs/index.html).

Se inspeccionaron las 44 imágenes. La revisión corrigió fecha/contador en columna en móvil, área táctil del selector de 44 px y elipsis para enlaces largos en las celdas de escritorio. El capturador comprueba primero el foco y vuelve al inicio antes de fotografiar la página completa, evitando una cabecera fija a media captura. Los recorridos funcionales verifican por separado el desplazamiento al expediente. No se cambiaron tolerancias ni se desactivaron comprobaciones.

Logs locales: `tmp/machine-deep-link-check-release.log`, `tmp/machine-deep-link-build-release.log`, `tmp/machine-deep-link-integration.log`, `tmp/machine-deep-link-release-run.log`, `tmp/machine-deep-link-linux-complete.log`, `tmp/machine-deep-link-gallery.log` y `tmp/machine-deep-link-walkthroughs.log`. Comparaciones de imágenes: `tmp/machine-link-visual-review/`. Las capturas históricas generadas de nuevo por integración se conservaron en `tmp/machine-deep-link-integration-captures/`, sin incorporarlas al cambio.

Documentación modificada para esta entrega: este dictamen, `docs/modules/maintenance.md`, `docs/backlog/phase-7-status.md`, `docs/qa/phase-7/traceability.md`, `ux-signoff.md`, `offline-p7-p9.md` y los reportes `docs/tasks/task-f7-01.md`, `task-f7-08.md`, `task-f7-10.md`, `task-f7-11.md`, `task-f7-12.md`, `task-f7-14.md`.

El 06/11/2026 el usuario solicitante aprobó primero P7–P9 y después confirmó la revisión del nuevo enlace al expediente. UI-MNT-01 y UI-MNT-02 quedan **Aprobado**, incluido este cruce de módulo; constancia literal en [ux-signoff](ux-signoff.md). No se acredita lector de pantalla ni dispositivo físico específico.

Checklist para la nueva revisión: ejecutar `$env:ICE24_DEMO_MODE="1"; pnpm dev:private`, abrir http://localhost:3000/?demo=1 y seleccionar Dueño, Administrador de sucursal, Técnico o Solo lectura. Abrir `/maintenance?view=calendar` o `?view=list`, activar un enlace de máquina y comprobar el expediente. Para comprobar el rechazo silencioso, abrir `/machines?machineId=invalid` y un UUID de otra cuenta. Repetir en móvil y escritorio, con teclado. Storybook permite alternar `canReadMachines` en Actividades programadas para verificar el texto sin enlace.

1. ¿Se reconoce el nombre de máquina como enlace en lista y calendario?
2. ¿El expediente seleccionado aparece enfocado y visible al llegar?
3. ¿Se entiende el cambio de navegación activa a Máquinas?
4. ¿Las acciones de crear/asignar orden conservan su ubicación y comportamiento?
5. ¿Los enlaces y selectores de fecha son cómodos en móvil y con teclado?

## Validación histórica — 03/11/2026

Capturas para revisión: [expediente móvil](../../../tests/visual/__screenshots__/machine-record--normal--movil.png), [filtros en escritorio](../../../tests/visual/__screenshots__/work-orders-filtered--normal--escritorio-amplio.png) y [ticket abierto desde orden](../../../tests/visual/__screenshots__/ticket-order-origin--normal--escritorio-amplio.png).

También se ajustó `tests/visual/review-page.ts` para esperar el foco y usar movimiento reducido al capturar el expediente después del desplazamiento.

- `pnpm check`: tipos, lint, formato, 88 pares de contraste, catálogo y 943 pruebas unitarias correctos.
- Build: 14 tareas correctas. Se repitió tras un fallo transitorio de acceso a `next-env.d.ts` en Windows y se conservó el contenido local original.
- Integración: 181 pruebas en 21 archivos correctas.
- Linux: comparación final sin actualizar imágenes, **252 casos correctos en 2,7 minutos**, sin fallos ni reintentos fallidos: 104 de accesibilidad, 144 visuales y cuatro recorridos funcionales. No se aumentaron tolerancias ni se desactivaron comprobaciones.
