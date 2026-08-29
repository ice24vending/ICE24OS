# Runbook — Observabilidad

Las aplicaciones emiten logs JSON a stdout y trazas/métricas por OTLP/HTTP. `OTEL_ENABLED=false` es el modo seguro local. Para activar, definir un endpoint HTTPS y cabeceras en `OTEL_EXPORTER_OTLP_HEADERS`.

## Señales mínimas

- `x-correlation-id` por request.
- W3C `traceparent`/ `tracestate` entre API y workers.
- contador y duración HTTP por método/código, sin rutas con IDs.
- estado de readiness, edad de cola, DLQ y heartbeat.
- campos de log: timestamp, level, service, environment, module, outcome, correlationId.

No registrar autorización, cookies, tokens, correo, teléfono, contenido de archivos ni payloads. El dashboard portable está en `infra/observability/dashboard.json`; mapear consultas al backend elegido y probar alertas con señales sintéticas.
