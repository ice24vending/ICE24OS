# Runbook — Mantenimiento programado

Aplicar `20261102000100_phase7_scheduling.sql` antes de desplegar API/worker. No se ha aplicado a ningún entorno remoto desde esta tarea. El calendario sigue en `equipment.scheduled_activities`; la API consulta la vista privada `maintenance.scheduled_activity_read`.

Si falta el KPI, comprobar permiso `maintenance.read`, módulo habilitado y contexto activo. Un fallo del servicio no equivale a cero actividades. Si faltan actividades, revisar jobs de recálculo, componentes propios activos, frecuencia efectiva y zona IANA de sucursal; conservar los atrasos y reprocesar mediante el flujo de trabajos existente, nunca borrando registros. Los cambios efectivos generan auditoría con contexto WORKER y correlación.

Reversión: volver primero a API/worker anteriores; conservar columnas y registros. Retirar vista y permiso solo cuando no tengan consumidores. La reversión no debe eliminar el historial ni los atrasos.

## Incidente local de Docker (02/11/2026)

Testcontainers y las baselines Linux requieren un daemon accesible. En el primer intento Docker Desktop falló al iniciar con `sailor-ingest.sock: The file cannot be accessed by the system`. Iniciar Docker y comprobar `docker info` antes de repetir `pnpm test:integration`, `pnpm test:ui:update` y `pnpm test:ui`. No sustituir las baselines por capturas Windows. No se borraron volúmenes, imágenes ni configuración. Si persiste, soporte de Docker debe reparar la instalación; no realizar un factory reset sin autorización.

Ante cambios de interfaz, regenerar `pnpm ux:snapshots` y `pnpm ux:walkthroughs`, revisar diferencias y registrar la firma UX. Preview sigue desactivado conforme a ADR-026.

Resuelto tras el inicio manual de Docker por el usuario. Daemon 29.7.2 verificado; la repetición de integración aprobó 154 pruebas en 19 suites. Evidencia: docs/qa/phase-7/evidence/20261102-integration-docker-verified.txt.

También pasaron la generación y la comparación Linux: 1687 pruebas por ejecución y 976 baselines. Su aprobación UX sigue pendiente; detalle en docs/qa/phase-7/linux-validation.md.
