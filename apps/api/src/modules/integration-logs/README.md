# Logs de integración

Módulo de plataforma para F5-14. Es global: provee `INTEGRATION_TRACER` a los adaptadores de Stripe, almacenamiento y seguimiento de correo, y publica la consulta de diagnóstico de RF-ADM-009.

- **Datos:** `infra.integration_logs`, append-only, escrito solo con `infra.record_integration_log`. El rol de servicio lee y ejecuta la función; nunca inserta, actualiza ni borra directamente. Los valores van redactados en `@ice24/observability` y la restricción `integration_logs_no_sensitive` los vuelve a verificar.
- **Escritura:** `IntegrationLogsDatabase` implementa `IntegrationLogSink` con su propio pool (2 conexiones, 5 s). Sin `DATABASE_URL` el tracer conserva métricas y logs de fallo.
- **Consulta:** `GET /api/v1/admin/integration-logs` con `integration-logs.read` (RESTRICTED, rol IA) y MFA. El ámbito completo ve todas las cuentas; cualquier otro ámbito, solo la cuenta del contexto activo. Filtros por correlación (incluida la de entrega del webhook), integración, estado, dirección, cuenta y fechas, con cursor por fecha e id.
- **Errores:** siguen `ApiError` (400 filtro o cursor inválido, 401, 403). La respuesta es `no-store`.
- **Eventos y métricas:** no publica eventos de dominio. Las métricas son `ice24.integration.calls`, `ice24.integration.duration` e `ice24.integration.log_failures`.

Diseño en el [módulo](../../../../../docs/modules/integration-logs.md), operación en el [runbook de observabilidad](../../../../../docs/runbooks/observability.md) y [reporte F5-14](../../../../../docs/tasks/task-f5-14.md).
