# TASK-F3-06 — Selector y sesión de contexto

- Estado: **Implementada; E2E remoto pendiente**
- Entrega: listar contextos, activar sin nuevo login, revocar el anterior y UI responsive de selección.
- Evidencia: `identity.activate_context`, endpoints SES-003–006 y `/access/context`.
- Validación: pgTAP rechaza cuenta cruzada; API vuelve a comprobar vigencia en cada petición.
- Riesgo: probar cambio con trabajo offline pendiente cuando Fase 7 lo introduzca.
