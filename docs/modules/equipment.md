# Módulo de cuentas y equipos

La Fase 4 incorpora cuentas, sucursales, permisos delegados, catálogos, plantillas versionadas, solicitudes y expediente permanente de máquinas. El alcance corresponde a F4-01 a F4-17 de `context/TASKS.md`; backend mantiene autorización y transacciones, frontend el BFF y DevOps la operación.

## Modelo y consistencia

La migración `supabase/migrations/20260917000100_phase4_equipment.sql` introduce el esquema `equipment`. Identidad y contexto permanecen en `identity`. La máquina conserva código permanente y periodos de propiedad, ubicación y plantilla. Los estados operativo, técnico, sanitario y de publicación permanecen separados. Retirar conserva el expediente y cancela actividades pendientes; transferir conserva historia técnica y elimina acceso del propietario anterior.

Las plantillas publicadas son inmutables. Asignar una versión produce jobs durables en `equipment.schedule_jobs`; el worker ajusta actividades futuras y conserva definiciones históricas. La auditoría se confirma dentro de la transacción y es append-only.

## Interfaces y seguridad

La API se publica bajo `/v1` y Swagger en `/v1/docs`. Los controladores de `apps/api/src/modules/equipment/` enumeran las rutas; `packages/contracts/src/equipment.ts` valida entradas. Los recursos incluyen `accounts`, `branches`, `account-users`, `account-invitations`, `catalogs`, `technical-models`, `template-versions`, `equipment-requests`, `machines`, `machine-transfers` y `equipment-files`. Las acciones centrales están bajo `/v1/admin`.

Cada operación requiere autenticación, contexto vigente y permiso por objeto. Las mutaciones usan `Idempotency-Key`; los cambios con control de concurrencia requieren `If-Match` con `row_version`. El navegador utiliza `/workspace` y el BFF `/api/equipment`, con CSRF y vinculación al contexto. Los roles de navegador no acceden directamente al esquema de equipos.

## Catálogo oficial y por cuenta (F4-18, RA-01)

`equipment.catalog_entries` distingue el alcance (`scope`): `OFFICIAL` es el catálogo de ICE24 (`account_id` nulo) y `ACCOUNT` son componentes y características propios de una cuenta (`account_id` obligatorio). La migración `20261009000100_phase4_account_catalog.sql` marca como oficiales los registros existentes, sustituye la unicidad global de `code` por unicidad por alcance (global para oficiales, por cuenta para propios), restringe las entradas de cuenta a `component` y `characteristic`, e impide borrar entradas o cambiar su identidad (alcance, cuenta, tipo y código). Retirar es `status = retired`.

- **Visibilidad.** `GET /v1/catalogs` devuelve el catálogo utilizable de la cuenta activa: oficiales activos más propios activos, sin exponer `account_id`. Las plantillas oficiales solo aceptan entradas `OFFICIAL`.
- **Administración propia.** `/v1/account-catalog-entries`: listar (cursor, filtro `status`), consultar, crear (`Idempotency-Key`), editar la definición (`If-Match` + `Idempotency-Key`; código y tipo inmutables) y retirar (`POST …/retire` con motivo y confirmación). Las respuestas son el DTO `AccountCatalogEntry` de `packages/contracts`, no filas de base de datos. Errores normalizados (`FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PRECONDITION_FAILED` para versión vieja, `ACCOUNT_READ_ONLY`).
- **Permisos (RA-01-D2).** Leer requiere `equipment.read`. Escribir requiere `equipment.manage`, `equipment.catalog-manage` (solo rol `OW`) y ámbito de cuenta completa; se evalúa con `@ice24/authorization` antes de reproducir una respuesta idempotente. Una entrada oficial responde 403; una de otra cuenta, 404. El catálogo oficial se sigue administrando en `/v1/admin/catalogs`.
- **Actividad propia (RA-01-D3).** Un componente propio puede declarar `maintenanceActivity`: código, nombre, categoría, frecuencia por defecto (`value` + `unit` en `days`, `weeks` o `months`, hasta diez años), checklist y evidencia con la misma forma que las actividades de plantilla. `data` guarda `schemaVersion: 1`. La programación de esa actividad corresponde a F4-19/F4-21.
- **Auditoría.** `ACCOUNT_CATALOG_CREATED`, `ACCOUNT_CATALOG_UPDATED` y `ACCOUNT_CATALOG_RETIRED` se escriben en `equipment.events` dentro de la transacción y se proyectan a `audit.events` por el productor de Fase 5.

