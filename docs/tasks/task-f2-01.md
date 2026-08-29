# TASK-F2-01 — Modelar infraestructura como código

- Estado: **Implementada; apply externo pendiente**
- Fecha de corte: 25/08/2026
- Fuentes: `context/TASKS.md`, `context/Implementation_Plan.md`, ADR-015 y ADR-018.

## Entrega

Módulos Terraform para plataforma, base, objetos, colas, identidad, secretos, observabilidad, edge y backup; cuatro raíces aisladas.

## Validación

`node scripts/check-phase2-infrastructure.mjs` pasa. Las cuatro raíces pasaron `terraform init -backend=false` y `terraform validate` localmente con Terraform 1.11.4; CI repite esa validación.

## Riesgo o validación manual

Hace falta elegir región tras revisión de residencia, configurar backend HTTP y suministrar credenciales protegidas.

No se utilizaron datos reales, credenciales, valores regulatorios ni una aprobación humana ficticia.
