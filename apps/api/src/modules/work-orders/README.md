# Órdenes de trabajo — F7-03/04

API privada `/v1/work-orders`. Lista por cursor, detalle, opciones desde ticket/actividad, creación, asignación y transiciones. El controlador valida contexto y delega a la unidad transaccional; la tabla de estados y sus guardas residen en `@ice24/domain`.

Los contratos de equipo publicados por la migración permiten leer máquina/versión, conservar definición y modificar únicamente responsable/estado de una actividad. No se borran ni reescriben definiciones históricas. Las transiciones usan hechos de servidor: los requisitos de ejecución y revisión permanecen insatisfechos hasta P4/P5.

`If-Match` es la versión del origen al crear y de la orden al modificar. `Idempotency-Key` se vincula a actor, cuenta, operación y hash de datos/versión. Toda escritura y su auditoría confirman o revierten juntas. Un replay vuelve a comprobar contexto, permiso, ámbito y máquina vigente. Un cambio de sucursal bloquea mutaciones de la orden hasta revisión.

Permisos: `maintenance.orders-read/assign/execute/review`. OW/OP asignan; TC inicia solo su orden; AU/IO/IA leen en su ámbito. F7-D04 es provisional. Lectura y módulos deshabilitados se respetan en API/BFF. No se ofrecen descargas offline aún.

Diagnóstico operativo: correlación HTTP estándar y `audit.events` con `WorkOrderCreated`, `WorkOrderAssigned`, `WorkOrderTransitioned`, `TicketAssigned` y `TicketWorkOrderStarted`. Errores normalizados 400/403/404/409, sin datos de otros ámbitos. Ver `docs/runbooks/maintenance.md` y pruebas de integración `tests/integration/work-orders.test.ts`.
