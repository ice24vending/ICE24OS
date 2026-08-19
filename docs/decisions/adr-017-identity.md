# ADR-017 — Identidad, 2FA, recuperación y sesiones

- Estado: en revisión de Seguridad y Operación.
- Fecha: 18/08/2026.

## Decisión

Usar **Supabase Auth** como proveedor de identidad mediante Authorization Code + PKCE y patrón BFF. El navegador recibe una cookie `HttpOnly`, `Secure` y `SameSite=Lax`; no conserva refresh tokens accesibles a JavaScript. Supabase autentica; ICE24 OS autoriza mediante RBAC+ABAC, validación en servidor, Row Level Security como defensa adicional y denegación por defecto.

La sesión global representa identidad y la sesión de contexto representa una relación con una cuenta. Un propietario puede revocar sólo su contexto; ICE24 puede revocar la identidad global. La API valida asociación y contexto en cada comando.

## Política inicial

| Control | Valor propuesto |
|---|---|
| Access token | Duración mínima compatible con Supabase; objetivo de 5 minutos sujeto a PoC |
| Sesión BFF inactiva | 30 minutos en administración; 8 horas en vista de campo con pantalla bloqueada o reautenticación para acción sensible |
| Duración absoluta | 12 horas |
| Recordar dispositivo | Deshabilitado en piloto |
| Reautenticación | Cambios de permisos, publicación, recuperación, exportación completa y acciones ICE24 críticas |
| 2FA | TOTP obligatorio para ICE24 Admin, propietarios, responsables sanitarios y quien publique; opcional para otros roles en MVP-1 |
| Intentos | Protección progresiva y bloqueo temporal sin revelar existencia de cuenta; validar capacidades y controles adicionales en PoC |

## Recuperación

La recuperación normal usa un enlace de un solo uso enviado al correo verificado. La pérdida de correo o TOTP sigue el [runbook de recuperación](../product/identity-recovery.md), exige dos personas, revocación de sesiones y auditoría. Soporte nunca ve ni establece una contraseña permanente.

## Alternativas descartadas

- Autenticación propia: eleva riesgo y trabajo sin ventaja de dominio.
- Roles de negocio dentro del proveedor de identidad: no modelan cuenta, máquina, sensibilidad ni estados.
- Refresh token en `localStorage`: exposición innecesaria ante XSS.
- 2FA opcional para administradores: riesgo desproporcionado sobre datos multiempresa.

Consecuencia: Supabase Auth se vuelve un componente crítico. Antes de producción se requiere una PoC de cierre global y contextual, recuperación, MFA, revocación y propagación segura de claims.

Fuentes: PRD 7.1, 15.2; TRD 31–37 y 80; Architecture 13 y 16; ADR-015.
