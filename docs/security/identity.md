# Seguridad — Supabase Auth de Fase 2

Cada ambiente usa un proyecto distinto. El alta pública está deshabilitada; `site_url` y redirects están allowlisted. La API descubre llaves mediante `/auth/v1/.well-known/openid-configuration`; no fija secretos JWT en código.

TOTP está disponible en Supabase, pero su flujo, AAL2 y recuperación se implementan y prueban en Fase 3. El service role nunca llega al navegador. Antes del alta remota se revisan residencia, DPA, SMTP, expiración de sesión, CAPTCHA y responsables de recuperación.