Detalle, riesgos y reversión en el [reporte de F4-18](../tasks/task-f4-18.md).

## Componentes por máquina (F4-19, RA-01)

`equipment.machine_component_configs` (migración `20261010000100_phase4_machine_components.sql`) guarda, por máquina y componente, versiones con origen (`TEMPLATE_DEFAULT`, `TEMPLATE_OPTIONAL`, `ACCOUNT_CUSTOM`), estado (`active`/`inactive`), vigencia (`valid_from`/`valid_to`), actor, motivo y `row_version`. Cada cambio cierra la versión abierta e inserta la siguiente con `row_version + 1`; una restricción `exclude using gist` impide solapamientos por componente, y los triggers impiden borrar o reescribir historia (solo se puede cerrar una versión abierta) y exigen que el componente sea oficial o de la misma cuenta que la máquina, con un origen coherente con su alcance.

- **Activación.** Aprobar la solicitud (F4-08/F4-10) precarga, en la misma transacción, los componentes de la versión de plantilla como `TEMPLATE_DEFAULT` activos y audita `MACHINE_COMPONENTS_PRELOADED`.
- **Origen.** Lo deriva el servidor: componente de la plantilla → `TEMPLATE_DEFAULT`; otro componente oficial → `TEMPLATE_OPTIONAL`; componente propio de la cuenta → `ACCOUNT_CUSTOM`.
- **Expediente.** `GET /v1/machines/{id}/components` devuelve `current` (versión abierta de cada componente) e `history` (todas), con la misma visibilidad que el resto del expediente.
- **Cambios.** `POST /v1/machines/{id}/components` (agregar del catálogo oficial o propio), `POST …/components/{componentId}/activate` y `…/deactivate`, con `Idempotency-Key`, `If-Match` (412 si la versión no coincide), motivo y confirmación. Se auditan `MACHINE_COMPONENT_ADDED`, `_ACTIVATED` y `_DEACTIVATED` con valores anterior y nuevo, sobre la máquina (aparecen en su línea de tiempo y en `audit.events`).
- **Permisos (RA-01-D2 ampliada).** `equipment.machine-components-manage` para `OW` y `OP`, evaluado con el alcance `BRANCH` de `@ice24/authorization` contra la sucursal de la máquina: el propietario en cualquier máquina, el Operador solo en las de sus sucursales (403 en otra sucursal de la misma cuenta; 404 si la máquina es de otra cuenta). El resto consulta. La comprobación bloquea la máquina y ocurre antes de reproducir una respuesta idempotente.
- **Transferencia (F4-12).** La configuración viaja con la máquina. Las versiones abiertas que usan componentes propios de la cuenta origen se cierran en el instante de la transferencia (`MACHINE_COMPONENTS_TRANSFER_CLOSED`, auditado en la cuenta origen) y permanecen en la historia. La cuenta destino ve esas versiones sin detalle del componente (`component: null`) y no ve actor ni motivo de versiones anteriores a su propiedad; los componentes oficiales siguen activos.

Detalle y decisiones en el [reporte de F4-19](../tasks/task-f4-19.md).

## Frecuencias de fábrica y del cliente (F4-20, RA-01)

La frecuencia de cada actividad de la plantilla ICE24 es el valor de fábrica y nunca se modifica. `equipment.maintenance_frequency_overrides` (migración `20261011000100_phase4_frequency_overrides.sql`) guarda las frecuencias del cliente por versión: alcance `ACCOUNT` (toda la cuenta) o `MACHINE`, actividad (`activity_code`, y `component_catalog_id` si es la actividad de un componente propio), tipo (`MAINTENANCE`/`SANITATION`), frecuencia y anticipación de alerta con unidad (`days`, `weeks`, `months`), copia de los valores de fábrica vigentes, `warranty_warning_acknowledged_at`, vigencia, actor, motivo y `row_version`. Como en F4-19, editar cierra la versión abierta e inserta la siguiente; no hay borrado ni solapamiento.

