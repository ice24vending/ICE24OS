# Runbook — Scheduler

Diseño en el [módulo del scheduler](../modules/scheduler.md); colas, DLQ y Centro de trabajos en el [runbook de colas](queues.md). Reporte de la tarea: [F5-13](../tasks/task-f5-13.md).

## Componentes

- Worker: tick cada 30 s (`runSchedulerTick`) y consumo de `scheduled_tasks` cada 5 s (`processScheduledTasks`). Todas las réplicas hacen ambas cosas; la base de datos coordina.
- Ventanas: `infra.scheduler_windows`. Trabajos: `infra.async_jobs` con `job_type = 'SCHEDULED_TASK'` y `event_type` igual al nombre de la tarea.
- Latido: `infra.scheduler_heartbeats` con `scheduler_name = 'ice24_task_scheduler'`. Si tiene más de 2 min, no hay ningún worker programando.
- Política de `scheduled_tasks`: visibilidad y arrendamiento de 300 s, 5 intentos, backoff de 15 s × 2^(intento−1) con tope de 15 min y DLQ `scheduled_tasks_dlq`.

Las consultas de este runbook se ejecutan con el rol de servicio en la consola SQL del proyecto. No se usan `update` ni `delete` directos sobre las tablas del scheduler.

## Pausar y reanudar una tarea

```sql
-- Pausa: no se crean ventanas nuevas. Las ya encoladas se ejecutan.
select infra.scheduler_set_paused('reports.weekly-period', true,
  'Consumidores de reportes en mantenimiento', 'OPS-1234');
-- Reanudar: el siguiente tick crea la ventana vigente y, como máximo, las catchUpWindows más recientes.
select infra.scheduler_set_paused('reports.weekly-period', false,
  'Mantenimiento terminado', 'OPS-1234');
select * from infra.scheduler_control_changes order by occurred_at desc limit 20;
```

El motivo debe tener de 10 a 500 caracteres. `requested_by` es un ticket o un rol, nunca un nombre ni un correo. Las ventanas que caen en la pausa y exceden el límite de recuperación aparecen como `scheduled_windows_skipped` al reanudar.

Para detener **de inmediato** una ventana en curso, se escalan los workers a cero. El arrendamiento vence en 300 s o menos y la ventana se retoma al volver, sin repetir efectos. No se quita una tarea del registro para pausarla: sus ventanas encoladas irían a la DLQ con `SCHEDULED_TASK_UNKNOWN`.

## Reprocesar

- **Ventana fallida** (`status = 'FAILED'`, trabajo `DEAD_LETTER`): se corrige la causa y se reintenta desde el Centro de trabajos, filtrando por tipo `SCHEDULED_TASK`. Se exige motivo auditado (INT-004). La ventana se ejecuta de nuevo con la misma identidad; los elementos ya aplicados se omiten.
- **Ventana en `RETRY_WAIT`**: se reintenta sola en `next_attempt_at` del trabajo. No se fuerza.
- **Ventana `SUCCEEDED`**: no se vuelve a ejecutar (trigger `IC409`). Si hace falta repetir un efecto, se corrige en su módulo con su flujo auditado. No se crea una ventana a mano.

## Diagnóstico

```sql
-- Últimas ventanas por tarea
select task_name, window_key, status, attempt_count, recovered_count, error_code, result, finished_at
from infra.scheduler_windows order by window_end desc limit 50;
-- Ventanas con arrendamiento vencido (worker caído o detenido)
select id, task_name, lease_expires_at from infra.scheduler_windows
where status = 'RUNNING' and lease_expires_at < now();
-- Historial del trabajo de una ventana
select t.* from infra.async_job_transitions t
join infra.scheduler_windows w on w.job_id = t.job_id where w.id = '<window-id>' order by t.occurred_at;
-- Latido
select * from infra.scheduler_heartbeats where scheduler_name = 'ice24_task_scheduler';
```

