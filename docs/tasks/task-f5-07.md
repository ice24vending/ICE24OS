# TASK-F5-07 — Registro de trabajos asíncronos y centro de estado

Estado: implementada y validada el 02/10/2026 con evidencia final; PR abierto hacia `main`. Rama `feat/f5-07-job-center`.

## Alcance y trazabilidad

- TASKS F5-07; TRD sección 10 (pasos 5 y 7: resultado registrado y reproceso auditado por soporte); Architecture sección 20; Database `async_jobs`; API `Job`, JOB-001 e INT-004.
- Dependencias: F5-06 integrada (PR #14): cola `domain_events`, worker idempotente, `infra.fail_job` y DLQ. F5-04 para la auditoría central.
- Entrega: registro `infra.async_jobs` con historial de estados, integración con el worker, reproceso auditado de DLQ, API, BFF, pantalla `/jobs`, contratos, pruebas y documentación.

## Criterios de aceptación

- Estados visibles pendiente, procesando, completado, error y reintento: `QUEUED`, `RUNNING`, `SUCCEEDED`, `RETRY_WAIT` (con próximo intento), `FAILED` y `DEAD_LETTER`, con historial completo por intento.
- Reintentos sin duplicar efectos: el reproceso manual es idempotente por `Idempotency-Key`; los consumidores siguen omitiendo eventos ya aplicados (F5-06).
- Fallos visibles y recuperables: centro con colas, DLQ, outbox y trabajos por estado; reintento desde la interfaz.
- Toda acción sensible auditada: el reproceso escribe `JobRetryRequested` en `audit.events` con actor, contexto, motivo, valores anterior y nuevo, y correlación, en la misma transacción que el reenvío.

## Diseño

| Pieza                            | Descripción                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `20261003000400_phase5_jobs.sql` | `infra.async_jobs` (campos de Database `async_jobs` más cola, mensaje, evento, contador manual y versión) e `infra.async_job_transitions` (append-only). Trigger de máquina de estados (`IC409`) e identidad inmutable. Funciones `job_start_delivery`, `job_finish`, `job_record_poison`, `retry_dead_letter_job` y `queue_overview`. RLS; el rol de servicio sólo lee y ejecuta funciones. Permisos `jobs.read` (IA, OW), `jobs.admin-read` y `jobs.retry` (IA). |
| Worker                           | `processDomainEvents` registra cada entrega: inicio, éxito, reintento programado, DLQ y mensajes inválidos. Las copias del mismo evento comparten trabajo.                                                                                                                                                                                                                                                                                                         |
| `@ice24/contracts` `jobs.ts`     | Trabajo, transición, detalle, filtros estrictos, página, resumen de colas, solicitud de reintento y recurso público `Job` con su mapeo de estados.                                                                                                                                                                                                                                                                                                                 |
| `apps/api/src/modules/jobs`      | JOB-001, lista, detalle, resumen y reintento INT-004 con guards reales, MFA, ámbito completo e `Idempotency-Key`; errores ApiError (400, 403, 404, 409).                                                                                                                                                                                                                                                                                                           |
| BFF y `/jobs`                    | Rutas `/api/jobs`, `/api/jobs/{id}` y `/api/jobs/{id}/retry` con validación, contexto, CSRF y clave de idempotencia. Pantalla con tarjetas, filtros, tabla, detalle con historial y formulario de reintento. Enlace en el espacio de trabajo cuando la API concede acceso.                                                                                                                                                                                         |

INT-004 se implementa como acción autenticada del usuario de soporte (`/api/v1/admin/jobs/{id}/retry`) y no con un secreto de servicio, para que la auditoría identifique a la persona. El mensaje se localiza en la DLQ por `sourceQueue` y `sourceMessageId`, que `infra.fail_job` ya registra.

`infra.job_dispatches` (Fase 2) sigue siendo el outbox de `general_jobs`; aún no tiene consumidores. Cuando existan, deben registrarse con las mismas funciones `infra.job_*`.

## Migración y operación

Migración aditiva: no modifica migraciones aplicadas ni datos y no hace backfill, así que los eventos anteriores no generan trabajos. Orden: migración, API y worker, web. Reversión operativa: retirar la pantalla y la API conservando tablas e historial; el worker anterior no usa el registro. No borrar trabajos ni historial (los triggers lo impiden). Operación en el [runbook de colas](../runbooks/queues.md); diseño en el [módulo](../modules/jobs.md).

## Validación

Evidencia final en Windows con Docker y Chromium, 02/10/2026:

- `pnpm check`: exitoso, 169 pruebas unitarias en 34 archivos. [Registro](../qa/phase-5/evidence/20261002-f5-07-check.txt).
- `pnpm build`: exitoso. [Registro](../qa/phase-5/evidence/20261002-f5-07-build.txt).
- `ICE24_BROWSER_TESTS=1 pnpm test:integration` (Testcontainers `postgres:17-alpine` y `postgis/postgis:17-3.5-alpine`, Chromium headless): exitoso, 64 pruebas en 7 archivos. [Registro](../qa/phase-5/evidence/20261002-f5-07-integration.txt).
- Capturas del Centro de trabajos: [escritorio](../qa/phase-5/evidence/20261002-f5-07-desktop.png) con detalle e historial y [móvil 375 px](../qa/phase-5/evidence/20261002-f5-07-mobile.png) tras el reintento auditado.
- Supabase CLI local (`start`, `db reset`, `db lint --level error`, `test db`) con PGMQ real: exitoso, pgTAP 105 aserciones en 7 archivos. [Registro](../qa/phase-5/evidence/20261002-f5-07-supabase.txt).
- Los registros pasaron por censura automática de tokens, llaves, JWT y credenciales antes del commit.

Resultados en el entorno de desarrollo (PostgreSQL 16 con emulación de PGMQ y Chromium headless), 02/10/2026:

- `pnpm check`: exitoso, sin errores de tipos ni lint; 169 pruebas unitarias en 34 archivos. 18 nuevas: contrato de trabajos (5), servicio con autorización, ámbitos y reintento (7), BFF con contexto, filtros, CSRF, clave y motivo (5) y registro en el worker (1).
- Integración `tests/integration/jobs.test.ts` (6 pruebas): ciclo completo productor → outbox → cola → cinco fallos con backoff → DLQ con 11 transiciones; centro por HTTP con guards reales (permiso, MFA, 400/401/403/404); reintento con 403 sin permiso o sin MFA, 400 sin clave o motivo corto, 202 y auditoría, repetición idempotente sin reenviar, 409 en estado no reintentable, éxito posterior y JOB-001 con 404 en otra cuenta; mensajes inválidos; OpenAPI; y prueba Chromium del centro (filtro DLQ, detalle con foco, historial, motivo inválido, reintento auditado y móvil sin desplazamiento horizontal). Suite completa: 63 pruebas en 6 archivos.
- pgTAP `phase5_jobs_test.sql` (24 aserciones) con PGMQ real en CI: tablas, RLS, privilegios, permisos, entrega, backoff, DLQ, transición inválida, motivo obligatorio, reintento con auditoría e historial, idempotencia, estado no reintentable, historial inmutable y resumen de colas.

## Seguridad

Consultas parametrizadas; proyección explícita sin payloads ni `error_detail_restricted`; identificadores y contexto validados; CSRF, contexto de pestaña y clave de idempotencia en el BFF; MFA y ámbito completo para el centro global; RLS sin políticas de navegador; funciones con `search_path` vacío y ejecución revocada a clientes.

## Riesgos, deuda y pendientes

- Retención de `infra.async_jobs` y su historial: crecimiento lineal; definir con DEC-008.
- Cancelación de trabajos (JOB-002) no incluida: ningún trabajo actual es cancelable.
- Los mensajes inválidos sólo se corrigen en el productor; reintentarlos vuelve a enviarlos a la DLQ.
- `general_jobs` y `pdf_jobs` aparecen en el resumen, pero sus trabajos se registrarán cuando existan consumidores (F5-08 en adelante).
- El reintento es una escritura: si la cuenta ICE24 del operador está en modo lectura, se rechaza (F5-03).
- Validación manual pendiente: aplicar en staging, confirmar privilegios del rol de runtime, probar con un usuario IA con MFA real.
- Sin ADR nuevo.

Archivos: migración `20261003000400_phase5_jobs.sql`; pgTAP `phase5_jobs_test.sql`; `packages/contracts/src/jobs*.ts` e índice; `apps/api/src/modules/jobs/**` y `platform/app.module.ts`; `apps/worker/src/processors/domain-events*.ts`; `apps/private-web/src/app/jobs/**`, `app/api/jobs/**`, `features/jobs/**` y `app/workspace/page.tsx`; `tests/integration/jobs.test.ts` y migración añadida en `workers.test.ts`; módulo `jobs.md`, runbook de colas, índice de tareas, estado de fase y evidencia.
