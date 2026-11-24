# Tickets

F7-02: reporte inicial inmutable y diagnóstico versionado. El controlador aplica contratos, autenticación y autorización; `TicketsStore` orquesta transacciones y persistencia. No hay transición de estado ni asignación de órdenes en P2.

Contratos de lectura aprobados: `maintenance.ticket_machine_read`, `ticket_catalog_read`, `ticket_component_read` y `files.ticket_evidence_read`. Sus definiciones están en la migración F7-02. El módulo no modifica equipo/archivos ni accede a rutas de objetos. `audit.events` es el contrato central append-only de F5.

Identidad se reevalúa bajo bloqueo de contexto/cuenta; el ámbito del objeto precede al replay. Diagnóstico bloquea el ticket, exige versión y conserva motivo/antes/después. Un fallo de auditoría revierte la operación. No hay permisos de escritura implícitos para ICE24.

Ver [TASK-F7-02](../../../../../docs/tasks/task-f7-02.md).

UXD-07 añade filtros opcionales por estado de consulta, prioridad, sucursal, máquina, fechas del reporte y KPI. Conserva el cursor UUID y el límite de 1–100. Un único SELECT calcula la página y su total filtrado, junto con los KPI y las opciones de filtros de todo el ámbito autorizado; el cursor nunca reduce los KPI. Las fechas y «Resueltos hoy» usan `identity.accounts.details.timezone`, con `America/Mexico_City` como valor predeterminado.

Los joins de lectura con sucursales, órdenes y eventos se restringen por cuenta y parten de los tickets autorizados. Reportante y resolución provienen de eventos exitosos; no se altera identidad, auditoría ni órdenes. `displayState` refleja la orden vinculada cuando existe (completada/corregida, cancelada o en atención); `state` conserva exactamente su significado y valor anteriores para los clientes de campo. La fecha de resolución se obtiene de la transición auditada a completada/corregida, sin moverla por revisiones posteriores. Los paquetes anteriores siguen siendo válidos: todos los campos de respuesta nuevos son opcionales. No se requiere migración.

La web solicita `sort=recent`: orden `created_at DESC, id DESC` y cursor compuesto `YYYY-MM-DDTHH:mm:ss.ffffffZ|uuid`, conservando los microsegundos de PostgreSQL y resolviendo empates por UUID. El cliente debe devolver `nextCursor` sin modificarlo, junto con el mismo `sort` y filtros. Sin `sort`, se conserva `id ASC`, cursor UUID y condición `id > cursor`, como requiere la app de campo. Cada modo rechaza los cursores del otro. Los cambios de filtro reinician la paginación; los KPI siguen calculándose sobre todo el ámbito autorizado.
