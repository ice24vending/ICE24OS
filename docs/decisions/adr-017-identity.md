# ADR-017 — Identidad, 2FA, recuperación y sesiones

- Estado: en revisión de Seguridad y Operación.
- Fecha: 17/08/2026.

## Decisión

Usar Keycloak estable en Cloud Run con una instancia mínima, Cloud SQL y OIDC Authorization Code + PKCE mediante patrón BFF. El navegador recibe cookie `HttpOnly`, `Secure` y `SameSite=Lax`; no conserva refresh tokens. Keycloak autentica; ICE24 OS autoriza mediante RBAC+ABAC y denegación por defecto.

La sesión global representa identidad y la sesión de contexto representa una relación con una cuenta. Un propietario puede revocar sólo su contexto; ICE24 puede revocar la identidad global. La API valida asociación y contexto en cada comando.

## Política inicial

| Control | Valor propuesto |
|---|---|
| Access token | 5 minutos |
| Sesión BFF inactiva | 30 minutos en administración; 8 horas en vista de campo con pantalla bloqueada/reauth para acción sensible |
| Duración absoluta | 12 horas |
| Recordar dispositivo | Deshabilitado en piloto |
| Reautenticación | cambios de permisos, publicación, recuperación, exportación completa y acciones ICE24 críticas |
| 2FA | TOTP obligatorio para ICE24 Admin, propietarios, responsables sanitarios y quien publique; opcional para otros roles en MVP-1 |
| Intentos | política progresiva y bloqueo temporal en Keycloak; sin revelar existencia de cuenta |

## Recuperación

La recuperación normal usa enlace de un solo uso enviado al correo verificado. La pérdida de correo o TOTP sigue el [runbook de recuperación](../product/identity-recovery.md), exige dos personas, revocación de sesiones y auditoría. Soporte nunca ve ni establece una contraseña permanente.

## Alternativas descartadas

- Autenticación propia: eleva riesgo y trabajo sin ventaja de dominio.
- Roles de negocio dentro de Keycloak: no modelan cuenta, máquina, sensibilidad ni estados.
- Refresh token en `localStorage`: exposición innecesaria ante XSS.
- 2FA opcional para administradores: riesgo desproporcionado sobre datos multiempresa.

Consecuencia: Keycloak se vuelve componente crítico con backups, monitoreo, staging y prueba de actualización. Antes de producción se requiere PoC de cierre global/contextual y recuperación.

Fuentes: PRD 7.1, 15.2; TRD 31–37 y 80; Architecture 13 y 16.
