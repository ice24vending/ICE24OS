# TASK-F2-09 — Definir health checks y dashboards

- Estado: **Implementada**
- Fecha de corte: 25/08/2026
- Fuentes: `context/TASKS.md`, `context/Implementation_Plan.md`, ADR-015 y ADR-018.

## Entrega

API expone `/v1/health`, `/live`, `/ready`; workers exponen liveness/readiness y contenedores verifican readiness.

## Validación

Contratos y controladores tienen pruebas; dashboard JSON es validado automáticamente.

## Riesgo o validación manual

Los probes de base/colas se conectarán cuando los adaptadores de aplicación consuman esas dependencias.

No se utilizaron datos reales, credenciales, valores regulatorios ni una aprobación humana ficticia.
