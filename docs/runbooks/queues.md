# Runbook — Colas y scheduler

PGMQ mantiene `general_jobs`, `pdf_jobs` y sus DLQ. `infra.enqueue_job` registra primero un outbox con clave idempotente y el scheduler despacha filas pendientes. `infra.fail_job` aplica backoff exponencial o envía a DLQ.

## Verificación

`pnpm exec supabase test db` valida las cuatro colas, idempotencia, reintento y DLQ mediante pgTAP. La suite requiere Supabase local o CI con runtime Docker.

## Diagnóstico

1. Revisar `infra.scheduler_heartbeats`; más de 10 minutos es alerta.
2. Consultar outbox sin despachar ordenado por `created_at`.
3. Medir edad/profundidad de cada cola y DLQ sin registrar payloads.
4. Para reintentar, corregir la causa y reenviar con la misma identidad de negocio; no copiar payloads manualmente sin autorización.
5. Archivar el mensaje original sólo cuando el resultado esté confirmado.

No se exponen esquemas PGMQ por Data API. Los workers usan conexión de servicio y propagan `traceparent`, `tracestate`, `baggage` y correlation ID en el sobre.
