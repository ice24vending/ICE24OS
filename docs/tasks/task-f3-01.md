# TASK-F3-01 — Supabase Auth, primer acceso, recuperación y TOTP

- Estado: **Implementada; PoC remota pendiente**
- Entrega: configuración invitation-only/TOTP, cliente OIDC Authorization Code + PKCE y flujos BFF de acceso, contraseña y recuperación.
- Evidencia: `supabase/config.toml`, `infra/terraform/modules/identity`, `apps/private-web/src/app/api/auth`.
- Validación: typecheck, build, sesión cifrada y verificador de Fase 3; el correo/TOTP real requiere proyecto y credenciales.
- Riesgo: cerrar SMTP, CAPTCHA, redirects y política de recuperación antes de producción.
