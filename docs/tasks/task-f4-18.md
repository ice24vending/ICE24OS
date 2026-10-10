# TASK-F4-18 — Catálogo de componentes y características con alcance oficial y por cuenta

Estado: implementada el 09/10/2026 en la rama `feat/f4-18-account-catalog`, creada desde `main` (`6595122`, decisiones RA-01 D1–D4 por #28). Complemento de la Fase 4 derivado de RA-01. Pendiente de revisión humana (autorización, aislamiento multiempresa, migración y SQL explícito). No se desplegó ni se aplicaron migraciones remotas.

## Alcance y trazabilidad

- TASKS F4-18; `Requerimientos_Adicionales_v1.1.md` RA-01 y decisiones RA-01-D2 (solo propietario/administrador escribe) y RA-01-D3 (componente propio con su actividad); PRD RF-TPL-013 (componentes y características propios, visibles solo para la cuenta), RF-TPL-005 (solo ICE24 modifica lo oficial) y RF-TPL-003/004 (forma de componentes y actividades); API.md §3, §4.4, §6.1 (idempotencia, concurrencia, cursor, errores); PROJECT_RULES §4.2, §4.3, §9, §10.
- Aplica por igual a máquinas de hielo, de agua, ICE24, con marca del cliente y externas validadas: la entrada pertenece a la cuenta, no a un tipo de equipo.
- Fuera de alcance (tareas siguientes de RA-01): relación máquina–componente (F4-19), frecuencias efectivas y sobrescrituras (F4-20), recálculo de calendarios (F4-21) e interfaz y backfill (F4-22). El BFF del navegador no expone aún `/account-catalog-entries`.

## Requisitos de la solicitud

| #   | Requisito                                                                  | Entrega                                                                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Alcance `OFFICIAL`/`ACCOUNT`, `account_id` coherente, unicidad por alcance | Migración nueva `20261009000100_phase4_account_catalog.sql`: columnas `scope`, `account_id`, `created_at`, `updated_at`; CHECK de coherencia y de tipos de cuenta; índices únicos parciales (oficial global, cuenta por `account_id`) e índice de listado; trigger sin borrado e identidad inmutable; RLS        |
| 2   | Actividad de mantenimiento opcional en `data` validada por contrato        | `maintenanceActivity` (código, nombre, categoría, frecuencia `value`+`unit`, checklist, evidencia), misma forma de checklist y evidencia que las plantillas; `schemaVersion: 1`                                                                                                                                  |
| 3   | Contratos Zod de crear, editar, listar y retirar; sin filas como contrato  | `createAccountCatalogEntrySchema`, `updateAccountCatalogEntrySchema`, `accountCatalogQuerySchema`, `retireAccountCatalogEntrySchema`, DTO `accountCatalogEntrySchema`, página por cursor y `accountCatalogOpenApi`. Cambio aditivo bajo `/v1` (docs/contracts/versioning.md)                                     |
| 4   | CRUD de cuenta sin borrado, idempotencia, `row_version`, auditoría, D2     | `AccountCatalogController` + `AccountCatalogStore` sobre `EquipmentDatabase.run` (transacción, `Idempotency-Key`, `@ice24/authorization`); `If-Match` → 412; `audit()` → `equipment.events` → `audit.events` (productor F5-04). `/v1/admin/catalogs` sin cambios                                                 |
| 5   | Catálogo de una cuenta = oficiales activos + propios                       | `GET /v1/catalogs` filtra por la cuenta activa (columnas explícitas, sin `account_id`); plantillas oficiales rechazan entradas `ACCOUNT`                                                                                                                                                                         |
| 6   | Pruebas                                                                    | Contratos: `packages/contracts/src/account-catalog.test.ts` (7). Integración: `tests/integration/account-catalog.test.ts` (9): A no ve/usa/edita/retira lo de B, 403 estándar por rol, cliente no edita lo oficial, concurrencia, idempotencia, auditoría, retiro sin borrado, cursor, modo lectura. pgTAP nuevo |
| 7   | Documentación                                                              | `docs/modules/equipment.md` y este reporte                                                                                                                                                                                                                                                                       |

## Criterios de aceptación (TASKS F4-18)

| Criterio                                                               | Estado                                                                                                                                    |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog_entries` distingue `OFFICIAL` (`account_id` nulo) y `ACCOUNT` | Cumplido: CHECK `catalog_entries_scope_account`; probado en integración y pgTAP                                                           |
| Propio solo visible y utilizable en su cuenta; prueba de aislamiento   | Cumplido: listado, detalle, edición, retiro y catálogo utilizable filtrados por la cuenta del contexto; plantillas solo aceptan oficiales |
| Oficiales editables únicamente por ICE24                               | Cumplido: 403 en rutas de cuenta; `/admin/catalogs` sigue exigiendo `equipment.admin` con MFA                                             |
| Hielo, agua, ICE24, marca del cliente y externas                       | Cumplido por diseño: la entrada no depende del tipo de equipo; su uso por máquina llega en F4-19                                          |
| Alta, edición y retiro (sin borrado) auditados                         | Cumplido: tres eventos en `equipment.events` y `audit.events`; trigger impide `DELETE`                                                    |
| Solo propietario/administrador escribe (D2)                            | Cumplido: `equipment.catalog-manage` solo para `OW` y ámbito de cuenta completa; AU, SA, OW con ámbito parcial e IA reciben 403           |
| Componente propio con frecuencia, checklist y evidencia (D3)           | Cumplido en la definición; la generación de actividades a partir de ella corresponde a F4-19/F4-21                                        |
| Trazabilidad y contradicciones registradas                             | Cumplido: véase [Decisiones y observaciones](#decisiones-y-observaciones)                                                                 |

## Diseño

- **Autorización.** `EquipmentDatabase.run` ya exige `equipment.manage` para escribir; para operaciones `account-catalog:*` añade `equipment.catalog-manage` y `accountWide`, evaluados con `authorize()` de `@ice24/authorization` antes de la reproducción idempotente (un permiso revocado no puede reproducir una respuesta guardada). No hay lógica paralela de roles: el rol `OW` recibe el permiso en la migración.
- **Objeto.** La fila se bloquea con `where id=$1 and (scope='OFFICIAL' or account_id=<cuenta del contexto>) for update`: lo oficial responde 403 (es visible para todos, no revela nada) y lo de otra cuenta 404 (no revela existencia). La cuenta nunca proviene del cliente.
- **Concurrencia e idempotencia.** `If-Match` obligatorio en edición y retiro; versión distinta → 412 `PRECONDITION_FAILED` (API.md). La clave idempotente se registra por actor, cuenta y operación; misma clave con otro cuerpo → 409.
- **Errores.** `AccountCatalogErrorFilter` produce el formato `ApiError` (`code`, `message`, `correlationId`, `timestamp`) y conserva los errores ya normalizados, como `ACCOUNT_READ_ONLY`.
- **Estados.** `active` → `retired` mediante comando explícito con motivo; un retirado no se edita ni se retira de nuevo (409). No se ofrece reactivación porque no fue solicitada.

## Archivos

- Base de datos: `supabase/migrations/20261009000100_phase4_account_catalog.sql` (nuevo); pgTAP `supabase/tests/database/phase4_account_catalog_test.sql` (nuevo) y `phase4_equipment_test.sql` (el conteo de permisos de `equipment` pasa de 3 a 4 por el permiso nuevo).
- Contratos: `packages/contracts/src/equipment.ts` (esquemas de cuenta; `checklistSchema` y `evidenceRulesSchema` extraídos sin cambiar el comportamiento de `activityInputSchema`); `packages/contracts/src/account-catalog.test.ts` (nuevo).
- API: `apps/api/src/modules/equipment/account-catalog.store.ts`, `account-catalog.controller.ts`, `account-catalog-error.filter.ts` (nuevos); `equipment.module.ts` (registro); `equipment.database.ts` (permiso de escritura de catálogo de cuenta); `templates.store.ts` (catálogo utilizable y plantillas solo oficiales).
- Pruebas de integración: `tests/integration/account-catalog.test.ts` (nuevo); `tests/integration/equipment.test.ts` (aplica la migración nueva).
- Documentación: `docs/modules/equipment.md`, `docs/tasks/README.md` y este reporte.

## Migración, compatibilidad y reversión

- **Expansión.** Columnas con valores por defecto no volátiles (sin reescritura), tres índices sobre una tabla pequeña administrada por ICE24 y un permiso. Duración esperada: segundos. La validación final aborta si algún registro previo no quedó `OFFICIAL`.
- **Compatibilidad.** La API anterior sigue insertando oficiales (valor por defecto `OFFICIAL`) y recibe el mismo error 23505 por código duplicado. Orden de despliegue: migración y después API.
- **Reversión.** Preferir corrección hacia adelante. **No** volver la API a una versión anterior a F4-18 cuando ya existan entradas `ACCOUNT`: su `GET /v1/catalogs` selecciona todas las filas y las expondría entre cuentas. Si no existen (`select count(*) from equipment.catalog_entries where scope='ACCOUNT'` = 0), el encabezado de la migración documenta los comandos para retirar trigger, índices, restricciones, columnas y permiso y restaurar `catalog_entries_code_key`.

## Pruebas y validación

Comandos ejecutados el 09/10/2026 en Windows 11 con Node 24 y Docker Desktop 29.7.2:

- `pnpm check`: Prettier, ESLint (0 advertencias), typecheck (21 tareas), fronteras (`pnpm check:boundaries`: 14 espacios de trabajo sin ciclos), infraestructura, identidad y Vitest (415 pruebas en 69 archivos) en verde. Prettier se ejecutó excluyendo `docs/backlog/phase-4-ra01-prompts.md`, un archivo local ajeno a esta rama y sin commit que no cumple el formato; no se modificó.
- `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329 pnpm build`: 14 tareas en verde.
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: en verde, 115 pruebas en 15 archivos (incluidas las de navegador y las 9 nuevas). La ejecución reescribe las capturas de evidencia de F5-15; se restauraron y no forman parte de esta entrega.
- `supabase start`, `db reset --local --no-seed`, `db lint --local --level error` (solo hallazgos de funciones de PostGIS en `extensions`, ajenas al proyecto, igual que en F5-15) y `supabase test db`: PASS, 329 pruebas en 16 archivos, incluido `phase4_account_catalog_test.sql` (9 aserciones).

Casos de `tests/integration/account-catalog.test.ts` (PostgreSQL 17 con Testcontainers, API Nest real para HTTP):

1. Registros previos quedan `OFFICIAL`; CHECK de coherencia, de tipos de cuenta y unicidad oficial.
2. El propietario crea un componente con actividad; DTO sin columnas internas; `schemaVersion`; auditoría central con actor y cuenta; mismo código en otra cuenta y sobre un código oficial permitido; duplicado en la misma cuenta → conflicto.
3. Aislamiento: B no lista, consulta, edita ni retira lo de A (404); el catálogo utilizable de B no incluye lo de A ni expone `account_id`; una plantilla oficial no puede usar una entrada de cuenta.
4. AU, SA, OW con ámbito parcial e IA no escriben; HTTP 403 con `code: FORBIDDEN`, `correlationId`, `timestamp` y `no-store`; la lectura de AU sí funciona; sin token 401.
5. El cliente no edita ni retira una entrada oficial (403) ni crea oficiales; la fila oficial no cambia.
6. Edición con versión, repetición idempotente, clave reutilizada con otro cuerpo (409), versión vieja (412) y característica sin actividad.
7. Retiro con motivo auditado; doble retiro y edición de retirado → 409; sale del catálogo utilizable; `DELETE` y cambios de identidad bloqueados por trigger.
8. Paginación por cursor y cursor inválido.
9. Cuenta en solo lectura → 403 `ACCOUNT_READ_ONLY`.

## Decisiones y observaciones

- **«Propietario/administrador» (D2).** El catálogo de roles de cuenta solo tiene `OW` (propietario); no existe un rol de administrador de cuenta distinto. Se otorgó el permiso a `OW` con ámbito de cuenta completa. Los roles ICE24 (`IA`, `IO`) no escriben catálogos de cuenta; administran el oficial. Si dirección define un rol administrador de cuenta, basta con asignarle `equipment.catalog-manage`.
- **Unidades de frecuencia.** `days`, `weeks` y `months`, con tope de diez años como el límite de 3650 días de las plantillas. La conversión a días y la frecuencia efectiva quedan para F4-20 (RA-01-D1: sin frecuencia mínima obligatoria).
- **Divergencias previas, no bloqueantes.** `Database.md` describe `component_catalog`/`model_components`, mientras la Fase 4 implementó `catalog_entries` con `kind`; API.md propone `/catalogs/components` (TPL-015/016) y el módulo usa `/catalogs`. TASKS menciona `packages/contracts/src/private` y `packages/database`, que no existen en el repositorio; los contratos viven en `packages/contracts/src/equipment.ts` y el módulo usa SQL explícito con `pg`. No se cambiaron documentos de autoridad; conviene alinear `Database.md` cuando se aborde F4-19.
- **Concurrencia.** El resto del módulo responde 409 ante versión vieja; las rutas nuevas siguen API.md (412).

## Riesgos y deuda

- Reversión de la API por debajo de F4-18 con entradas `ACCOUNT` existentes expondría datos entre cuentas (ver reversión).
- `GET /v1/catalogs` conserva el límite previo de 500 filas y devuelve filas parciales sin DTO (deuda heredada de F4-04); con muchos propios podría desplazar oficiales.
- La auditoría central resume `before/after` con la lista permitida de F5-04 (`status`, `row_version`); el detalle completo permanece en `equipment.events`.
- El BFF y la UI no exponen aún las rutas nuevas (F4-22).
- `Database.md` sin actualizar (ver observaciones).

## Validación manual pendiente

1. Revisión humana de la migración, la autorización y el aislamiento.
2. En un ambiente con identidad real: propietario crea, edita y retira un componente con actividad; un técnico o auditor recibe 403; otra cuenta no lo ve en `GET /v1/catalogs` ni en `/v1/account-catalog-entries`.
3. Confirmar en `/audit` los eventos `ACCOUNT_CATALOG_*` con actor y correlación.
4. Verificar en Swagger (`/v1/docs`) la etiqueta `account-catalog` y sus esquemas.
