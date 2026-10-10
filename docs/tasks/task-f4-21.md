# TASK-F4-21 — Recálculo de calendarios y alertas al cambiar componentes o frecuencias

Estado: implementada el 09/10/2026 en la rama `feat/f4-21-schedule-recalc`, creada desde `main` (`6245578`, F4-20 integrada por #32). Complemento de la Fase 4 derivado de RA-01. Pendiente de revisión humana (migración, SQL explícito del worker y consumidor del outbox). No se desplegó ni se aplicaron migraciones remotas.

## Alcance y trazabilidad

- TASKS F4-21; PRD RF-TPL-016 (calendario según componentes activos y frecuencia efectiva) y RF-TPL-007 (las actividades históricas conservan su definición); `Requerimientos_Adicionales_v1.1.md` RA-01-D3 (actividad del componente propio); F4-13 (generación), F4-14 (nueva versión de plantilla), F4-19, F4-20; Fase 5: outbox (F5-05), consumidores (F5-06), observabilidad (F5-13/F5-14).
- `docs/tasks/task-f4-13.md` y `task-f4-14.md`, citados por la solicitud, no existen en el repositorio. El comportamiento previo se tomó del código (`apps/worker/src/processors/scheduling.ts`, `machines.store.ts`, `requests.store.ts`) y de `tests/integration/equipment.test.ts`.
- `apps/worker/src/processors/scheduler` es el planificador de ventanas de Fase 5 (suscripciones, reportes, conciliación, retención); no genera actividades ni alertas de mantenimiento, así que no se modificó.
- Fuera de alcance: notificar alertas de mantenimiento a partir de `alert_at` (F7/F8), interfaz y backfill de máquinas existentes (F4-22).

## Requisitos de la solicitud

| #   | Requisito                                                        | Entrega                                                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Generación con componentes activos y frecuencia efectiva (D3)    | `planActivities` (`apps/worker/src/processors/scheduling-plan.ts`): actividades de la plantilla vigente y de los componentes propios activos, con `resolveEffectiveFrequency` de F4-20                                       |
| 2   | Snapshot en `definition`                                         | `definition.schedule`: frecuencia aplicada, fuente (`TEMPLATE`/`ACCOUNT`/`MACHINE`), valor de fábrica, anticipación, su fuente y ancla                                                                                       |
| 3   | Consumidor que encola un job idempotente por máquina o cuenta    | `schedule-recalc` (`apps/worker/src/processors/schedule-recalc.ts`): un job `recalc:<eventId>:<machineId>` por máquina; los eventos de cuenta alcanzan todas sus máquinas no retiradas; `on conflict do nothing`             |
| 4   | Solo pendientes futuras; compatible con F4-14 en cualquier orden | Diferencia contra las `pending` futuras; `in_progress`, `completed`, `cancelled` y pendientes vencidas intactas. El plan depende solo del estado, por eso un cambio de plantilla y un recálculo convergen en cualquier orden |
| 5   | Ventanas de alerta con la anticipación efectiva                  | Columna `alert_at` = vencimiento − anticipación efectiva (máquina → cuenta → plantilla)                                                                                                                                      |
| 6   | Pruebas                                                          | `tests/integration/schedule-recalc.test.ts` (9, flujo completo outbox → cola → consumidor → job → calendario), `scheduling-plan.test.ts` (7), aritmética de fechas en `@ice24/domain` (3), observador (1), pgTAP (8)         |
| 7   | Observabilidad, runbook y reporte                                | `createScheduleObserver` en `@ice24/observability`: métricas `ice24.schedule.*` y logs `schedule_job_finished` con correlación; `docs/runbooks/equipment.md` (recálculo atascado, `failed` y DLQ del outbox); este reporte   |

## Criterios de aceptación (TASKS F4-21)

| Criterio                                                                                         | Estado                                                                        |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| La generación usa componentes activos y frecuencia efectiva                                      | Cumplido                                                                      |
| Agregar/desactivar componente o cambiar frecuencia recalcula solo actividades futuras pendientes | Cumplido; en curso y completadas probadas intactas                            |
| Las actividades guardan la fuente de la frecuencia aplicada                                      | Cumplido (`definition.schedule.source`, más fábrica y anticipación)           |
| El recálculo es idempotente y se ejecuta vía job                                                 | Cumplido: un job por evento y máquina; un job sin diferencias no cambia filas |
| Trazabilidad y contradicciones registradas                                                       | Cumplido: ver [Decisiones y observaciones](#decisiones-y-observaciones)       |

## Diseño

- **Plan desde el estado.** Bajo el bloqueo de la máquina, el job lee el periodo de plantilla abierto, la definición de la plantilla vigente, los componentes propios activos con `maintenanceActivity`, las sobrescrituras abiertas de la cuenta y de la máquina, y el último vencimiento en curso o completado por actividad. `planActivities` es una función pura: no usa el contenido del evento ni la hora del job. Por eso el resultado es el mismo con cualquier orden de jobs.
- **Vencimiento.** Ancla + frecuencia efectiva. El ancla es lo más reciente entre el inicio del periodo de plantilla, la activación vigente del componente y el vencimiento de la última actividad en curso o completada de la misma clave. Días y semanas son múltiplos exactos de 24 h; los meses son calendario UTC con ajuste al último día (`addFrequency` en `@ice24/domain`). La clave de una actividad es componente + código, porque el código de un componente puede repetir el de la plantilla.
- **Aplicación (RF-TPL-007).** `diffSchedule` compara el plan con las pendientes futuras (código, componente, vencimiento, alerta y definición canónica). Conserva las idénticas, cancela las demás e inserta las nuevas con `generation_key` = id del job. Una pendiente vencida es trabajo adeudado: no se toca y bloquea su clave hasta atenderse.
- **Jobs.** `schedule_jobs.kind` distingue `template` (aprobación F4-08/F4-10 y cambio de plantilla F4-14) de `recalc`. Un job `template` obsoleto (la máquina ya tiene otra plantilla) sigue sin generar nada, como antes. Ambos tipos usan el mismo plan.
- **Consumidor.** Se registra en `domainEventConsumers` y suscribe `MachineComponentAdded`, `MachineComponentActivated`, `MachineComponentDeactivated`, `MachineComponentsTransferClosed`, `MachineFrequenciesChanged`, `MachineTransferred` y `AccountFrequenciesChanged`. La idempotencia es doble: `infra.claim_message` por consumidor y evento, y la clave única del job. Las máquinas de una cuenta se resuelven al consumir, no al emitir.
- **Fallos.** Tras cinco intentos el job queda `failed` con `SCHEDULE_GENERATION_FAILED` y un log de error (`dead_lettered`). El consumidor sigue la política de reintento y DLQ de `domain_events` de Fase 5.

## Decisiones y observaciones

- **Actividades de plantilla y componentes oficiales.** `template_versions.definition` no vincula actividades con componentes (observado en F4-19 y F4-20). Desactivar un componente oficial no cambia actividades; solo las actividades de componentes propios (RA-01-D3) dependen del estado del componente. Vincular actividades de plantilla a componentes es un cambio de F4-06 que debe decidir ICE24.
- **Última actividad realizada.** `scheduled_activities` no guarda la fecha real de ejecución; se usa el vencimiento de la última actividad en curso o completada como aproximación. Cuando mantenimiento registre la ejecución (F7), el ancla debería usar esa fecha.
- **Una ocurrencia por actividad.** Como F4-13, el calendario mantiene la siguiente ocurrencia de cada actividad, no una serie. Un acortamiento de frecuencia puede dejar la siguiente ocurrencia ya vencida; queda pendiente y vencida, que es el estado correcto.
- **Alerta de fábrica.** La plantilla no define anticipación (decisión de F4-20); `alert_at` solo existe cuando el cliente define una.
- **Restricción única.** La restricción de Fase 4 `unique(machine_id, generation_key, activity_code)` se reemplazó por un índice único que incluye el componente. El nombre generado se busca en el catálogo porque PostgreSQL lo trunca.
- **Dependencia nueva.** `@ice24/worker` depende ahora de `@ice24/domain` (permitido por las fronteras del monorepo); `pnpm-lock.yaml` cambia en tres líneas.

## Archivos

- Base de datos: `supabase/migrations/20261012000100_phase4_schedule_recalc.sql`; pgTAP `supabase/tests/database/phase4_schedule_recalc_test.sql` (8).
- Dominio: `packages/domain/src/maintenance-frequency.ts` (`addFrequency`, `subtractFrequency`) y su prueba.
- Observabilidad: `packages/observability/src/schedule-generation.ts` y su prueba; `index.ts`.
- Worker: `processors/scheduling.ts` (reescrito: plan desde el estado, diferencia, observador), `processors/scheduling-plan.ts` y su prueba (nuevos), `processors/schedule-recalc.ts` (nuevo), `consumers/index.ts`, `main.ts`, `package.json`; `notifications/email-deliveries.test.ts` (registro de consumidores).
- Pruebas de integración: `tests/integration/schedule-recalc.test.ts` (nuevo); `equipment.test.ts`, `machine-components.test.ts` y `frequency-overrides.test.ts` aplican la migración nueva.
- Documentación: `docs/modules/equipment.md`, `docs/runbooks/equipment.md`, `docs/tasks/README.md` y este reporte.

## Migración, compatibilidad y reversión

- Columnas nuevas con valor por defecto o nulas, un índice único sobre filas existentes y la función `equipment.protect_history()` redefinida con las columnas nuevas. Duración: segundos. Orden: migración, después worker.
- Compatibilidad: la API no cambia. Un worker anterior seguiría procesando jobs `template`, pero fallaría con jobs `recalc` (ignoraría el tipo y usaría la plantilla del job) y con la restricción única nueva; por eso el worker debe desplegarse junto con la migración. Las actividades ya generadas conservan su definición sin `schedule`.
- Reversión: preferir corrección hacia adelante. Antes del primer recálculo, el encabezado de la migración documenta cómo retirarla. Con actividades recalculadas, las filas son historia del calendario y se conservan.

## Pruebas y validación

Comandos ejecutados el 09/10/2026 en Windows 11 con Node 24 y Docker Desktop 29.7.2:

- `pnpm check` (Prettier, ESLint sin advertencias, typecheck, fronteras, infraestructura, identidad, Vitest con 442 pruebas en 74 archivos): en verde.
- `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329 pnpm build`: 14 tareas en verde.
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: en verde, 141 pruebas en 18 archivos (incluidas las de navegador y las 9 nuevas). Las capturas de F5-15 que reescribe la ejecución se restauraron.
- `supabase db reset --local --no-seed`, `db lint --local --level error` (solo hallazgos de PostGIS en `extensions`) y `supabase test db`: PASS, 353 pruebas en 19 archivos, incluido `phase4_schedule_recalc_test.sql` (8).

Casos de `tests/integration/schedule-recalc.test.ts` (tres máquinas de una cuenta; flujo real outbox → publicador → `domain_events` → consumidor → job → calendario):

1. La activación genera el calendario de fábrica con snapshot (`TEMPLATE`, fábrica, ancla = inicio de plantilla); la actividad por uso queda sin vencimiento ni snapshot.
2. Activar el componente propio agrega su actividad (6 meses desde su activación) solo en esa máquina; las demás actividades conservan sus filas.
3. Idempotencia: el mismo evento procesado dos veces crea un solo job (con la correlación del evento), y un job nuevo sin cambios de estado termina `unchanged` sin tocar filas.
4. Una frecuencia de cuenta con anticipación se aplica a las tres máquinas (vencimiento, `alert_at`, fuente `ACCOUNT`, fábrica 30 días; la anterior queda cancelada); tres jobs y logs `generated` con la correlación del cambio.
5. Actividades `in_progress` y `completed` no cambian; la siguiente ocurrencia se ancla en su vencimiento con la frecuencia de máquina.
6. Desactivar el componente cancela su actividad futura.
7. Restablecer valores de fábrica (máquina y cuenta) devuelve el calendario de fábrica, sin alerta.
8. Cambio de plantilla (F4-14) y recálculo en orden inverso en dos máquinas con el mismo estado: calendarios idénticos (plantilla nueva de 10 días; frecuencia de máquina).
9. Un job que falla se reintenta y queda `failed` al quinto intento, con logs `retried` ×4 y `dead_lettered`.

## Riesgos y deuda

- Notificar alertas con `alert_at` corresponde a F7/F8; hoy solo se calcula y guarda.
- Máquinas activadas antes de F4-19/F4-21 tienen actividades sin `schedule` hasta su próximo recálculo o el backfill de F4-22.
- Un evento de cuenta con muchas máquinas crea un job por máquina en la misma transacción del consumidor; volumen aceptable en Fase 4, revisar con cuentas grandes.
- Worker y migración deben desplegarse juntos (ver compatibilidad).

## Validación manual pendiente

1. Revisión humana de la migración, del SQL del worker y del consumidor.
2. En un ambiente con worker y PGMQ reales: cambiar una frecuencia de cuenta y comprobar el recálculo en todas las máquinas, las métricas `ice24.schedule.*` y los logs con correlación; forzar un fallo y seguir el runbook.
3. Decidir con ICE24 si las actividades de plantilla deben vincularse a componentes oficiales.
