# TASK-F2-03 — Configurar PostgreSQL/PostGIS administrado

- Estado: **Implementada; despliegue pendiente**
- Fecha de corte: 25/08/2026
- Fuentes: `context/TASKS.md`, `context/Implementation_Plan.md`, ADR-015 y ADR-018.

## Entrega

Proyecto Supabase por entorno, SSL obligatorio, timeout por entorno y extensiones PostGIS/PGMQ/pg_cron versionadas.

## Validación

Migración incluida en job CI con Supabase local; no ejecutable aquí sin Docker.

## Riesgo o validación manual

PITR y tamaño final dependen del plan contratado y de aprobar ADR-018.

No se utilizaron datos reales, credenciales, valores regulatorios ni una aprobación humana ficticia.
