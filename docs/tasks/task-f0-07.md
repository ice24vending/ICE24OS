# TASK-F0-07 — Identidad, 2FA, recuperación y sesiones

## Resultado

En revisión. [ADR-017](../decisions/adr-017-identity.md) adopta Keycloak, OIDC+PKCE+BFF, TOTP obligatorio para roles críticos y sesiones global/contexto. El [runbook](../product/identity-recovery.md) exige doble control.

## Cambios y trazabilidad

Archivos: ADR, runbook, RACI y estado. Traza PRD 7.1/15.2 y TRD 31–37. No se almacenan refresh tokens en JavaScript.

## Validación y pendientes

Revisión de amenazas documental. Pendiente PoC de Keycloak, evidencia legal de recuperación, configuración de correo y pruebas de revocación. Riesgo operativo: upgrades/backups de Keycloak.
