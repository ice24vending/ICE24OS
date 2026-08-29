# TASK-F2-10 — Crear pipeline de despliegue y promoción

- Estado: **Implementada; ejecución remota pendiente**
- Fecha de corte: 25/08/2026
- Fuentes: `context/TASKS.md`, `context/Implementation_Plan.md`, ADR-015 y ADR-018.

## Entrega

Workflow manual plan/apply, GitHub Environments, plan inmutable, gate de producción, migraciones y rollback documentado.

## Validación

Validador exige plan/apply/gate; workflow de infraestructura valida Terraform por entorno.

## Riesgo o validación manual

Debe configurarse backend HTTP, secrets, protección de ambientes y ejecutar un primer despliegue de desarrollo.

No se utilizaron datos reales, credenciales, valores regulatorios ni una aprobación humana ficticia.