- **Resolución.** `resolveEffectiveFrequency` (`@ice24/domain`, función pura) aplica máquina → cuenta → plantilla. La anticipación de alerta sigue el mismo orden; si un nivel no la define, la hereda del siguiente. Siempre devuelve el valor de fábrica. Solo las actividades por tiempo tienen frecuencia; las de uso, condición o evento no admiten sobrescritura.
- **Advertencia de garantía (RA-01-D1).** No hay mínimo: basta un entero positivo con unidad válida (hasta diez años). Si el valor difiere del de fábrica de ICE24 (1 semana = 7 días; los meses solo se comparan con meses), la API exige `warrantyWarningAcknowledged: true`. Sin ese campo responde 422 `WARRANTY_WARNING_CONFIRMATION_REQUIRED` con los valores de fábrica en `details`. La confirmación queda en la fila y en la auditoría. Los componentes propios no tienen valor de fábrica ICE24 y no piden advertencia.
- **Expediente.** `GET /v1/machines/{id}/frequencies` devuelve, por actividad, la frecuencia efectiva, su fuente, el valor de fábrica, si difiere de él y las sobrescrituras de cuenta y máquina vigentes.
- **Cambios.** Por máquina: `POST` (crear) y `PUT` (editar con `If-Match`) en `/v1/machines/{id}/frequency-overrides`, y `POST …/frequency-overrides/reset`. Por cuenta: lo mismo en `/v1/account-frequency-overrides`, más `GET` para consultar las vigentes. Todos los cambios llevan `Idempotency-Key`, motivo y confirmación. "Restablecer valores de fábrica" cierra las sobrescrituras de un componente, de una actividad o todas las de la máquina o de la cuenta.
- **Permisos (RA-01-D2 ampliada).** Frecuencias de cuenta: `equipment.account-frequencies-manage`, solo `OW` y con alcance de cuenta. Frecuencias de máquina: `equipment.machine-frequencies-manage` (`OW` y `OP`), evaluado con el alcance `BRANCH` contra la sucursal de la máquina, igual que los componentes.
- **Evento.** Cada cambio escribe `MACHINE_FREQUENCIES_CHANGED` o `ACCOUNT_FREQUENCIES_CHANGED` en `equipment.events`. En la misma transacción se proyecta a `audit.events` y al outbox de Fase 5 (`MachineFrequenciesChanged` / `AccountFrequenciesChanged`), con `operation` (`CREATE`, `UPDATE`, `RESET`, `TRANSFER_CLOSED`) y `machineIds` en el payload. F4-21 lo consumirá para recalcular calendarios; F4-20 no recalcula nada.
- **Sin efecto sanitario ni público (RA-01-D4).** Ningún cambio de frecuencia toca `sanitary_status`, `publication_status` ni otro campo de la máquina.
- **Transferencia.** Las frecuencias de máquina pertenecen a la cuenta que las definió. Se cierran al transferir y quedan como historia; la cuenta destino parte de los valores de fábrica.

Detalle y decisiones en el [reporte de F4-20](../tasks/task-f4-20.md).

## Recálculo de calendarios (F4-21, RA-01)

El calendario de cada máquina refleja los componentes activos y la frecuencia efectiva. La migración `20261012000100_phase4_schedule_recalc.sql` agrega a `schedule_jobs` el tipo (`template` de F4-13/F4-14 o `recalc`), una clave de generación única y la correlación. A `scheduled_activities` agrega `component_catalog_id` y `alert_at`, que son inmutables como el resto de la definición.

