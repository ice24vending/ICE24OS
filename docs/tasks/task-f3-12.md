# TASK-F3-12 — Auditoría de seguridad inicial

- Estado: **Implementada; retención pendiente**
- Entrega: login, fallo, recuperación, TOTP, contexto, cierre y alta registrados con correlación; tabla append-only.
- Evidencia: `audit.security_events`, trigger y canal interno BFF→API con secreto separado.
- Validación: pgTAP y verificador estructural; no se registran tokens/códigos/semillas.
- Riesgo: seleccionar backend, alertas y retención definitiva.
