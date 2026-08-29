# TASK-F2-02 — Crear ambientes development, test, staging y production

- Estado: **Implementada; alta externa pendiente**
- Fecha de corte: 25/08/2026
- Fuentes: `context/TASKS.md`, `context/Implementation_Plan.md`, ADR-015 y ADR-018.

## Entrega

Raíces independientes con estado remoto, URLs, variables y gates propios; `provision_cloud=false` por defecto.

## Validación

Contrato estático de aislamiento pasa; pipeline selecciona un GitHub Environment protegido.

## Riesgo o validación manual

Las cuentas/proyectos reales no existen hasta ejecutar el pipeline autorizado.

No se utilizaron datos reales, credenciales, valores regulatorios ni una aprobación humana ficticia.
