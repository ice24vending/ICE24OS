# Runbook — Observabilidad

Las aplicaciones emiten logs JSON a stdout y trazas y métricas por OTLP/HTTP. `OTEL_ENABLED=false` es el modo seguro local. Para activar la exportación, definir un endpoint HTTPS y sus cabeceras en `OTEL_EXPORTER_OTLP_HEADERS`.

## Señales mínimas

- `x-correlation-id` en cada request, devuelto en la respuesta.
- W3C `traceparent` / `tracestate` entre API y workers.
- Contador y duración HTTP por método y código, sin rutas con IDs.
- Estado de readiness, edad de cola, DLQ y heartbeat.
- Campos de log: timestamp, level, service, environment, module, outcome y correlationId.
- F5-14: `ice24.integration.calls`, `ice24.integration.duration` e `ice24.integration.log_failures`, más los registros en `infra.integration_logs` ([módulo](../modules/integration-logs.md)).

No registrar autorización, cookies, tokens, correo, teléfono, contenido de archivos ni payloads. El dashboard portable está en `infra/observability/dashboard.json`: mapear sus consultas al backend elegido y probar las alertas con señales sintéticas.

## Rastrear un incidente por correlación (F5-14)

1. **Obtener la correlación.** Puede venir del error normalizado que ve la persona usuaria (`error.correlationId`), del encabezado `x-correlation-id` de la respuesta, del trabajo en el Centro de trabajos (`correlationId`), de `subscriptions.stripe_webhooks.correlation_id` o de `email.messages.correlation_id`.
2. **Consultar la cadena.** Como ICE24, con el permiso `integration-logs.read`, MFA y ámbito completo: `GET /api/v1/admin/integration-logs?correlationId=<uuid>&limit=100`. Las filas muestran en orden las llamadas salientes (Stripe, storage, correo, antimalware), las entregas de cola (`queue` / `message.consume`) y los webhooks de vuelta (`INBOUND`). La correlación de una entrega HTTP de webhook (`requestCorrelationId`) también encuentra la cadena que retomó.
3. **Leer cada fila.** `status` y `errorCode` dicen qué falló, `responseCode` qué respondió el proveedor, `retryable` si se reintenta solo y `attempt` en qué intento ocurrió. `effectKey` identifica el efecto (clave de idempotencia, id de mensaje, objeto) y `jobId` el trabajo.
4. **Recuperar.** Si `retryable` es verdadero, el reintento automático ya está programado (backoff de la cola). Si el trabajo quedó en `DEAD_LETTER`, abrir `jobId` en el Centro de trabajos, corregir la causa y reencolarlo con motivo (INT-004). Los efectos no se duplican: cada intento es una fila y los proveedores reciben la misma clave de idempotencia.
5. **Correlacionar con trazas y logs.** El mismo `correlationId` aparece en los logs JSON (`integration_call_failed` y los de cada módulo) y en la auditoría central (`audit.events.correlation_id`) cuando la acción es auditable.

Consulta SQL equivalente, con el rol de servicio y solo para diagnóstico:

```sql
select occurred_at, direction, integration, operation, provider, status, response_code, error_code,
  attempt, effect_key, job_id, details
from infra.integration_logs
where correlation_id = '<uuid>' or request_correlation_id = '<uuid>'
order by occurred_at;
```

| Síntoma                                                                    | Causa probable y acción                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La cadena se corta después de `webhook.receive` de Stripe                  | Evento distinto de `checkout.session.*`: conserva la correlación de su primera entrega. Buscar el evento por `effect_key` (id `evt_...`) y la suscripción por cuenta.                                                                       |
| `message.consume` con `RETRY_WAIT` o `FAILED` repetidos                    | El consumidor o proveedor falla. El `errorCode` de la fila saliente previa (p. ej. `PROVIDER_UNAVAILABLE`) indica cuál. Revisar el trabajo en el Centro de trabajos.                                                                        |
| `object_storage` con `response_code` 4xx                                   | Llave o bucket inválidos, u objeto ausente (`object.stat` 400/404 es normal antes de subir). Un 5xx es indisponibilidad: se reintenta.                                                                                                      |
| `antimalware` con `SCANNER_TIMEOUT`                                        | El motor no respondió y el archivo sigue en cuarentena ([runbook de archivos](object-storage.md)).                                                                                                                                          |
| Log `INTEGRATION_LOG_UNAVAILABLE` o alerta `integration-log-store-failing` | La base de datos no aceptó el registro. La integración siguió funcionando; revisar la conexión del servicio y la restricción `integration_logs_no_sensitive` (una violación indica un dato sensible que el adaptador debe dejar de enviar). |
| Respuesta 403 de la consulta                                               | Falta `integration-logs.read`, MFA o contexto vigente. Sin ámbito completo solo se ven filas de la cuenta activa.                                                                                                                           |

## Retención de los logs de integración

`INTEGRATION_LOG_RETENTION_DAYS` (1–3650) activa la tarea diaria `observability.integration-log-retention` del scheduler. Se configura con la variable Terraform `integration_log_retention_days` del módulo `observability`. Sin valor no se purga nada: el periodo depende de la pregunta 92 del PRD y de DEC-008. Las purgas aparecen como ventanas del scheduler, con `purged` en sus contadores ([runbook del scheduler](scheduler.md)).
