# Trabajos asíncronos y Centro de trabajos

Ownership: plataforma. Fuente de requisitos: TASK-F5-07, TRD sección 10 (pasos 5 y 7), Architecture sección 20, Database `async_jobs`, API `Job`, JOB-001 e INT-004.

## Registro

`infra.async_jobs` guarda el estado actual de cada trabajo e `infra.async_job_transitions` su historial append-only. Estados de `Database.md`: `QUEUED`, `RUNNING`, `SUCCEEDED`, `RETRY_WAIT`, `FAILED` y `DEAD_LETTER`. Un trigger valida la máquina de estados (código `IC409` ante una transición inválida) y protege la identidad del trabajo; el rol de servicio sólo lee. Los cambios ocurren mediante funciones `infra.*` con `security definer` que siempre escriben el historial:

| Función                 | Uso                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `job_start_delivery`    | El worker inicia una entrega. Las copias del mismo evento comparten trabajo (`DOMAIN_EVENT` + `cola:eventId`).                                 |
| `job_finish`            | Resultado del worker: `succeeded`, `retry_scheduled` (con `next_attempt_at` igual al backoff de `infra.fail_job`), `dead_lettered` o `failed`. |
| `job_record_poison`     | Mensaje que no cumple el contrato: trabajo `DEAD_LETTER` con origen `QueueMessage`.                                                            |
| `retry_dead_letter_job` | INT-004 (ver abajo).                                                                                                                           |
| `queue_overview`        | Profundidad y antigüedad de colas y DLQ sin conceder acceso a PGMQ.                                                                            |

## Reproceso auditado (INT-004)

`POST /api/v1/admin/jobs/{jobId}/retry` con `jobs.retry`, MFA, `Idempotency-Key` y `{reason}` (10 a 1000 caracteres). Sólo trabajos `DEAD_LETTER` o `FAILED`. En una transacción: toma el mensaje de la DLQ por `sourceQueue` y `sourceMessageId`, reenvía el payload original a su cola, archiva el mensaje muerto, deja el trabajo en `QUEUED` con `manualRetryCount` incrementado, registra la transición con actor, motivo y clave, y escribe `JobRetryRequested` en `audit.events` (origen `ADMIN`). La misma clave devuelve el trabajo sin reenviar; otro estado responde 409.

La ruta es la implementación autenticada por usuario de INT-004: el soporte actúa con su identidad, permiso y MFA en lugar de un secreto de servicio, de modo que la auditoría identifica a la persona.

## API y permisos

| Ruta                                              | Permiso                                        | Descripción                                                                                                       |
| ------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/jobs/{jobId}` (JOB-001)              | `jobs.read` (IA, OW)                           | Recurso público `Job` de la cuenta activa: `queued`, `processing`, `completed`, `failed`. 404 fuera de la cuenta. |
| `GET /api/v1/admin/jobs`                          | `jobs.admin-read` + MFA + ámbito completo (IA) | Lista con filtros de estado, tipo, cola, cuenta y fechas; cursor por fecha y UUID.                                |
| `GET /api/v1/admin/jobs/{jobId}`                  | `jobs.admin-read`                              | Detalle con historial. Nunca payloads ni `error_detail_restricted`.                                               |
| `GET /api/v1/admin/job-queues`                    | `jobs.admin-read`                              | Colas, DLQ, conteo por estado y outbox.                                                                           |
| `POST /api/v1/admin/jobs/{jobId}/retry` (INT-004) | `jobs.retry` + MFA                             | Reproceso auditado.                                                                                               |

## Interfaz

`/jobs` (BFF `/api/jobs`): tarjetas de colas, outbox y estados; filtros; tabla paginada; detalle con historial y foco gestionado; formulario de reintento con motivo, CSRF y clave de idempotencia estable ante reintentos de red. Estados de carga, vacío, error, permiso y contexto desactualizado. Enlace desde el espacio de trabajo sólo si la API concede el acceso. [Runbook](../runbooks/queues.md) · [Reporte](../tasks/task-f5-07.md).
