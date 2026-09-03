# Módulo de identidad y autorización — Fase 3

Fecha de corte: 29 de agosto de 2026. Fuentes: PRD 7.1 y 15.2; TRD 31–37 y 80; Architecture 13, 16, 25 y 29; Database “Identidad, autorización y organizaciones”; API SES-001–023 y ADM-003; ADR-017; `AUTHZ-BASE-v0.1`.

## Límite del módulo

Supabase Auth demuestra la identidad y conserva credenciales, factores TOTP y sesión global. ICE24 OS conserva el perfil local, cuentas, membresías, roles, ámbitos, sesiones de contexto, recuperación administrativa y auditoría. Los roles de negocio nunca se toman de metadatos del proveedor como fuente de verdad.

No existe registro público. ICE24 Admin crea una cuenta y envía una invitación privada al propietario principal; después el propietario autorizado administra asociaciones dentro de su cuenta. Un usuario puede pertenecer a varias cuentas sin duplicar su identidad.

## Flujos implementados

- Acceso por correo mediante el BFF y acceso OIDC Authorization Code + PKCE para un cliente configurado.
- Cookie de sesión cifrada, `HttpOnly`, `SameSite=Lax`, `Secure` en producción, 12 horas máximas y sin tokens en `localStorage`.
- Cambio de contraseña inicial y recuperación normal sin revelar si un correo existe.
- Alta, challenge y verificación TOTP mediante Supabase Auth. La API exige `aal2` en operaciones críticas.
- Sincronización del perfil local por `sub`; una invitación pendiente se enlaza por correo normalizado sin crear un usuario duplicado.
- Selección de cuenta sin nuevo login; el cambio revoca el contexto anterior de la misma sesión de identidad.
- Cierre de contexto, sesión propia y todas las sesiones, con revocación local y global.
- Recuperación manual con versión esperada, prohibición de autoaprobación y dos operadores distintos.

## Autorización

`@ice24/authorization` combina RBAC y ABAC. Evalúa membresía, vigencia del contexto, cuenta del recurso, modo de acceso, permiso explícito, `DENY`, clasificación, sucursal, máquina y AAL. El orden es deliberado y niega por defecto. En modo `READ_ONLY` se conservan lecturas autorizadas y se bloquean mutaciones.

Los controladores privados usan un guard OIDC que valida firma RS256, `kid`, emisor, audiencia y expiración contra discovery/JWKS. El segundo guard requiere una política explícita; si falta, deniega. Para deep links, un recurso fuera del contexto se resuelve como 404 y no expone metadatos.

## Datos y defensa en profundidad

La migración `20260829000100_phase3_identity.sql` crea los esquemas `identity`, `authz` y `audit`, nueve roles base, permisos iniciales, membresías, overrides, ámbitos, invitaciones, contextos, recuperaciones y eventos. Todos los objetos tienen RLS habilitado y no se conceden al navegador `anon`/`authenticated`; el API usa el rol de servicio. Los eventos de seguridad son append-only mediante trigger.

La migración no crea tablas de sucursal, máquina o negocio adelantadas. Los ámbitos conservan UUID opcionales y las llaves foráneas se incorporarán cuando sus agregados nazcan en las fases autorizadas.

## API entregada

- `GET/PATCH /v1/me`, `GET /v1/me/contexts`.
- `POST /v1/session-contexts`, `GET/DELETE /v1/session-contexts/current`.
- `GET /v1/me/sessions`, `DELETE /v1/me/sessions/:id`, `POST /v1/me/sessions/revoke-all`.
- `POST /v1/admin/accounts` con invitación Supabase del propietario.
- `POST /v1/identity-recovery-cases` y `POST /v1/identity-recovery-cases/:id/approvals`.
- Canal interno BFF→API autenticado por secreto separado para auditoría de eventos previos a una sesión.

## Configuración requerida

`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_CLIENT_ID`, `PRIVATE_API_URL`, `PRIVATE_WEB_URL`, `BFF_SESSION_SECRET` y `BFF_API_SHARED_SECRET`. Ningún valor real se versiona y ninguna variable con secreto lleva prefijo `NEXT_PUBLIC_`.

## Observabilidad y privacidad

Se registran éxito/fallo de login, TOTP, recuperación, cierre y activación de contexto con correlación. Antes de autenticar, el BFF sólo envía un hash SHA-256 del identificador normalizado. No se registran contraseña, refresh token, código TOTP, semilla, llave de servicio ni evidencia sensible.

## Validación

Las unitarias cubren cookies cifradas y resistentes a alteración, RBAC/ABAC positivo y negativo, AAL2, modo lectura, aislamiento y códigos 401/403/404. pgTAP cubre estructuras, RLS, contextos cruzados, auditoría y recuperación a dos personas. La prueba remota contra un proyecto Supabase, SMTP y TOTP real requiere credenciales y permanece como gate operativo; no se reemplaza por una afirmación ficticia.
