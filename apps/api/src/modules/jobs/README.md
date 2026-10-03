# Trabajos asíncronos

Módulo de plataforma para F5-07. Application autoriza el ámbito, Infrastructure usa funciones `infra.*` de PostgreSQL y el adaptador HTTP publica JOB-001, el centro de trabajos y el reproceso INT-004.

- Datos: `infra.async_jobs` (estado actual) e `infra.async_job_transitions` (historial append-only). El worker registra cada entrega de `domain_events`; el rol de servicio no puede actualizar jobs directamente.
- Lectura de cuenta (JOB-001): `jobs.read`, sólo jobs de la cuenta activa y estados públicos `queued/processing/completed/failed`.
- Centro global: `jobs.admin-read` con MFA y ámbito completo (IA). Lista con cursor, detalle con historial y vista de colas, DLQ y outbox. Nunca expone payloads ni `error_detail_restricted`.
- Reproceso (INT-004): `jobs.retry` con MFA, `Idempotency-Key` y motivo de 10 a 1000 caracteres. `infra.retry_dead_letter_job` mueve el mensaje de la DLQ a su cola, deja el job en `QUEUED`, registra la transición con actor y motivo y escribe la auditoría central `JobRetryRequested`, todo en una transacción.
- Errores HTTP siguen ApiError: 404 job inexistente o fuera de ámbito, 409 estado no reintentable o mensaje muerto ausente.

Operación en el [runbook de colas](../../../../../docs/runbooks/queues.md) y [reporte F5-07](../../../../../docs/tasks/task-f5-07.md).
