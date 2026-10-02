# TASK-F5-03 — Implementar modo lectura centralizado

Apertura: 01/10/2026. Rama: `feat/f5-03-read-only-mode`, creada desde `main` (`1ea24ec`, merge de F5-02).

**Estado: implementación validada localmente (02/10/2026); pendiente de CI del Pull Request.** `pnpm check`, `pnpm build` y la integración con Docker/Chromium pasaron; véase [Validación final local](#validación-final-local). El cierre de la tarea depende del resultado remoto del PR.

## Fuentes y alcance

- [TASKS F5-03](../../context/TASKS.md#task-f5-03--implementar-modo-lectura-centralizado).
- [API](../../context/API.md): `ACCOUNT_READ_ONLY`, HTTP 403, consultas y descargas autorizadas.
- [Módulo de suscripciones](../modules/subscriptions.md), [ADR-023](../decisions/adr-023-stripe-sessions.md) y F5-01/F5-02.
- Dependencias: Fase 4 aprobada; F5-01/F5-02 integradas; identidad, secretos, objetos y colas disponibles según operación. La prueba manual de Stripe test/staging de F5-02 permanece separada.

## Plan de implementación y validación

1. Reutilizar `subscriptions.effective_access` como fuente del modo efectivo, sin una segunda máquina de estados en HTTP o navegador.
2. Ejecutar `AccountWriteGuard` desde `AuthenticationGuard` después de validar identidad. Las mutaciones requieren contexto vigente y asociación activa. Las lecturas continúan sus controles existentes.
3. Devolver `403 ACCOUNT_READ_ONLY` con mensaje, correlación y timestamp. Mantener comprobaciones transaccionales para cambios de estado concurrentes y normalizar también rechazos de escritura de equipos/autorización.
4. Declarar excepciones por método para recuperación de facturación y autoservicio de identidad; mantener los permisos, propietario, MFA, firma y aislamiento existentes.
5. Deshabilitar formularios/acciones operativas, proteger sus callbacks y propagar el error desde BFF a UI para reaccionar a cambios de estado posteriores a la carga.
6. Presentar esta entrega antes de ejecutar la suite. Después: `pnpm check`, `pnpm build` y `ICE24_BROWSER_TESTS=1 pnpm test:integration` con Docker y Chromium; guardar evidencia, resolver fallos y actualizar el reporte. Completado el 02/10/2026.

## Estados que activan solo lectura

| Condición persistida/efectiva                          | Resultado                                          |
| ------------------------------------------------------ | -------------------------------------------------- |
| Modo de cuenta `READ_ONLY`                             | Se conserva                                        |
| Suscripción `pending_activation`                       | READ_ONLY; volver desde Checkout no activa acceso  |
| `payment_failed`, `read_only`, `cancelled`             | READ_ONLY                                          |
| Demo con `demo_expires_at <= now()`                    | READ_ONLY aunque no haya corrido un scheduler      |
| `cancellation_scheduled` con periodo pagado finalizado | READ_ONLY                                          |
| Cancelación programada con periodo pagado vigente      | Conserva acceso previo                             |
| Demo vigente, `active` o `reactivated`                 | Conserva modo base y permisos                      |
| `SUSPENDED`                                            | Suspensión prevalece; no se convierte en READ_ONLY |

No se añade una política nueva por factura pendiente de renovación ni por ausencia de registro de suscripción: se conserva la semántica aprobada de `effective_access`. Un rechazo confirmado o activación pendiente sí restringen escritura. No se introducen periodos de gracia ni se levantan suspensiones de seguridad.

## Endpoints afectados

Prefijo real de implementación: `/v1`. Se protegen `POST`, `PUT`, `PATCH`, `DELETE` y otros métodos no seguros de todos los endpoints privados que utilizan `AuthenticationGuard`, sin listas de rutas confiadas al navegador. Endpoints nuevos de cuenta quedan protegidos por defecto al usar esa guardia. `GET`, `HEAD` y `OPTIONS` no reciben bloqueo por esta guardia; no omiten autenticación, permiso ni aislamiento.

| Familia                       | Mutaciones sujetas al bloqueo                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cuentas y sucursales          | `PATCH /accounts/:id`, `POST /branches`, `PATCH /branches/:id`, archivo/restauración de sucursales                                                    |
| Usuarios/asociaciones         | Invitaciones, permisos de usuarios, `POST /user-associations` y sus transiciones                                                                      |
| Equipos                       | Creación/edición/transiciones de solicitudes; edición, traslado, retiro y estado operativo de máquinas; transferencias/cancelación                    |
| Archivos                      | Carga y reescaneo en `/equipment-files`; `GET /equipment-files/:id/download` sigue disponible con autorización y controles sanitarios                 |
| Administración                | Mutaciones de cuentas, catálogos, modelos, plantillas, validación de solicitudes, transferencias y recuperación administrativa de identidad           |
| Suscripciones administrativas | Aprovisionamiento de demos/cuentas y extensión de demo exigen contexto administrativo con escritura permitida; no son autoservicio de la demo vencida |

La guardia consulta el modo de la cuenta del contexto autenticado. No confía en IDs de cuerpo o encabezados de cuenta destino. En operaciones administrativas entre cuentas se preserva la política y validación del servicio existente; no se prohíbe al administrador operativo recuperar una cuenta destino restringida.

### Excepciones explícitas

| Operación                                                                                     | Motivo y controles conservados                                                                                                      |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `POST /subscription/checkout`, `/subscription/portal`                                         | Recuperar facturación; exige contexto activo, no suspendido y propietario autorizado en el servicio. No concede escritura operativa |
| `PATCH /me`                                                                                   | Editar el perfil de la identidad autenticada                                                                                        |
| `POST /session-contexts`                                                                      | Seleccionar una cuenta autorizada, incluso al salir de un contexto revocado                                                         |
| `DELETE /session-contexts/current`, `/me/sessions/:sessionId`; `POST /me/sessions/revoke-all` | Cerrar/revocar sesiones propias; no bloquear medidas de seguridad por falta de pago                                                 |
| `POST /webhooks/stripe`                                                                       | No usa identidad humana ni esta guardia; conserva firma sobre raw body, entorno, deduplicación y reconciliación                     |
| Registro interno de eventos de seguridad                                                      | Conserva autenticación interna; no depende del modo de una cuenta humana                                                            |

`AllowReadOnlyOperation` solo se declara en métodos concretos. No es un permiso de negocio ni un bypass de autorización del endpoint.

## Criterios de aceptación

| ID    | Criterio                                                                                                                          | Estado                                            |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| AC-01 | Mutaciones privadas de cuenta se bloquean antes del controlador en READ_ONLY                                                      | Validado: unitarias de guardia e integración HTTP |
| AC-02 | Error `ACCOUNT_READ_ONLY` 403 normalizado y correlacionado, contrato/OpenAPI documentados                                         | Validado: unitarias, contrato y HTTP              |
| AC-03 | Consultas y descargas previamente generadas conservan sus permisos y aislamiento                                                  | Validado: integración de lectura                  |
| AC-04 | Checkout/Portal y autoservicio de identidad operan con excepciones limitadas; SUSPENDED no permite facturación                    | Validado: unitarias e integración de facturación  |
| AC-05 | No se confía en modo/identidad de cuenta enviados por el navegador; no se omite control transaccional                             | Validado: unitarias e integración                 |
| AC-06 | UI deshabilita acciones y callbacks; un rechazo posterior a la carga actualiza modo local; navegación/consulta siguen disponibles | Validado: BFF y Chromium                          |
| AC-07 | Estados temporales usan `effective_access` y preservan suspensiones                                                               | Validado: regresión de suscripciones              |
| AC-08 | Pruebas unitarias, BFF, integración y Chromium pasan; reporte/evidencia actualizados                                              | Validado localmente; CI pendiente                 |

## Archivos y casos preparados

- Nuevos: `common/authorization/account-write.guard.ts`, `account-write.guard.test.ts`, `account-write.openapi.ts` en API y este reporte.
- API: composición en `AuthenticationGuard`, método HTTP en `SecurityRequest`, excepciones en identidad/facturación, preservación del error en filtro de suscripciones, normalización en autorización y transacciones de equipos, documentación OpenAPI en controladores afectados.
- Contrato: nuevo código publicado `ACCOUNT_READ_ONLY`, ya definido en API.md.
- Web privada: BFF de equipos preserva código normalizado; workspace protege acciones y formularios y ofrece enlace a Suscripción.
- Casos escritos: cuatro métodos de escritura, GET/HEAD/OPTIONS, cuenta activa, contexto ausente/revocado, suspensión, excepciones por método, BFF normalizado, HTTP de lectura/escritura y navegador en modo lectura. Las regresiones existentes de vencimiento, pago y recuperación de facturación se ejecutarán también.

## Riesgos, observabilidad y pendientes

La guardia añade una consulta de autorización por mutación privada; las consultas transaccionales no se eliminan ni se sustituyen por el resultado previo. Correlación y telemetría HTTP existentes registran el resultado 403; el rechazo temprano no produce eventos de negocio ni cambios operativos. No se agregan payloads ni credenciales a logs.

La UI es una protección visual adicional: el servidor sigue siendo autoritativo. Otras pestañas pueden conservar controles hasta actualizar o recibir rechazo; no existe push de estado en tiempo real. Las operaciones internas sin HTTP mantienen sus validaciones actuales. No se requieren migraciones nuevas. La suite local está validada; quedan pendientes la CI del Pull Request y la validación manual en staging.

## Validación final local

| Comando                                       | Resultado                                                                                                                  | Evidencia                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm check`                                  | Aprobado; formato, lint, tipos, límites, infraestructura, identidad; 124 pruebas en 25 archivos (F5-02: 111 en 24)         | [Log check](../qa/phase-5/evidence/20261001-f5-03-check.txt)             |
| `pnpm build`                                  | Aprobado; 14 tareas                                                                                                        | [Log build](../qa/phase-5/evidence/20261001-f5-03-build.txt)             |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Aprobado; 37 pruebas en 3 archivos, sin omisiones: 15 de equipos, 21 de suscripciones y 1 de PostGIS, incluidas 2 Chromium | [Log integración](../qa/phase-5/evidence/20261001-f5-03-integration.txt) |

`pnpm check` y `pnpm build` se ejecutaron sobre una copia limpia de `1ea24ec` con únicamente los cambios de esta tarea (Node 24.19.0, pnpm 11.24.0). La integración se ejecutó el 02/10/2026 en Windows con Docker Desktop/Testcontainers, PostgreSQL/PostGIS y Chromium de Playwright 1.62, usando `$env:ICE24_BROWSER_TESTS="1"`. En los logs solo se eliminaron códigos de color ANSI, espacios finales y finales CRLF.

### Fallo corregido durante la validación

El primer intento de integración (01/10/2026) falló en `rejects cross-account context, non-owner, malformed input, foreign return URL and missing idempotency`: se esperaba 403 y se obtuvo 404. Se conserva como historial en [log previo](../qa/phase-5/evidence/20261001-f5-03-integration-prefix.txt).

Causa: `AccountWriteGuard` se ejecuta antes del servicio de facturación y consulta `getAuthorizationSubject`, que lanza `NotFoundException` cuando el contexto no pertenece a la identidad autenticada. Antes de esta tarea, el servicio respondía 403 en ese caso. Corrección: la guardia traduce ese `NotFoundException` a `403 Account access denied`, sin revelar si existe un contexto ajeno. Se añadió una prueba unitaria para este caso. Otros errores se propagan sin cambios y la guardia no omite ninguna comprobación posterior.

Un segundo intento (02/10/2026) falló solo en las dos pruebas Chromium porque faltaba el navegador de Playwright 1.62 en el equipo local (`pnpm exec playwright install chromium`). No era un fallo del código; tras instalarlo pasaron las 37 pruebas.

**Límites de aceptación:** AC-01 a AC-08 validados localmente. Falta el resultado de CI del Pull Request. No se aplicaron migraciones nuevas, no se hicieron llamadas a Stripe remoto ni despliegues.
