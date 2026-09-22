# Módulo de cuentas y equipos

La Fase 4 incorpora cuentas, sucursales, permisos delegados, catálogos, plantillas versionadas, solicitudes y expediente permanente de máquinas. El alcance corresponde a F4-01 a F4-17 de `context/TASKS.md`; backend mantiene autorización y transacciones, frontend el BFF y DevOps la operación.

## Modelo y consistencia

La migración `supabase/migrations/20260917000100_phase4_equipment.sql` introduce el esquema `equipment`. Identidad y contexto permanecen en `identity`. La máquina conserva código permanente y periodos de propiedad, ubicación y plantilla. Los estados operativo, técnico, sanitario y de publicación permanecen separados. Retirar conserva el expediente y cancela actividades pendientes; transferir conserva historia técnica y elimina acceso del propietario anterior.

Las plantillas publicadas son inmutables. Asignar una versión produce jobs durables en `equipment.schedule_jobs`; el worker ajusta actividades futuras y conserva definiciones históricas. La auditoría se confirma dentro de la transacción y es append-only.

## Interfaces y seguridad

La API se publica bajo `/v1` y Swagger en `/v1/docs`. Los controladores de `apps/api/src/modules/equipment/` enumeran las rutas; `packages/contracts/src/equipment.ts` valida entradas. Los recursos incluyen `accounts`, `branches`, `account-users`, `account-invitations`, `catalogs`, `technical-models`, `template-versions`, `equipment-requests`, `machines`, `machine-transfers` y `equipment-files`. Las acciones centrales están bajo `/v1/admin`.

Cada operación requiere autenticación, contexto vigente y permiso por objeto. Las mutaciones usan `Idempotency-Key`; los cambios con control de concurrencia requieren `If-Match` con `row_version`. El navegador utiliza `/workspace` y el BFF `/api/equipment`, con CSRF y vinculación al contexto. Los roles de navegador no acceden directamente al esquema de equipos.

## Evidencias

PDF, PNG y JPEG de hasta 5 MiB se validan por firma y Base64 canónico. Los binarios se almacenan en el bucket privado `quarantine`; PostgreSQL conserva metadatos y SHA-256. ClamAV produce estados `clean`, `rejected` o `quarantine`. Sin escáner disponible no se permite descargar. Un archivo limpio recibe URL firmada por 60 segundos.

Consultar [operación](../runbooks/equipment.md) y [resultados QA](../qa/phase-4/README.md). La integración con datos sintéticos no sustituye la validación de identidad, almacenamiento y antivirus del ambiente real.
