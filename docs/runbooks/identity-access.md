# Runbook — acceso, sesiones y recuperación de identidad

## Alertas iniciales

- Pico de `LOGIN_FAILED`: revisar rate limit, SMTP/proveedor y posible credential stuffing; no buscar contraseñas en logs.
- `OIDC discovery failed` o llave desconocida: comprobar issuer/JWKS, rotación y reloj; nunca fijar una llave JWT para “resolver” el incidente.
- Contexto rechazado: validar membresía, vigencia, modo de cuenta y revocación; no crear un override sin autorización.
- Auditoría BFF no disponible: tratar como degradación de seguridad; Supabase conserva eventos del proveedor, pero se debe reconciliar y restaurar el canal.

## Revocación

1. Una persona usuaria cierra una sesión propia o todas las suyas desde Perfil.
2. El propietario sólo revoca contextos de su cuenta mediante el endpoint administrativo correspondiente cuando se habilite su UI.
3. ICE24 Admin puede revocar globalmente en Supabase y debe revocar contextos locales.
4. Confirmar el evento `SESSION_REVOKED`, `CONTEXT_REVOKED` o `SESSIONS_REVOKED_GLOBAL` con `correlation_id`.

## Recuperación manual

Seguir `docs/product/identity-recovery.md`. Nunca solicitar contraseña, semilla o código. El operador A y el operador B deben ser usuarios distintos, ninguno puede ser el sujeto, ambos usan AAL2 y registran referencias de evidencia, no copias sensibles. Sólo después de dos aprobaciones se emite restablecimiento Supabase y se revocan sesiones.

## Rotación de secretos

Rotar `BFF_SESSION_SECRET` invalida cookies existentes; programar aviso. Rotar `BFF_API_SHARED_SECRET` coordinadamente entre API y BFF. Rotar `SUPABASE_SERVICE_ROLE_KEY` sólo en almacén de secretos; confirmar que nunca apareció en bundle, navegador o logs.

## Verificación posterior

- Login válido e inválido producen auditoría sin secretos.
- TOTP eleva a `aal2`; una acción crítica con `aal1` recibe 403.
- Una cuenta A no activa ni consulta un recurso de B.
- Modo lectura permite consulta autorizada y niega escritura.
- Revocación surte efecto en la siguiente llamada, no sólo al recargar la UI.
