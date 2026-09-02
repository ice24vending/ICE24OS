# TASK-F3-03 — Sesiones BFF seguras

- Estado: **Implementada**
- Entrega: cookie AES-256-GCM `HttpOnly`, `SameSite=Lax`, `Secure` en producción, máximo 12 horas, origen y CSRF en mutaciones.
- Evidencia: `apps/private-web/src/server/session` y rutas BFF.
- Validación: pruebas de round-trip, confidencialidad, alteración y expiración.
- Riesgo: rotación real y carga concurrente pendientes del ambiente.
