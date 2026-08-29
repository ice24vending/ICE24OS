# TASK-F2-06 — Configurar Supabase Auth no productivo

- Estado: **Implementada como configuración; endpoint remoto pendiente**
- Fecha de corte: 25/08/2026
- Fuentes: `context/TASKS.md`, `context/Implementation_Plan.md`, ADR-015 y ADR-018.

## Entrega

Auth invitation-only, redirects allowlisted, contraseña mínima y discovery OIDC documentado por proyecto.

## Validación

Terraform valida la configuración; el endpoint real requiere crear un proyecto no productivo.

## Riesgo o validación manual

La PoC de acceso/TOTP pertenece a F3 y siguen pendientes responsables humanos de recuperación.

No se utilizaron datos reales, credenciales, valores regulatorios ni una aprobación humana ficticia.
