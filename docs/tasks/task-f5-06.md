# TASK-F5-06 — Workers, reintentos, DLQ e idempotencia de consumidor

Estado: implementada y validada el 02/10/2026 con evidencia final; PR abierto hacia `main`. Rama `feat/f5-06-workers-dlq`.

## Alcance y trazabilidad

- TASKS F5-06; ADR-009; TRD sección 10 (pasos 4–6) y RT-11; Architecture secciones 20–21; PROJECT_RULES sección 135.
- Dependencias: F5-05 integrada (PR #13, cola `domain_events` y política de 5 intentos) y F2-05 (PGMQ, `infra.fail_job`, DLQ).
- Entrega: registro de mensajes procesados, funciones de acceso a cola para el worker, motor de consumo en `apps/worker`, contrato de consumidores, pruebas y documentación. El reproceso auditado desde soporte y el registro `async_jobs` quedan para F5-07.

## Criterios de aceptación

- Jobs resistentes a duplicados: cada consumidor reclama `(consumer, eventId)` en la misma transacción que su efecto; un evento reenviado, duplicado o procesado en paralelo aplica su efecto una sola vez.
- Resistentes a fallos temporales: el fallo revierte el efecto, conserva el mensaje y reintenta con backoff exponencial (15 s × 2ⁿ, máximo 15 min).
- Fallos visibles y recuperables: al agotar 5 intentos el mensaje pasa a `domain_events_dlq` con payload original, intento y código; mensajes inválidos van a la DLQ de inmediato; logs por lote con conteos.
- Con varios consumidores, sólo se reintenta el que falló; los que ya aplicaron su efecto lo omiten.

## Diseño

| Pieza                                         | Descripción                                                                                                                                                                                                                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261003000300_phase5_consumers.sql`         | `infra.processed_messages` (PK `consumer, event_id`, append-only, RLS, sin escritura directa); `infra.read_queue`, `infra.claim_message` e `infra.ack_message` con `security definer` y limitadas a colas con política; ejecución de `infra.fail_job` concedida al rol de servicio. |
| `apps/worker/src/processors/domain-events.ts` | `processDomainEvents(pool, consumers, options)`: lectura, validación `OutboxMessage v1`, reclamo + efecto por consumidor en transacción, confirmación, reintento o DLQ. `ConsumerFailure(code)` para códigos diagnósticos.                                                          |
| `apps/worker/src/consumers/index.ts`          | Registro de consumidores, vacío en esta entrega; los consumidores de negocio llegan con F5-11 a F5-13.                                                                                                                                                                              |
| `apps/worker/src/main.ts`                     | Lote cada 2 s sin solapamiento; log `domain_events_batch`; `QUEUE_UNAVAILABLE` si falla la base.                                                                                                                                                                                    |
| `@ice24/contracts` `consumers.ts`             | Nombre de consumidor, código de fallo y resumen de lote.                                                                                                                                                                                                                            |

Se usa `eventId` y no el ID del mensaje como clave de idempotencia porque el outbox o un reproceso pueden entregar el mismo evento en otro mensaje. Los efectos fuera de PostgreSQL deben pasar `eventId` como clave de idempotencia del proveedor. Los códigos de fallo nunca contienen mensajes de error ni datos.

## Migración y operación

Migración aditiva: no modifica migraciones aplicadas ni datos. Orden: migración, luego worker. Reversión operativa: detener el worker; los mensajes permanecen en la cola y el outbox sigue publicando. No borrar `infra.processed_messages`, porque causaría efectos repetidos. Operación y DLQ en el [runbook de colas](../runbooks/queues.md); diseño en el [módulo](../modules/workers.md).

## Validación

Evidencia final en Windows con Docker y Chromium, 02/10/2026:

- `pnpm check`: exitoso, 151 pruebas unitarias en 31 archivos. [Registro](../qa/phase-5/evidence/20261002-f5-06-check.txt).
- `pnpm build`: exitoso. [Registro](../qa/phase-5/evidence/20261002-f5-06-build.txt).
- `ICE24_BROWSER_TESTS=1 pnpm test:integration` (Testcontainers `postgres:17-alpine` y `postgis/postgis:17-3.5-alpine`, Chromium headless): exitoso, 58 pruebas en 6 archivos. [Registro](../qa/phase-5/evidence/20261002-f5-06-integration.txt).
- Supabase CLI local (`start`, `db reset`, `db lint --level error`, `test db`) con PGMQ real: exitoso, pgTAP 81 aserciones en 6 archivos. [Registro](../qa/phase-5/evidence/20261002-f5-06-supabase.txt).
- Los registros pasaron por censura automática de tokens, llaves, JWT y credenciales antes del commit.

Resultados en el entorno de desarrollo (PostgreSQL 16 con emulación de PGMQ), 02/10/2026:

- `pnpm check`: exitoso, 151 pruebas unitarias en 31 archivos (8 nuevas del motor: transacción reclamo-efecto, omisión de duplicados, rollback y código, DLQ por agotamiento, mensaje inválido, eventos sin suscriptor, saneamiento de códigos y validación de nombres/timeout).
- Integración (`tests/integration/workers.test.ts`, 6 pruebas): flujo real productor → outbox → publicador → cola → worker; reentrega sin duplicar; tres workers concurrentes con cinco copias del mismo evento aplican un solo efecto; reintento con backoff y éxito posterior (intento 2); DLQ al quinto fallo sin datos del error; reintento sólo del consumidor fallido; mensaje inválido a DLQ y evento sin suscriptor confirmado. Suite completa: 57 pruebas en 5 archivos. Una mutación que rompe la idempotencia hace fallar 3 pruebas, lo que confirma que la suite detecta duplicados.
- pgTAP `phase5_consumers_test.sql` (16 aserciones) con PGMQ real en CI: privilegios, política de 5 intentos, primer intento, reclamo único por consumidor, registro inmutable, confirmación, backoff invisible, DLQ con código y payload, y rechazo de colas sin política. Las 6 suites pgTAP (81 aserciones) pasan en simulación local.

Las pruebas con Testcontainers usan PostgreSQL 17 con una emulación mínima de PGMQ (`tests/integration/support/pgmq-emulation.sql`, mismas firmas de PGMQ 1.x). La validación contra PGMQ real es el job `supabase-migrations`.

## Seguridad

Consultas parametrizadas; timeout de sentencia validado; worker sin acceso directo a PGMQ; registro sin escritura directa para el rol de servicio; RLS sin políticas de navegador; DLQ y logs sin mensajes de error ni datos personales.

## Riesgos, deuda y pendientes

- Efectos externos no transaccionales: un efecto que se completa antes de un fallo de commit puede repetirse; cada consumidor externo debe usar `eventId` como clave de idempotencia del proveedor.
- Reproceso de DLQ auditado (INT-004) y `async_jobs`: F5-07.
- Retención de `infra.processed_messages`: crecimiento lineal con eventos procesados; definir con DEC-008.
- Métricas OpenTelemetry por lote: hoy sólo logs estructurados; agregar contadores con F5-14.
- Validación manual pendiente: desplegar worker en staging, confirmar privilegios de `service_role` y medir latencia con volumen real.
- Sin ADR nuevo.

Archivos: migración `20261003000300_phase5_consumers.sql`; pgTAP `phase5_consumers_test.sql`; `apps/worker/src/processors/domain-events*.ts`, `consumers/index.ts`, `main.ts`; `packages/contracts/src/consumers.ts` e índice; `tests/integration/workers.test.ts` y `support/pgmq-emulation.sql`; módulo `workers.md`, runbook de colas, índice de tareas, estado de fase y evidencia.