| Síntoma                                   | Causa probable y acción                                                                                                                                                                                                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No se crean ventanas                      | Latido viejo: no hay worker en ejecución o `DATABASE_URL` no está configurada. Revisar el log `SCHEDULER_TICK_FAILED`. Si la tarea está pausada, el resumen `scheduler_tick` muestra `paused` y `infra.scheduler_task_controls` la tiene en `true`.                                                        |
| Ventanas `QUEUED` que no avanzan          | El consumo falla (`QUEUE_UNAVAILABLE`) o el mensaje está invisible tras una lectura reciente (hasta 300 s).                                                                                                                                                                                                |
| `RUNNING` con arrendamiento vencido       | El worker murió a mitad de la ejecución. Se recupera solo cuando la cola vuelve a entregar el mensaje: aumenta `recovered_count` y queda la transición `LEASE_EXPIRED`. No se edita la fila.                                                                                                               |
| Log `scheduled_task_run` con `lease_lost` | El handler superó el arrendamiento sin renovarlo y otro worker tomó la ventana. Revisar la duración (`ice24.scheduler.run.duration`) y el tamaño de lote de la tarea.                                                                                                                                      |
| `scheduled_windows_skipped`               | Hubo una caída o una pausa más larga que el límite de recuperación. Las ventanas omitidas no se ejecutan automáticamente. Para un periodo de reporte omitido, decidir con el responsable de F10-09. Los vencimientos y la reconciliación no lo necesitan, porque cada ejecución procesa todo lo pendiente. |
| DLQ con `SCHEDULED_TASK_UNKNOWN`          | El worker desplegado no tiene esa tarea (versión antigua o tarea quitada). Desplegar la versión correcta y reintentar desde el Centro de trabajos.                                                                                                                                                         |
| `STRIPE_UNAVAILABLE`                      | Proveedor caído o con límite de tasa. Se reintenta con backoff; al agotarse, reencolar cuando Stripe responda.                                                                                                                                                                                             |
| Log `stripe_reconciliation_disabled`      | Esperado mientras el adaptador Stripe no esté validado en remoto (`STRIPE_RECONCILIATION_PENDING_VALIDATION` o `..._NOT_CONFIGURED`). Las demás tareas funcionan.                                                                                                                                          |

## Vencimientos de suscripción

`subscriptions.expirations` materializa demos vencidas (`read_only`) y cancelaciones programadas con periodo pagado terminado (`cancelled`). El acceso ya se restringía por reloj, así que un retraso del scheduler **no** concede escritura: solo retrasa el estado persistido, el historial y la auditoría. Para verificarlo:

```sql
select event_type, actor_type, reason, occurred_at from subscriptions.events
where actor_type = 'SYSTEM' order by occurred_at desc limit 20;
select operation, origin, correlation_id from audit.events
where operation in ('DEMO_EXPIRED','SUBSCRIPTION_CANCELLED') order by occurred_at_utc desc limit 20;
```

La correlación de la ventana aparece en `subscriptions.events`, `audit.events`, `infra.outbox_events` y el trabajo. No se aplican periodos de gracia, borrados ni retenciones (DEC-017, DEC-008).

## Hallazgos de reconciliación

```sql
select f.kind, f.local_value, f.remote_value, f.source, f.created_at, f.subscription_id
from subscriptions.reconciliation_findings f order by f.created_at desc limit 50;
```

Los hallazgos son evidencia: la tarea no corrige. Ante `STATUS_MISMATCH` o `PERIOD_MISMATCH`, revisar `subscriptions.stripe_webhooks` de esa suscripción (entregas `FAILED` o faltantes) y pedir a Stripe la reentrega del evento firmado ([runbook de Stripe](stripe.md)). Ante `OWNERSHIP_MISMATCH` o `PRICE_MISMATCH`, escalar a Finanzas y Seguridad. No se edita la suscripción a mano.

## Periodos de reporte

`reports.*-period` publica `ReportPeriodClosed` en el outbox. Mientras no exista TASK-F10-09, ningún consumidor lo usa y no se envía correo. Comprobación:

```sql
select id, payload, occurred_at, published_at from infra.outbox_events
where event_type = 'ReportPeriodClosed' order by occurred_at desc limit 10;
```

## Despliegue y reversión

Orden: migración `20261005000100_phase5_scheduler.sql` y después el worker. La migración es aditiva: amplía la restricción de actor de `subscriptions.events` a `SYSTEM` y la auditoría central registra el origen `WORKER`. Los binarios anteriores no escriben eventos `SYSTEM`. Para revertir, se despliega el worker anterior: dejan de crearse ventanas y las encoladas permanecen visibles. No se borran ventanas, historial, hallazgos ni eventos; los triggers lo impiden. Antes de producción, el worker persistente necesita hospedaje aprobado (ADR-021, DEC-026).