- **Generación.** Cada job reconstruye el plan con el estado actual de la máquina. El plan incluye las actividades de la plantilla vigente y las actividades de los componentes propios activos (RA-01-D3), con la frecuencia efectiva de `resolveEffectiveFrequency`. El vencimiento es el ancla más la frecuencia; el ancla es lo más reciente entre el inicio del periodo de plantilla, la activación del componente y el vencimiento de la última actividad en curso o completada. `alert_at` es el vencimiento menos la anticipación efectiva.
- **Snapshot.** `definition.schedule` guarda la frecuencia aplicada, la fuente (`TEMPLATE`, `ACCOUNT`, `MACHINE`), el valor de fábrica, la anticipación y su fuente, y el ancla. Las actividades por uso, condición o evento llevan `schedule: null`.
- **Disparadores.** El consumidor `schedule-recalc` encola un job `recalc:<eventId>:<machineId>` por cada evento de componente (`MachineComponentAdded`, `…Activated`, `…Deactivated`, `MachineComponentsTransferClosed`), de frecuencias de máquina o de cuenta y `MachineTransferred`. Los eventos de cuenta afectan a todas las máquinas no retiradas de la cuenta.
- **Reglas (RF-TPL-007).** Solo cambian actividades `pending` futuras: las idénticas se conservan y las demás se cancelan e insertan de nuevo. Las actividades `in_progress`, `completed`, `cancelled` y las pendientes vencidas nunca se modifican; una pendiente vencida bloquea su clave hasta que se atienda.
- **Orden e idempotencia.** El plan depende solo del estado, así que un cambio de plantilla (F4-14) y un recálculo dan el mismo calendario en cualquier orden. Un evento repetido no crea otro job, y un job sin diferencias termina como `unchanged` sin tocar filas.
- **Observabilidad.** Métricas `ice24.schedule.*` y logs `schedule_job_finished` con la correlación del cambio. El tratamiento de fallos (recálculo atascado o en `failed`) está en el [runbook](../runbooks/equipment.md#recálculo-de-calendarios-f4-21).

Detalle y decisiones en el [reporte de F4-21](../tasks/task-f4-21.md).

## Interfaz de componentes y frecuencias y backfill (F4-22, RA-01)

- **Expediente.** El expediente de máquina se organiza en pestañas (`Resumen y acciones`, `Componentes`, `Frecuencias y alertas`, `Calendario y trazabilidad`). `Componentes` lista los componentes vigentes con origen y estado, el historial de versiones, agregar del catálogo, activar/desactivar con motivo y crear un componente propio con su actividad (checklist y evidencia). `Frecuencias y alertas` muestra por actividad el valor de fábrica ICE24, el valor del cliente y la fuente; cambiar un valor de fábrica abre la advertencia de garantía (RA-01-D1) que el usuario debe aceptar; hay "Restablecer valores de fábrica" por actividad, por componente y por máquina. El calendario muestra la frecuencia aplicada y su fuente.
- **Cuenta.** La pestaña `Componentes y frecuencias` del espacio de trabajo permite aplicar una frecuencia a todas las máquinas de un modelo y restablecerla, consultar y restablecer los valores definidos para toda la cuenta y ver los componentes propios.
- **Por modelo.** `GET /v1/technical-models/{id}/frequencies` (solo usuarios con ámbito de cuenta), `POST /v1/technical-models/{id}/frequency-overrides` y `…/reset` (propietario; permiso `equipment.account-frequencies-manage`). Aplicar escribe una sobrescritura de máquina en cada máquina no retirada del modelo, en una transacción, con un evento `MACHINE_FREQUENCIES_CHANGED` por máquina (F4-21 recalcula cada calendario).
- **Controles por rol (RA-01-D2).** `GET /v1/equipment-workspace` incluye `configuration` (`accountCatalog`, `accountFrequencies`: `edit`/`read`/`hidden`, `machineBranches`: `ALL` o sucursales), calculado con `authorize()` y los mismos permisos que las escrituras. La UI solo oculta controles; la API vuelve a autorizar cada escritura y el BFF conserva su código (`FORBIDDEN`, `PRECONDITION_FAILED`, `WARRANTY_WARNING_CONFIRMATION_REQUIRED`).
- **Backfill.** `20261013000100_phase4_components_backfill.sql` da a cada máquina no retirada sin configuración los componentes de su plantilla (`TEMPLATE_DEFAULT`, activos), sin sobrescrituras, eventos ni cambios de calendario; es idempotente.

Detalle y decisiones en el [reporte de F4-22](../tasks/task-f4-22.md).

## Evidencias

PDF, PNG y JPEG de hasta 5 MiB se validan por firma y Base64 canónico. Los binarios se almacenan en el bucket privado `quarantine`; PostgreSQL conserva metadatos y SHA-256. ClamAV produce estados `clean`, `rejected` o `quarantine`. Sin escáner disponible no se permite descargar. Un archivo limpio recibe URL firmada por 60 segundos.

Consultar [operación](../runbooks/equipment.md) y [resultados QA](../qa/phase-4/README.md). La integración con datos sintéticos no sustituye la validación de identidad, almacenamiento y antivirus del ambiente real.
