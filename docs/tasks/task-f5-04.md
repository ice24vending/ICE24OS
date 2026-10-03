# TASK-F5-04 — Auditoría append-only y filtros globales/de cuenta

Estado: implementación completa de persistencia, API, productores y visor web; validación local en verde el 02/10/2026 y lista para revisión en PR hacia `main`. Rama `codex/f5-04-append-only-audit`.

## Alcance y trazabilidad

- TASKS F5-04; API AUD-001, AUD-002, AUD-003; Database `audit_events`.
- PRD HU-AUD-01, HU-AUD-02, CU-39, RF-ADM-009; TRD auditoría transaccional.
- Dependencias: F3-02 y F1-07 implementadas; Fase 4 cerrada. Autorización explícita para iniciar este paquete.
- Contratos, migraciones aditivas Supabase, módulo NestJS, productores transaccionales, visor en `/audit`, BFF de lectura y pruebas.

## Criterios de aceptación

- Eventos persistidos consultables e inmutables: PostgreSQL rechaza UPDATE, DELETE y TRUNCATE, incluso ejecutados por el propietario mediante SQL normal.
- El rol de aplicación solamente recibe SELECT/INSERT; anon y authenticated no reciben acceso directo.
- Eventos con actor, IP opcional, contexto, correlación, valores relevantes, origen y resultado.
- Listado y detalle limitados por cuenta y ámbito de sucursal/máquina; filtros no amplían permisos.
- Consulta global requiere permiso específico, MFA y ámbito completo.
- Cursor estable por timestamp e ID, límites 1–100 y validación estricta de filtros.
- Pruebas negativas de aislamiento, permisos, inmutabilidad y transacciones; `pnpm check` ejecutado y resultados reales registrados.
- Visor responsive con filtros de fechas UTC, tipo, actor, resultado y ámbito; paginación anterior/siguiente, detalle, carga, vacío, error y reintento.
- Cambios de suscripción, asignación de demos, eventos de identidad y cambios de permisos se confirman en auditoría central dentro de la transacción original.

## Contrato AuditEvent v1

| Grupo        | Campos                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------- |
| Identidad    | id generado por servidor, eventVersion=1, entityType, entityId, operation                     |
| Fechas       | occurredAt UTC, timeZone capturada, occurredAtLocal derivada, createdAt de base               |
| Actor        | actorType USER/SYSTEM/STRIPE; actorUserId; contextSessionId                                   |
| Ámbito       | accountId, branchId, machineId; nulos para eventos globales                                   |
| Evidencia    | previousValues, newValues, reason, result SUCCESS/DENIED/FAILED                               |
| Origen       | origin WEB/API/WORKER/OFFLINE_SYNC/WEBHOOK/ADMIN, ipAddress IPv4/IPv6 opcional, deviceSummary |
| Trazabilidad | correlationId UUID                                                                            |

Los resúmenes admiten valores escalares y listas acotadas de strings seleccionados explícitamente (roles, permisos y ámbitos), nunca objetos de request, credenciales ni cuerpos de proveedores. IP y evidencia se clasifican RESTRICTED. No se inventa una política de retención. Los actores no humanos no suplantan usuarios ni sesiones.

`appendAuditEvent(client, event)` utiliza el cliente de la transacción de negocio. Para los productores existentes, triggers AFTER INSERT de `subscriptions.events`, `equipment.events` y `audit.security_events` proyectan cada evento nuevo a `audit.events` con el mismo ID, actor y correlación, dentro de la misma transacción. No hay endpoints de escritura pública. El fallo del registro central aborta la acción de negocio; los reintentos idempotentes no duplican eventos.

La proyección usa una lista explícita de campos; no copia datos personales de las filas de equipos ni payloads Stripe. Permisos conserva roles, overrides y ámbitos anteriores/nuevos. Demos conserva estado y vencimiento; Stripe conserva actor STRIPE sin suplantar usuario. Las sesiones legadas del sujeto se conservan como subjectContextId cuando no pertenecen al actor. IP y dispositivo permanecen nulos cuando el productor original no los capturó.

No hay backfill: los eventos anteriores al despliegue permanecen en sus historiales originales. Los módulos futuros deben publicar mediante el contrato transaccional o incorporarse explícitamente a esta proyección.

## API

- GET `/api/v1/audit-events`: permiso `audit.read`, cuenta del contexto y ámbitos efectivos.
- GET `/api/v1/audit-events/{eventId}`: mismo aislamiento; 404 sin revelar eventos ajenos.
- GET `/api/v1/admin/audit-events`: `audit.global-read` (asignado a IA), MFA y ámbito completo.
- Filtros: accountId, branchId, machineId, actorUserId, entityType, entityId, operation, result, correlationId, from/to inclusivos, cursor, limit.
- Respuesta de listado: `{items, page: {hasMore, nextCursor}}`; `Cache-Control: no-store`.
- Errores: 400 entrada inválida; 401 sin autenticación; 403 permiso/ámbito; 404 detalle ajeno/inexistente.

## Migración y operación

`20261002000100_phase5_audit.sql` crea tabla vacía, índices, triggers y permisos. No altera migraciones aplicadas ni elimina datos. Duración esperada corta al no realizar backfill; medir en staging. Desplegar migración antes de API. Reversión operativa: retirar el módulo API conservando tabla y evidencia; no borrar auditoría. Un superusuario que deshabilite triggers sigue siendo una autoridad administrativa fuera de la protección contra DML normal.

`20261002000200_phase5_audit_producers.sql` añade proyección sincrónica con funciones de search_path vacío y ejecución revocada a clientes. Se instala después de la primera migración y antes del despliegue. No desactivar triggers para resolver un fallo: reparar hacia adelante, pues su ausencia abriría una ventana sin auditoría central. Operación detallada en [runbook](../runbooks/audit.md).

