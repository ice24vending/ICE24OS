# TASK-F2-12 — Probar backup y restauración inicial

- Estado: **Automatizada; evidencia remota pendiente**
- Fecha de corte: 25/08/2026
- Fuentes: `context/TASKS.md`, `context/Implementation_Plan.md`, ADR-015 y ADR-018.

## Entrega

Política RPO/RTO codificada, manifiesto SHA-256 de objetos, runbook de dump/restore y checklist trimestral.

## Validación

La CI valida estructura; la prueba destructiva sólo se ejecuta contra un proyecto de recuperación designado.

## Riesgo o validación manual

No se afirmó una restauración: requiere dos proyectos de prueba, Docker/CLI y aprobación de continuidad.

No se utilizaron datos reales, credenciales, valores regulatorios ni una aprobación humana ficticia.
