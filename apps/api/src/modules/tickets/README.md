# Tickets

F7-02: reporte inicial inmutable y diagnóstico versionado. El controlador aplica contratos, autenticación y autorización; `TicketsStore` orquesta transacciones y persistencia. No hay transición de estado ni asignación de órdenes en P2.

Contratos de lectura aprobados: `maintenance.ticket_machine_read`, `ticket_catalog_read`, `ticket_component_read` y `files.ticket_evidence_read`. Sus definiciones están en la migración F7-02. El módulo no modifica equipo/archivos ni accede a rutas de objetos. `audit.events` es el contrato central append-only de F5.

Identidad se reevalúa bajo bloqueo de contexto/cuenta; el ámbito del objeto precede al replay. Diagnóstico bloquea el ticket, exige versión y conserva motivo/antes/después. Un fallo de auditoría revierte la operación. No hay permisos de escritura implícitos para ICE24.

Ver [TASK-F7-02](../../../../../docs/tasks/task-f7-02.md).
