# Runbook — Colas y scheduler

PGMQ mantiene `general_jobs`, `pdf_jobs`, `domain_events` y sus DLQ. `infra.enqueue_job` registra primero un outbox con clave idempotente y el scheduler despacha filas pendientes. `infra.fail_job` aplica backoff exponencial o envía a DLQ.

## Verificación

`pnpm exec supabase test db` valida las cuatro colas, idempotencia, reintento y DLQ mediante pgTAP. La suite requiere Supabase local o CI con runtime Docker.

## Diagnóstico

1. Revisar `infra.scheduler_heartbeats`; más de 10 minutos es alerta.
2. Consultar outbox sin despachar ordenado por `created_at`.
3. Medir edad/profundidad de cada cola y DLQ sin registrar payloads.
4. Para reintentar, corregir la causa y reenviar con la misma identidad de negocio; no copiar payloads manualmente sin autorización.
5. Archivar el mensaje original sólo cuando el resultado esté confirmado.

No se exponen esquemas PGMQ por Data API. Los workers usan conexión de servicio y propagan `traceparent`, `tracestate`, `baggage` y correlation ID en el sobre.

## Outbox de eventos de dominio (F5-05)

`infra.publish_outbox` corre cada minuto (`ice24_publish_outbox`) y publica en `domain_events`. Señales:

1. `select * from infra.outbox_status;` — `pending` creciente u `oldest_pending_seconds` mayor a 10 minutos es alerta; revisar primero el heartbeat del scheduler.
2. `failing > 0`: consultar `select id, event_type, attempt_count, last_error_code, available_at from infra.outbox_events where published_at is null and last_error_code is not null order by occurred_at limit 50;`. Errores típicos: cola inexistente (re-aplicar la migración de publicación) o PGMQ no disponible.
3. Tras corregir la causa, `select * from infra.publish_outbox(200);` publica lo vencido; los eventos con `available_at` futuro esperan su backoff. No editar ni borrar filas: los hechos son inmutables y el trigger lo rechaza.
4. Nunca desactivar los triggers de productores para destrabar una operación de negocio: un fallo del outbox aborta la transacción a propósito. Reparar hacia adelante.

Retención: no hay archivado automático de publicados en esta entrega; el crecimiento se vigila con `outbox_events_published` hasta definir la política (deuda F5-05).
