# Workers de eventos de dominio

Ownership: plataforma. Fuente de requisitos: TASK-F5-06, ADR-009, TRD sección 10 y RT-11, Architecture secciones 20–21.

El worker consume la cola PGMQ `domain_events` que alimenta el [outbox](outbox.md). La entrega es **al menos una vez**: el mismo evento puede llegar más de una vez y todo consumidor debe tolerarlo.

## Idempotencia

Cada consumidor tiene un nombre estable (`kebab-case`). Antes de aplicar su efecto reclama `(consumer, eventId)` con `infra.claim_message` dentro de la **misma transacción** que el efecto. Si el reclamo ya existe, el efecto se omite. Se usa `eventId` y no el ID del mensaje porque un evento reenviado llega en otro mensaje. `infra.processed_messages` es append-only.

Los efectos fuera de PostgreSQL (correo, Stripe, archivos) no se revierten con la transacción: deben enviar `eventId` como clave de idempotencia del proveedor.

## Flujo por mensaje

1. `infra.read_queue` entrega un lote con visibilidad de 60 s; `read_ct` es el número de intento.
2. Mensaje que no cumple `OutboxMessage v1`: DLQ inmediata con `INVALID_MESSAGE`.
3. Sin consumidores suscritos: se confirma (`infra.ack_message`); el evento sigue en outbox y auditoría.
4. Cada consumidor suscrito: `BEGIN` → reclamo → efecto → `COMMIT`. Un fallo hace `ROLLBACK` sólo de ese consumidor; los anteriores ya quedaron registrados y no se repiten.
5. Todos exitosos: se confirma el mensaje. Algún fallo: `infra.fail_job` programa reintento con backoff exponencial (15 s × 2ⁿ, máximo 15 min) o, al agotar la política (`domain_events`: 5 intentos), mueve el mensaje a `domain_events_dlq` con payload original, intento y código.

Los códigos de fallo son identificadores (`ConsumerFailure("PROVIDER_TIMEOUT")`); cualquier otro error se registra como `HANDLER_FAILED`. Nunca se registran mensajes de error ni datos del payload.

## Registro de consumidores

`apps/worker/src/consumers/index.ts`. F5-06 no registró consumidores de negocio; desde F5-11 está registrado `notification-center` (eventos de `NOTIFICATION_EVENT_RULES`, ver [notificaciones](notifications.md)). Correo y scheduler (F5-12 y F5-13) se suscriben en sus tareas. No renombrar un consumidor que ya procesó eventos: su nombre forma parte de la clave de idempotencia.

## Acceso

El worker usa sólo funciones `infra.*` con `security definer` limitadas a colas con política; no necesita privilegios directos sobre PGMQ. Operación y DLQ en el [runbook de colas](../runbooks/queues.md). [Reporte](../tasks/task-f5-06.md).
