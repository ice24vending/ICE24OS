# Seguridad — Supabase Auth de Fase 2

Cada ambiente usa un proyecto distinto. El alta pública está deshabilitada; `site_url` y redirects están allowlisted. La API descubre llaves mediante `/auth/v1/.well-known/openid-configuration`; no fija secretos JWT en código.

TOTP está disponible en Supabase, pero su flujo, AAL2 y recuperación se implementan y prueban en Fase 3. El service role nunca llega al navegador. Antes del alta remota se revisan residencia, DPA, SMTP, expiración de sesión, CAPTCHA y responsables de recuperación.

## Implementación de Fase 3

El BFF conserva access/refresh tokens en una cookie cifrada `HttpOnly`, `SameSite=Lax` y `Secure` en producción; las mutaciones validan origen y token CSRF. También implementa Authorization Code + PKCE para el cliente OIDC y no utiliza `localStorage`. La API valida RS256, `kid`, issuer, audience y expiración mediante discovery/JWKS.

La configuración local habilita TOTP y contraseña mínima de 12 caracteres. Roles IA, OW y SA requieren AAL2 en las operaciones críticas aplicables. `SUPABASE_SERVICE_ROLE_KEY`, `BFF_SESSION_SECRET` y `BFF_API_SHARED_SECRET` son secretos sólo de servidor y nunca usan prefijo `NEXT_PUBLIC_`.

Los eventos de acceso se escriben en `audit.security_events`; la tabla rechaza UPDATE/DELETE. La validación contra un proyecto remoto, SMTP y factores reales continúa como gate operativo explícito.
