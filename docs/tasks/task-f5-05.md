# TASK-F5-05 — Patrón outbox en transacciones

Estado: implementada y validada localmente el 03/10/2026; lista para revisión en PR hacia `main`. Rama `feat/f5-05-transactional-outbox`.

## Alcance y trazabilidad

- TASKS F5-05; ADR-009 (cola administrada y transactional outbox); TRD sección 10 y RT-11; Architecture sección 20; Database `outbox_events`; PROJECT_RULES sección 135.
- Dependencias: F5-04 integrada (PR #12) y cola PGMQ/scheduler de F2-05.
- Entrega: migraciones aditivas, contrato `OutboxMessage v1`, helpers en `packages/database/src/outbox`, pruebas y documentación. Consumidores, reintentos de consumidor y centro de jobs quedan para F5-06 y F5-07.

## Criterios de aceptación

- Los eventos se publican sin ventana de pérdida: el evento se confirma o se revierte junto con el cambio de negocio, y el envío a la cola y la marca de publicado ocurren en la misma transacción.
- Los reintentos no duplican efectos: un productor que repite el mismo ID no crea otro evento; el publicador no reenvía eventos publicados; los mensajes llevan `eventId` para deduplicación del consumidor.
- Fallos visibles y recuperables: `attempt_count`, `last_error_code`, backoff exponencial con tope de 15 minutos y vista `infra.outbox_status`.
- Hechos inmutables: UPDATE de hechos, DELETE y TRUNCATE rechazados; sólo avanza la contabilidad de publicación.

## Diseño

| Pieza                                        | Descripción                                                                                                                                                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261003000100_phase5_outbox.sql`           | Tabla `infra.outbox_events` (campos de Database `outbox_events` más actor, contexto, `available_at` y `last_error_code`), índices, inmutabilidad, RLS, privilegios y triggers productores.                       |
| Triggers productores                         | `subscriptions.events`, `equipment.events` y `audit.security_events` proyectan al outbox con el mismo ID de la auditoría central, resumen permitido y sensibilidad (`internal` o `confidential` para identidad). |
| `20261003000200_phase5_outbox_publisher.sql` | Colas `domain_events` y DLQ, política de reintentos, `infra.outbox_message`, `infra.publish_outbox`, vista `infra.outbox_status` y pg_cron cada minuto.                                                          |
| `@ice24/contracts` `outbox.ts`               | `outboxEventInputSchema`, `outboxMessageSchema` (v1), resumen de publicación y estado. Los actores SYSTEM/STRIPE no suplantan usuarios.                                                                          |
| `@ice24/database` `src/outbox`               | `appendOutboxEvent(client, event)`, `publishOutbox(client, limit)` y `readOutboxStatus(client)` sobre cualquier cliente compatible con `pg`.                                                                     |

El sobre v1 de `events.ts` exige usuario y cuenta; los eventos de sistema, Stripe y globales no los tienen, por lo que la cola usa `OutboxMessage v1` con actor tipado y cuenta opcional. El sobre existente no cambia.

Las migraciones están separadas para que la tabla y los productores no dependan de PGMQ (pruebas con Testcontainers) y la publicación se valide con PGMQ real en Supabase.

## Migración y operación

Ambas migraciones son aditivas y no modifican migraciones aplicadas ni datos. No hay backfill: los eventos anteriores permanecen en sus historiales y en la auditoría central. Orden de despliegue: almacén, publicador, código. Reversión operativa: `cron.unschedule` de `ice24_publish_outbox` detiene la publicación conservando eventos; no borrar la tabla ni desactivar triggers, porque un fallo del outbox aborta la transacción de negocio a propósito. Operación en el [runbook de colas](../runbooks/queues.md) y diseño en el [módulo](../modules/outbox.md).

## Validación

Resultados locales del 03/10/2026:

- `pnpm check`: exitoso, 143 pruebas unitarias en 30 archivos (8 nuevas: contrato y helpers). [Registro](../qa/phase-5/evidence/20261003-f5-05-check.txt).
- `pnpm build`: exitoso. [Registro](../qa/phase-5/evidence/20261003-f5-05-build.txt).
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: exitoso. Nueva suite `outbox.test.ts` (5 pruebas): commit/rollback conjunto con el cambio de negocio, idempotencia por ID, productor real de identidad, inmutabilidad y privilegios. Las suites de auditoría, equipos y suscripciones cargan ahora la migración del outbox para probar que los triggers no rompen flujos reales, incluidos eventos Stripe. [Registro](../qa/phase-5/evidence/20261003-f5-05-integration.txt).
- pgTAP: nuevo `phase5_outbox_test.sql` (15 aserciones): captura transaccional, payload permitido, inmutabilidad, publicación a `domain_events`, marca atómica, no reenvío y fallo visible con backoff. `phase2_platform_test.sql` dejó de depender de conteos exactos de `infra`: ahora exige que ninguna tabla de `infra` carezca de RLS. [Simulación local](../qa/phase-5/evidence/20261003-f5-05-supabase.txt); la corrida oficial es el job `supabase-migrations` de CI.

## Seguridad

Consultas parametrizadas; payload con lista permitida; RLS sin políticas de navegador; `service_role` con SELECT/INSERT y ejecución del publicador; funciones con `search_path` vacío y ejecución revocada a clientes. La cola no se expone por Data API.

## Riesgos, deuda y pendientes

- Entrega al menos una vez hacia consumidores: la deduplicación por `eventId` es obligatoria en F5-06.
- Retención: no hay archivado de publicados; definir política junto con DEC-008 y vigilar crecimiento.
- El endpoint interno INT-003 `/internal/v1/outbox/publish` no se expone en esta entrega; pg_cron y `publishOutbox` cubren la publicación. Se evaluará con la autenticación de servicio de F5-06/F5-07.
- Validación manual pendiente: aplicar migraciones en staging, confirmar pg_cron y privilegios del rol de runtime, medir latencia de publicación con volumen real.
- Sin ADR nuevo: implementa ADR-009 sin cambiar stack ni proveedor.

Archivos: dos migraciones Supabase; `packages/contracts/src/outbox*.ts` e índice; `packages/database` (`src/outbox`, índice, dependencia de contratos, README); `pnpm-lock.yaml`; pgTAP `phase5_outbox_test.sql` y ajuste de `phase2_platform_test.sql`; `tests/integration/outbox.test.ts` y migración añadida a tres suites; módulo, runbook de colas, índice de tareas, estado de fase y evidencia.
