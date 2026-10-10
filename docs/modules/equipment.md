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

## Evidencias

PDF, PNG y JPEG de hasta 5 MiB se validan por firma y Base64 canónico. Los binarios se almacenan en el bucket privado `quarantine`; PostgreSQL conserva metadatos y SHA-256. ClamAV produce estados `clean`, `rejected` o `quarantine`. Sin escáner disponible no se permite descargar. Un archivo limpio recibe URL firmada por 60 segundos.

Consultar [operación](../runbooks/equipment.md) y [resultados QA](../qa/phase-4/README.md). La integración con datos sintéticos no sustituye la validación de identidad, almacenamiento y antivirus del ambiente real.