## Interfaz y BFF

`/audit` verifica sesión/contexto, consulta permisos por API y muestra el ámbito global únicamente cuando el servidor lo autoriza. `/api/audit` valida filtros, conserva los códigos de error y rechaza contexto de navegador desactualizado con 409. No permite rutas arbitrarias ni mutaciones. La paginación preserva filtros; una nueva consulta elimina resultados y detalle previos. Las respuestas son no-store; el service worker no almacena auditoría. Volver desde bfcache recarga la sesión.

Detalle muestra evidencia, actor, cuenta, sucursal/máquina, entidad, contexto, correlación, fecha local/UTC, resultado e IP cuando existe. El foco se mueve al evento seleccionado. Tabla desplazable dentro del viewport, controles táctiles y estados anunciados con status/alert.

## Validación y pendientes

Resultados locales del 02/10/2026:

- `pnpm check`: exitoso; formato, lint, typecheck, fronteras, infraestructura, identidad y 135 pruebas unitarias en 28 archivos. [Registro](../qa/phase-5/evidence/20261002-f5-04-check.txt).
- `pnpm build`: exitoso, 14 tareas; rutas `/audit` y `/api/audit` incluidas. [Registro](../qa/phase-5/evidence/20261002-f5-04-build.txt).
- `ICE24_BROWSER_TESTS=1 pnpm test:integration` (Docker con `postgres:17-alpine` y `postgis/postgis:17-3.5-alpine`, Chromium headless): exitoso, 47 pruebas en 4 archivos. [Registro](../qa/phase-5/evidence/20261002-f5-04-integration.txt). Capturas: [escritorio](../qa/phase-5/evidence/20261002-f5-04-desktop.png) y [móvil 375 px](../qa/phase-5/evidence/20261002-f5-04-mobile.png).

Fallos corregidos durante el cierre:

- Fixture de identidad en `tests/integration/audit.test.ts`: el mismo parámetro `$1` alimentaba `id` (uuid) e `identity_subject` (text), y PostgreSQL no podía deducir un tipo único. Se fijan casts explícitos `$1::uuid,$1::text`, igual que en las pruebas de equipos y suscripciones.
- Prueba Chromium del visor: tras pulsar "Limpiar filtros", la consulta global por cuenta devolvía 0 eventos porque los campos del formulario conservaban los filtros anteriores (actor, tipo, estado y fechas). El botón era `type="reset"` y su `onClick` ponía `busy=true`, lo que lo deshabilitaba antes de que el navegador ejecutara el reset nativo. Ahora es `type="button"` y limpia el formulario de forma explícita con `form.reset()` antes de recargar. Es un defecto real de UX, no solo de la prueba.

Corrección de CI remota del PR #12 (`supabase-migrations` e `integration`):

- `supabase-migrations`: la migración de auditoría se aplicaba sin errores; fallaba `supabase test db` porque `phase3_identity_test.sql` esperaba 8 permisos en los módulos `identity/accounts/audit` y F5-04 añade `audit.read` y `audit.global-read` (10). La prueba de Fase 3 ahora excluye esos dos códigos y se añade `phase5_audit_test.sql` (pgTAP, 9 aserciones): tabla, RLS, privilegios, permisos sembrados, proyección transaccional desde `audit.security_events` sin copiar metadatos y rechazo de UPDATE/DELETE. [Registro](../qa/phase-5/evidence/20261002-f5-04-ci-fix-supabase.txt).
- `integration`: `getByRole("alert")` encontraba dos elementos en CI (el error del visor y el anunciador de rutas vacío de Next.js con `role="alert"`), una violación del modo estricto de Playwright. La prueba ahora filtra por el texto del error. [Check](../qa/phase-5/evidence/20261002-f5-04-ci-fix-check.txt) e [integración](../qa/phase-5/evidence/20261002-f5-04-ci-fix-integration.txt).

- HTTP utiliza guards reales de NestJS con fixtures de identidad/proveedor; no es una validación del proveedor OIDC remoto.
- Finales de línea: el repositorio se versiona en LF; las diferencias solo de CRLF del checkout de Windows no forman parte de este cambio.

Archivos: contratos y pruebas `packages/contracts/src/audit*`; módulo `apps/api/src/modules/audit`; AppModule; snapshots de permisos en `members.store.ts`; dos migraciones Supabase; visor/BFF y navegación en private-web; pruebas de auditoría, equipos y suscripciones; reporte, documentación, runbook y evidencia. No se eliminan archivos ni se añaden dependencias.

Seguridad: consultas parametrizadas, filtros que solo restringen, detalle 404 para eventos ajenos, permisos RESTRICTED, MFA global. La base tiene RLS sin políticas de navegador; la API usa su conexión de servidor confiable existente. Confirmar rol y privilegios efectivos en staging antes del despliegue. La conexión no debe exponerse a clientes.

Rendimiento: índices por cuenta/fecha/UUID, actor, máquina, entidad y correlación; límite máximo 100 y timeout SQL 15 s. No se hicieron pruebas de carga ni EXPLAIN con volumen representativo.

Validación manual pendiente: aplicar migraciones aditivas en staging, validar privilegios del rol de runtime, consultar con cuentas distintas y MFA, comprobar plan SQL con volumen real. No se aplicaron migraciones a producción. CI remota y revisión del PR pendientes. No se requirió ADR; no se cambia stack ni política de retención.

Deuda/limitaciones: backfill histórico no incluido; IP no inferida desde headers no confiables; futuras acciones sensibles deben integrarse explícitamente. Despliegue, validación operativa y CI remota no se sustituyen con pruebas locales.
