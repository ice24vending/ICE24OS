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

La barra es desplegable, cerrada cuando no hay filtros activos, y distribuye los campos en una fila en escritorio. Se adapta a columnas en anchos menores. Cambiar una opción envía la consulta GET al servidor; se conserva también Aplicar y Limpiar. La interfaz indica carga, cantidad de resultados en la página y la restricción cuando el contexto fija una máquina. Los filtros se combinan sobre la consulta completa, no sobre las filas de la página en memoria. Las opciones de máquina provienen del selector autorizado; un responsable seleccionado permanece visible aunque la combinación devuelva cero filas. El cursor se reinicia al cambiar filtros.

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

## Validación

Capturas para revisión: [expediente móvil](../../../tests/visual/__screenshots__/machine-record--normal--movil.png), [filtros en escritorio](../../../tests/visual/__screenshots__/work-orders-filtered--normal--escritorio-amplio.png) y [ticket abierto desde orden](../../../tests/visual/__screenshots__/ticket-order-origin--normal--escritorio-amplio.png).

También se ajustó `tests/visual/review-page.ts` para esperar el foco y usar movimiento reducido al capturar el expediente después del desplazamiento.

- `pnpm check`: tipos, lint, formato, 88 pares de contraste, catálogo y 943 pruebas unitarias correctos.
- Build: 14 tareas correctas. Se repitió tras un fallo transitorio de acceso a `next-env.d.ts` en Windows y se conservó el contenido local original.
- Integración: 181 pruebas en 21 archivos correctas.
- Linux: comparación final sin actualizar imágenes, **252 casos correctos en 2,7 minutos**, sin fallos ni reintentos fallidos: 104 de accesibilidad, 144 visuales y cuatro recorridos funcionales. No se aumentaron tolerancias ni se desactivaron comprobaciones.
