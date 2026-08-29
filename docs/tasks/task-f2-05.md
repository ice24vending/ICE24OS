# TASK-F2-05 — Configurar colas, DLQ y scheduler

- Estado: **Implementada; ejecución de integración pendiente**
- Fecha de corte: 25/08/2026
- Fuentes: `context/TASKS.md`, `context/Implementation_Plan.md`, ADR-015 y ADR-018.

## Entrega

PGMQ durable para general/PDF, DLQ separadas, outbox idempotente, retry exponencial y cron de despacho/heartbeat.

## Validación

El job Supabase CI aplica y lint-ea la migración, y ejecuta una suite pgTAP que verifica las cuatro colas, idempotencia, retry, DLQ, privacidad de buckets y RLS. Docker local no está disponible en esta máquina, por lo que la primera ejecución queda pendiente en CI.

## Riesgo o validación manual

Workers de dominio se incorporan en fases posteriores; actualmente sólo existen primitivas operativas.

No se utilizaron datos reales, credenciales, valores regulatorios ni una aprobación humana ficticia.
