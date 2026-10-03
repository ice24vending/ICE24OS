# Outbox transaccional

Ownership: plataforma. Fuente de requisitos: TASK-F5-05, ADR-009, TRD sección 10, Architecture sección 20 y Database `outbox_events`.

`infra.outbox_events` guarda los eventos de dominio que otros módulos o workers deben procesar. El evento se inserta en la misma transacción que el cambio de negocio: si la transacción se revierte, el evento desaparece con ella; si se confirma, el evento queda pendiente de publicación. No existe una ventana en la que el cambio quede confirmado sin su evento.

## Productores

- Historiales existentes: triggers `AFTER INSERT` en `subscriptions.events`, `equipment.events` y `audit.security_events` proyectan cada evento con el mismo ID que la auditoría central de F5-04, su actor, contexto, correlación y un resumen de la lista permitida `audit.event_summary`.
- Código nuevo: `appendOutboxEvent(client, event)` de `@ice24/database` usa el cliente de la transacción del llamador. Un reintento con el mismo `id` no duplica el evento.
- Tipos de evento en PascalCase y pasado (`MembershipChanged`); los tipos heredados en mayúsculas se convierten al proyectar.

## Publicación

`infra.publish_outbox(batch)` toma pendientes con `FOR UPDATE SKIP LOCKED`, envía `OutboxMessage v1` a la cola PGMQ `domain_events` y marca `published_at` en la misma transacción. Como PGMQ vive en PostgreSQL, enviar y marcar son atómicos: no hay pérdida ni doble envío desde el publicador. pg_cron lo ejecuta cada minuto (`ice24_publish_outbox`); los workers pueden invocar `publishOutbox(client, limit)`.

Un envío fallido revierte sólo su subtransacción: el evento sigue pendiente, incrementa `attempt_count`, registra `last_error_code` y reintenta con backoff exponencial de hasta 15 minutos. La entrega a consumidores sigue siendo al menos una vez: cada consumidor debe deduplicar por `eventId` (TASK-F5-06).

## Seguridad e inmutabilidad

Los hechos del evento no cambian; sólo avanzan `published_at` (una vez), `attempt_count` (no decrece), `available_at` y `last_error_code`. DELETE y TRUNCATE se rechazan. RLS activo; `service_role` sólo SELECT/INSERT y ejecución del publicador; navegador sin acceso. El payload no copia credenciales, cuerpos de proveedores ni datos personales fuera de la lista permitida.

## Observabilidad

`infra.outbox_status` y `readOutboxStatus(client)` exponen pendientes, fallidos, máximo de intentos y antigüedad del pendiente más viejo. Operación en el [runbook de colas](../runbooks/queues.md). [Reporte](../tasks/task-f5-05.md).
