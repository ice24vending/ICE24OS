# TASK-F5-15 — UI de suscripción, modo lectura, auditoría, archivos, notificaciones y trabajos

Estado: integrada en `main` por #24 (`e417848`) con CI en verde (quality, integration con Chromium, supabase-migrations, Terraform y Vercel). Implementada el 06/10/2026 en la rama `feat/f5-15-ui`, creada desde `main` (`a061477`, F5-14 integrada por #23). `pnpm check`, `pnpm build`, la integración completa con Chromium y pgTAP pasan en el entorno local (véase [Validación](#validación)). No se desplegó ni se aplicaron migraciones remotas.

## Alcance y trazabilidad

- TASKS F5-15: estados y errores completos; transiciones con estado previo, permiso, precondiciones, versión esperada y motivo; auditoría de acciones sensibles; archivos privados sin URLs permanentes; trazabilidad PRD/TRD.
- PRD RF-SUB-001 a RF-SUB-013 (plan, estados, cancelación, modo lectura inmediato, reactivación, demo), RF-RPT-014, RF-DOC-009/013, RF-AUD-002 a 006 y 014, RF-ADM-009, RF-ALT-006; UI/UX 13.4, 13.5, 13.7, 15.11, 16, 17, 18, 19, 21, 23, 25, 26 y 28; API.md (`If-Match`, 412, `ACCOUNT_READ_ONLY`, FIL-003/004, NOT-003..006, INT-004).
- Dependencias verificadas en `main` antes de empezar: F5-01, F5-03, F5-04, F5-07, F5-10 (#19), F5-11, y además F5-12, F5-13 y F5-14 (#23). El estado de fase decía «F5-10 en validación» y «F5-14 implementada localmente»; el historial de `main` acredita ambas y el documento se corrige en esta entrega.
- Fuera de alcance: sistema de diseño, shell definitivo y navegación de producto (Fase 6); pantallas que no estén en el PRD ni en el inventario de UI/UX.

## Requisitos de la solicitud

| #   | Requisito                                                                              | Entrega                                                                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Suscripción: plan, estados, acciones por estado y permiso, Stripe sin datos de tarjeta | `/subscription` con chips de estado (8 de RF-SUB-007) y acceso (completo, solo lectura, suspendida), explicación y periodo, demo con días restantes; `billingOptions` por estado y propietaria; Checkout/Portal hospedados validados por el BFF |
| 2   | Modo lectura global y consistente, sin depender solo de la UI                          | Banner del layout `(account)` con motivo y acción; `useAccountAccess()` deshabilita escritura antes del flujo; el BFF conserva `ACCOUNT_READ_ONLY` y la pantalla actualiza el banner; el guard de F5-03 bloquea igual                           |
| 3   | Auditoría filtrable con paginación, detalle y permiso                                  | Filtros de actor, acción, fechas, entidad, correlación, sucursal y máquina; cursor; detalle con valores y «eventos de esta correlación»; sin permiso no se muestran filtros ni datos                                                            |
| 4   | Archivos: progreso, cuarentena/aprobado/rechazado, versiones, URL temporal             | Tarjeta con estado y veredicto, versiones FIL-004, descarga que pide una URL nueva y no la renderiza, enlace `?fileId=`                                                                                                                         |
| 5   | Notificaciones F5-11 y correo F5-12                                                    | Centro existente con estados comunes, versión esperada y manejo de conflicto; críticas fijadas hasta «Enterado»; estado de correo en el detalle                                                                                                 |
| 6   | Trabajos: fallos, diagnóstico con correlación F5-14, reproceso auditado                | Panel «Diagnóstico»: auditoría filtrada por correlación y llamadas a integraciones redactadas; reintento con motivo y versión                                                                                                                   |
| 7   | Estados de carga, vacío, error, sin permiso, sin conexión y conflicto                  | `ServiceState` común y matriz por pantalla en el [módulo](../modules/account-services-ui.md#estados-compartidos)                                                                                                                                |
| 8   | Versión esperada y motivo; auditoría verificada                                        | `If-Match` obligatorio en INT-004 y NOT-003..006 (migraciones aditivas); E2E comprueba `JobRetryRequested`, `NotificationRead/Acknowledged/AttentionStarted`, `FileReadAuthorized` y la proyección de `subscriptions.events`                    |
| 9   | Accesibilidad y responsive                                                             | Semántica, nombres accesibles, foco, regiones vivas, 44 px, reflujo a 375 px; comprobaciones automatizadas en E2E (axe no está configurado)                                                                                                     |

## Criterios de aceptación

| Criterio                                                                               | Estado                                                                                                                                                         |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estados y errores completos                                                            | Cumplido: seis estados por pantalla más sesión, modo lectura y no encontrado; pruebas de componente por estado                                                 |
| Transiciones con estado previo, permiso, precondiciones, versión esperada y motivo     | Cumplido: la API ya validaba estado, permiso, precondiciones y motivo; F5-15 añade la versión esperada con 412 sin romper la idempotencia                      |
| Acción sensible auditada con actor, contexto, correlación, valores y resultado         | Cumplido con los productores existentes; verificado en E2E y pgTAP. Abrir Checkout/Portal no cambia estado y no se audita (el cambio confirmado por Stripe sí) |
| Archivos privados, validados y vinculados por metadatos; sin URLs públicas permanentes | Cumplido: la UI nunca renderiza ni conserva URLs; E2E comprueba que la página no contiene la ruta firmada                                                      |
| Trazabilidad y contradicciones registradas                                             | Cumplido: véase [Decisiones y contradicciones](#decisiones-y-contradicciones)                                                                                  |

## Diseño

- **Shell de cuenta.** Grupo de rutas `(account)` (URL sin cambios). El layout consulta una vez por página el contexto (`session-contexts/current`), sondea los permisos de auditoría y trabajos y, solo en modo lectura, lee la suscripción para explicar el motivo. Un fallo nunca bloquea la página.
- **Estados.** `ServiceState` y `failure.ts` (clasificación por estado HTTP y código). Los BFF responden `{message, code?}` con helpers comunes en `server/bff/responses.ts`; los de archivos y alertas pasan a usarlos.
- **Concurrencia.** `infra.retry_dead_letter_job_expected` y `notifications.transition_expected` bloquean la fila, responden a una clave ya registrada y luego comparan la versión (`ICVER` → 412 `PRECONDITION_FAILED`); las funciones originales siguen siendo las únicas que escriben. `readIfMatchVersion` común en la API.
- **Diagnóstico.** BFF `/api/integration-logs` de solo lectura que reenvía únicamente correlación, cursor y límite a `admin/integration-logs` (permiso, MFA y alcance en la API).

Detalle completo en el [módulo de interfaz](../modules/account-services-ui.md).

## Archivos

- API: `common/security/security-request.ts` (`readIfMatchVersion`); `modules/jobs` (puerto, servicio, base de datos, filtro 412, OpenAPI `If-Match`) y `modules/notifications` (ídem) con sus pruebas unitarias.
- Base de datos: `supabase/migrations/20261006000200_phase5_job_expected_version.sql`, `20261006000300_phase5_notification_expected_version.sql`; pgTAP `supabase/tests/database/phase5_expected_versions_test.sql`.
- Web privada: `app/(account)/layout.tsx` y páginas movidas (`workspace`, `subscription`, `audit`, `files`, `jobs`, `notifications`, `profile`) con sus `loading.tsx`; `features/account-shell/*` (acceso, proveedor, navegación, estados, fallos, estilos, pruebas); `server/account/shell.ts`; `server/bff/responses.ts`; `features/subscription/{model,status,billing-actions}`; `features/audit/{filters,viewer}`; `features/files/{model,file-card,uploader,bff}`; `features/jobs/{center,diagnosis,messages}`; `features/notifications/{center,bff}`; `features/equipment/workspace.tsx` (sincroniza el banner); BFF `api/audit`, `api/jobs/*`, `api/notifications/*`, `api/subscription`, nuevo `api/integration-logs`; pruebas `*.test.tsx` y de BFF.
- Pruebas de integración: nuevo `tests/integration/ui-services.test.ts`; `jobs`, `notifications`, `scheduler` (versión esperada y migraciones) y `equipment` (banner global).
- Configuración: `vitest.config.ts` (`*.test.tsx` y JSX automático solo para pruebas).
- Documentación: `docs/modules/account-services-ui.md` (nuevo), `audit.md`, `files.md`, `jobs.md`, `notifications.md`, `subscriptions.md`; runbooks `queues.md` y `notifications.md`; `docs/backlog/phase-5-status.md`; este reporte.

## Migración y operación

Migraciones aditivas: dos funciones `security definer` con `search_path` vacío y sus permisos (solo `service_role`); sin cambios de tablas ni datos. Orden: migraciones, API y web juntas, porque la API exige `If-Match` y la web lo envía. Un cliente anterior recibe 400 hasta recargar. Reversión: volver la API a llamar a las funciones originales; las nuevas pueden quedarse sin uso. Runbooks: [colas](../runbooks/queues.md#reintento-rechazado-por-versión-f5-15) y [notificaciones](../runbooks/notifications.md#cambio-rechazado-por-versión-f5-15).

## Validación

Comandos ejecutados el 06/10/2026 en Windows 11 con Node 24, Docker Desktop 29.7.2 y Chromium de Playwright 1.62.1:

- `pnpm check` (Prettier, ESLint, typecheck, fronteras, infraestructura, identidad y Vitest): exitoso, 408 pruebas en 68 archivos. [Registro](../qa/phase-5/evidence/20261006-f5-15-check.txt).
- `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329 pnpm build`: exitoso, 14 tareas. [Registro](../qa/phase-5/evidence/20261006-f5-15-build.txt).
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: exitoso, 106 pruebas en 14 archivos, incluidas todas las de navegador de F5-01 a F5-14 y el nuevo E2E. [Registro](../qa/phase-5/evidence/20261006-f5-15-integration.txt).
- `supabase start`, `db reset --local --no-seed` (aplica las dos migraciones nuevas), `db lint --local --level error` (salida 0; los únicos hallazgos son funciones de PostGIS en `extensions`, ajenas al proyecto) y `supabase test db`: exitoso, 320 pruebas en 15 archivos, incluido `phase5_expected_versions_test.sql` (15 aserciones: permisos, versión inválida, trabajo y aviso inexistentes o de otra cuenta, versión vieja rechazada sin auditar, versión correcta, repetición con la clave registrada). [Registro](../qa/phase-5/evidence/20261006-f5-15-supabase.txt).

E2E `ui-services.test.ts` (API completa `AppModule` con tokens RS256 verificados por `OidcTokenVerifier` contra un JWKS local, identidad, roles y `effective_access` reales en PostgreSQL, worker y escáner reales, doble de Storage, web y Chromium):

1. Matriz de autorización por rol (propietaria, operador con alcance de sucursal, soporte ICE24 con MFA) y token con firma alterada (401).
2. Navegación por rol: la propietaria ve Auditoría y no el Centro de trabajos; el operador recibe «Sin permiso» en auditoría, trabajos y suscripción, sin datos ni botones.
3. Pago rechazado → banner global con motivo en archivos, auditoría, alertas y espacio de trabajo; carga deshabilitada; el BFF y la API responden 403 `ACCOUNT_READ_ONLY`; suscripción con «Pago rechazado» y «Gestionar suscripción». Alerta crítica → «Ver detalle» (leída, sigue fijada) → «Marcar enterado» auditado. Conflicto: otra pestaña atiende la alerta y el clic con versión vieja muestra «La información cambió» sin auditar de más. Pago confirmado → el banner desaparece y la carga vuelve.
4. Carga → cuarentena (descarga deshabilitada) → escaneo real → aprobado con huella → descarga temporal auditada (`FileReadAuthorized`) sin la ruta firmada en el DOM → enlace `?fileId=` con versiones → archivo inexistente.
5. Dos trabajos en DLQ → diagnóstico (enlace de auditoría con la correlación y llamadas a integraciones) → reintento con motivo auditado y foco en la confirmación → el segundo trabajo, reintentado desde otra sesión, se rechaza en la UI por versión sin reenviar → la auditoría abre filtrada.
6. Sin conexión: banner, carga deshabilitada y recuperación al volver la red.

Capturas: [modo lectura](../qa/phase-5/evidence/20261006-f5-15-read-only-desktop.png), [alertas escritorio](../qa/phase-5/evidence/20261006-f5-15-alerts-desktop.png) y [móvil 375 px](../qa/phase-5/evidence/20261006-f5-15-alerts-mobile.png), [archivos](../qa/phase-5/evidence/20261006-f5-15-files-desktop.png), [trabajos escritorio](../qa/phase-5/evidence/20261006-f5-15-jobs-desktop.png) y [móvil](../qa/phase-5/evidence/20261006-f5-15-jobs-mobile.png).

Correcciones durante la validación: un 409 de regla de negocio ya no se presenta como conflicto de versión; las ayudas de los filtros de auditoría salieron del `<label>` porque alteraban el nombre accesible (lo detectó la prueba de F5-04); el foco se mueve a la confirmación cuando el formulario de reintento desaparece.

## Decisiones y contradicciones

- **`If-Match` obligatorio en NOT-003..006 e INT-004.** Las filas de API.md no lo listan, pero la regla general («obligatorio en actualizaciones sensibles», 412) y el criterio de F5-15 sí. Se aplica la regla general; se documenta en OpenAPI, módulos y runbooks. Pendiente: alinear esas filas de API.md.
- **Pantalla de logs de integración.** El reporte de F5-14 la atribuye a F5-15, pero ni TASKS F5-15 ni el inventario de UI/UX la incluyen. Se entrega la consulta por correlación desde el Centro de trabajos (requisito 6); una pantalla independiente con filtros por integración o cuenta queda como decisión de producto pendiente, sin implementar.
- **«Suspendida»** no es un estado de suscripción (RF-SUB-007) sino un modo de acceso; la UI muestra ambas dimensiones.
- **Versiones de archivo.** API.md no tiene listado de archivos ni historial de versiones; solo FIL-004 (`original|optimized|public`). La UI muestra esas variantes y abre archivos por enlace; no se inventan endpoints.
- **Componentes de estado en la web y no en `@ice24/ui`**, para no adelantar el sistema de diseño de Fase 6.

## Riesgos, deuda y pendientes

- La lista de «Archivos cargados» solo muestra los de la sesión y los abiertos por enlace hasta que exista un contrato de listado. `FILE_SCAN` apunta a la versión del archivo, así que el Centro de trabajos no enlaza al archivo.
- Sin axe ni lector de pantalla automatizados: las comprobaciones son nombres accesibles, `lang`, enlace de salto, foco y reflujo. Pendiente: prueba manual con NVDA/VoiceOver y zoom al 200 %.
- El layout añade hasta cuatro lecturas por navegación (contexto, dos sondeos de permisos y suscripción solo en modo lectura), con tiempo límite de 5 s y sin bloquear la página.
- Stripe remoto (F5-02), proveedores de correo y antimalware (DEC-025, ADR-019) y hospedaje del worker (DEC-026) siguen pendientes; la UI ya refleja «envío pendiente» y la cuarentena ante fallo.
- Validación manual pendiente: revisión visual con la identidad ICE24 (Fase 6) y Stripe test/staging.
