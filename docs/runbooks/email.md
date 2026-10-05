# Runbook — Correo transaccional

Diseño en el [módulo de notificaciones](../modules/notifications.md#correo-transaccional-f5-12). El correo depende del outbox y del worker de eventos de dominio ([colas](queues.md)) y del [centro de notificaciones](notifications.md). Reporte de la tarea: [F5-12](../tasks/task-f5-12.md).

## Estado del proveedor

El proveedor productivo **no está aprobado** (ADR-019 «en revisión», DEC-019 y DEC-025). Hasta su aprobación sólo existe el adaptador local de desarrollo y pruebas. En staging y producción el worker arranca con `email_deliveries_disabled` (`EMAIL_PROVIDER_NOT_CONFIGURED` o `EMAIL_PROVIDER_PENDING_DECISION`), no consume la cola y los mensajes quedan `QUEUED` y visibles; no se pierden ni agotan reintentos. El webhook de seguimiento responde 503 `DEPENDENCY_UNAVAILABLE`.

## Configuración

| Variable                 | Servicio | Valor                                                                                                                         |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `EMAIL_PROVIDER`         | worker   | `local` sólo en `development`/`test` (captura en memoria, no envía). Cualquier otro valor deja el envío deshabilitado.        |
| `PRIVATE_WEB_URL`        | worker   | Origen de la aplicación privada para los enlaces del correo; HTTPS obligatorio fuera de desarrollo; sin ruta ni credenciales. |
| `EMAIL_WEBHOOK_PROVIDER` | api      | `local` sólo en `development`/`test`.                                                                                         |
| `EMAIL_WEBHOOK_SECRET`   | api      | Secreto HMAC de 32 o más caracteres del webhook local. Se gestiona como secreto ([secrets](secrets.md)); nunca en logs.       |

## Flujo y estados

`email.messages.status`: `QUEUED` (en cola o reintentando) → `SENT` (el proveedor lo aceptó) → `DELIVERED` o `BOUNCED` (webhook verificado). `FAILED`: reintentos agotados, rechazo permanente del proveedor, plantilla inválida o destinatario que perdió el acceso antes del envío (`RECIPIENT_NOT_AUTHORIZED`, terminal, no se envía). El historial está en `email.message_events` y la auditoría en `audit.events` con `entity_type = 'EmailMessage'`.

Política de la cola `email_deliveries`: visibilidad 60 s, 5 intentos, backoff 15 s × 2^(intento−1) con tope de 15 min y DLQ `email_deliveries_dlq`. Los trabajos son `EMAIL` en el [Centro de trabajos](queues.md).

## Fallos y acciones

| Síntoma                                                              | Causa probable y acción                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una alerta crítica no generó correo                                  | Revisar en orden: alerta creada ([runbook de notificaciones](notifications.md)); fila en `infra.processed_messages` con `consumer = 'email-alerts'`; `email.messages` por `origin_event_id`. Sólo las alertas `CRITICAL` envían correo, y sólo a destinatarios que conservan membresía y permiso de audiencia. |
| Mensajes `QUEUED` que no avanzan                                     | Log `email_deliveries_disabled`: no hay proveedor aprobado o `PRIVATE_WEB_URL` es inválido. Con proveedor: revisar `last_error_code` y `attempt_count` del mensaje y el trabajo `EMAIL` en `RETRY_WAIT` (`next_attempt_at`).                                                                                   |
| `PROVIDER_UNAVAILABLE`, `PROVIDER_TIMEOUT` o `PROVIDER_RATE_LIMITED` | Fallo transitorio del proveedor: se reintenta solo. Si persiste, revisar estado y cuota del proveedor; la operación de negocio continúa y la alerta sigue en el centro de avisos (TRD 30).                                                                                                                     |
| `PROVIDER_REJECTED` o `TEMPLATE_INVALID` (DLQ al primer intento)     | Rechazo permanente (dirección inválida, contenido rechazado) o variables fuera de la versión de plantilla. No reintentar sin corregir la causa: dirección del usuario en identidad, o defecto en el productor.                                                                                                 |
| Mensaje `FAILED` con trabajo `DEAD_LETTER`                           | Reintentos agotados. Corregir la causa y reintentar desde el Centro de trabajos (INT-004) con motivo; el mensaje vuelve a `QUEUED` (`EmailRequeued`) y conserva su clave de idempotencia, por lo que no se duplica si el proveedor ya lo había aceptado.                                                       |
| `RECIPIENT_NOT_AUTHORIZED`                                           | El usuario perdió membresía, quedó inactivo o le retiraron el permiso entre la alerta y el envío. Es correcto que no se envíe; no reintentar. La alerta en la aplicación no cambia.                                                                                                                            |
| Webhook 400 `INVALID_WEBHOOK_SIGNATURE`                              | Secreto distinto, cuerpo alterado o marca de tiempo fuera de ±5 min (reloj o reintento tardío). Verificar secreto y hora; el proveedor reintentará la entrega firmada.                                                                                                                                         |
| Webhook 409 `CONFLICT`                                               | El mismo `providerEventId` llegó con otro contenido. No se aplica; escalar al proveedor. Revisar `email.provider_events`.                                                                                                                                                                                      |
| Evento de seguimiento `PENDING`                                      | Llegó antes de registrar `SENT` (no se asume orden). Se aplica automáticamente al registrar el envío. Si permanece, no existe mensaje con ese `provider_message_id`: no es de esta plataforma o el envío nunca se registró.                                                                                    |
| Muchos `BOUNCED`                                                     | Direcciones inválidas o reputación del dominio. La supresión de rebotes y DKIM/SPF/DMARC dependen de la aprobación del proveedor (DEC-025); mientras tanto revisar las direcciones afectadas con Identidad sin exportarlas a tickets.                                                                          |

## Reintento manual

1. Localizar el trabajo: `select m.id, m.status, m.last_error_code, m.attempt_count, m.job_id from email.messages m where m.status = 'FAILED' order by m.updated_at desc limit 20;`.
2. Confirmar la causa corregida (proveedor disponible, dirección corregida, productor reparado). `RECIPIENT_NOT_AUTHORIZED` no se reintenta.
3. Reintentar desde el Centro de trabajos o `POST /internal/v1/jobs/{jobId}/retry` con `Idempotency-Key` y motivo (permiso `jobs.retry`). Queda auditado `JobRetryRequested` y, al procesarse, `EmailRequeued`.
4. Verificar `SENT` en el mensaje y, cuando haya proveedor, `DELIVERED` o `BOUNCED`.

## Consultas (rol de servicio)

- `select status, count(*) from email.messages where created_at > now() - interval '1 day' group by 1;`
- `select last_error_code, count(*) from email.messages where status in ('QUEUED','FAILED') group by 1;`
- `select outcome, count(*) from email.provider_events where received_at > now() - interval '1 day' group by 1;`
- `select operation, result, count(*) from audit.events where entity_type = 'EmailMessage' and occurred_at_utc > now() - interval '1 day' group by 1, 2;`

Las tablas no guardan direcciones (sólo `recipient_address_sha256`). No copiar direcciones, contenido renderizado ni secretos a tickets o logs; los logs técnicos redactan direcciones (`redactEmailAddresses`).

## Reversión operativa

- Detener el envío: retirar `EMAIL_PROVIDER` del worker (los mensajes quedan `QUEUED`) o quitar `emailAlertsConsumer` del registro (las alertas siguen creándose sin correo; los eventos quedan en outbox y auditoría).
- Detener el seguimiento: retirar `EMAIL_WEBHOOK_PROVIDER` (el webhook responde 503 y el proveedor reintenta).
- Retirar una versión de plantilla: migración que la marque `status = 'RETIRED'` (el rol de servicio no puede modificar el catálogo). Impide solicitar mensajes nuevos con ella; los existentes conservan y renderizan su versión.
- La migración es aditiva: no se eliminan tablas ni historial (los triggers impiden borrar). No hay reversión destructiva.
