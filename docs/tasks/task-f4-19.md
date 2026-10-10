# TASK-F4-19 — Configuración de componentes por máquina

Estado: implementada el 10/10/2026 en la rama `feat/f4-19-machine-components`, creada desde `main` (`e09845a`, F4-18 integrada por #30). Complemento de la Fase 4 derivado de RA-01. Pendiente de revisión humana (autorización, aislamiento multiempresa, migración y SQL explícito). No se desplegó ni se aplicaron migraciones remotas.

## Alcance y trazabilidad

- TASKS F4-19; PRD RF-TPL-014 (el cliente decide qué componentes tiene cada máquina partiendo de los del modelo, puede agregar propios con su actividad); `Requerimientos_Adicionales_v1.1.md` RA-01-D2 ampliada por #29 (propietario en toda la cuenta; Operador `OP` solo en máquinas de sus sucursales) y RA-01-D3; F4-12 (historia técnica obligatoria al transferir); API.md §3, §6.1; PROJECT_RULES §4.2, §4.3, §9, §10.
- Dependencias en `main`: F4-10 (expediente) y F4-18 (#30, alcance del catálogo).
- Fuera de alcance: frecuencias y sobrescrituras (F4-20), recálculo de calendarios con componentes activos (F4-21), interfaz, BFF y backfill de máquinas existentes (F4-22).

## Requisitos de la solicitud

| #   | Requisito                                                         | Entrega                                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tabla `machine_component_configs` sin borrado y sin solapamientos | Migración `20261010000100_phase4_machine_components.sql`: origen, estado, vigencia, actor, motivo y `row_version`; `exclude using gist` por máquina y componente; trigger de validación (componente oficial o de la cuenta de la máquina, origen coherente) y de historia (sin `DELETE`, solo cerrar) |
| 2   | Precarga al activar, en la misma transacción                      | `preloadTemplateComponents` dentro de la aprobación (`requests.store.ts`): componentes de la versión de plantilla como `TEMPLATE_DEFAULT` activos + `MACHINE_COMPONENTS_PRELOADED`                                                                                                                    |
| 3   | Contratos y API con idempotencia, versión, auditoría y D2         | Contratos `addMachineComponentSchema`, `machineComponentTransitionSchema`, DTO `machineComponentConfigSchema`; `POST /v1/machines/{id}/components`, `…/{componentId}/activate` y `/deactivate`; permiso `equipment.machine-components-manage` (OW, OP) evaluado con `branchId`                        |
| 4   | Transferencia                                                     | La configuración viaja con la máquina; los propios de la cuenta origen se cierran y quedan en la historia sin detalle para la destino (ver [decisión](#decisión-componentes-propios-al-transferir))                                                                                                   |
| 5   | Sección de componentes en el expediente                           | `MachinesStore.detail(…, "components")` y `GET /v1/machines/{id}/components` (`current` + `history`); las demás secciones no cambian                                                                                                                                                                  |
| 6   | Pruebas                                                           | `tests/integration/machine-components.test.ts` (7) y `packages/contracts/src/machine-components.test.ts` (3); pgTAP nuevo                                                                                                                                                                             |
| 7   | Documentación                                                     | `docs/modules/equipment.md` y este reporte                                                                                                                                                                                                                                                            |

## Criterios de aceptación (TASKS F4-19)

| Criterio                                                                                    | Estado                                                                                              |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Relación máquina–componente con estado, origen y vigencia                                   | Cumplido                                                                                            |
| Al activar se precargan los componentes por defecto de la plantilla                         | Cumplido; probado que la precarga y el periodo de propiedad comparten el instante de la transacción |
| OW en cualquier máquina, OP solo en sus sucursales, propios y desactivación; resto consulta | Cumplido; OP de otra sucursal y AU reciben 403, otra cuenta 404, IA 403                             |
| Cambios versionados con historial (quién, cuándo, valor anterior) y transferibles           | Cumplido: versión por fila, auditoría con antes/después y transferencia con la máquina              |
| Concurrencia optimista con `row_version`                                                    | Cumplido: dos ediciones simultáneas con la misma versión → una gana, la otra 412                    |
| Trazabilidad y contradicciones registradas                                                  | Cumplido: ver [Decisiones y observaciones](#decisiones-y-observaciones)                             |

## Diseño

- **Versionado.** Cada fila es una versión. Un cambio cierra la abierta (`valid_to = T`) e inserta la siguiente (`valid_from = T`, `row_version + 1`) con el mismo origen. `If-Match` lleva la versión de la fila abierta. La respuesta es el DTO de la versión nueva.
- **Serialización.** `EquipmentDatabase.run` bloquea la máquina (`for update`) antes de autorizar y de reproducir respuestas idempotentes; la segunda edición concurrente espera, relee la versión abierta y recibe 412.
- **Autorización.** Las escrituras `machine-components:*` exigen `equipment.machine-components-manage` en la cuenta y luego `authorize(…, branchId: machine.branch_id)`: con alcance de cuenta pasa; con alcance `BRANCH` solo si la sucursal de la máquina está en el ámbito. No hay lógica de roles paralela. Una máquina de otra cuenta responde 404 (no revela existencia); otra sucursal de la misma cuenta, 403.
- **Auditoría.** Los eventos se registran sobre la máquina en `equipment.events` (con `before`/`after` completos) y se proyectan a `audit.events` con `machine_id` por el productor de Fase 5.
- **Errores.** `MachineComponentsErrorFilter` (base común con F4-18, ahora `equipment-error.filter.ts`) responde `ApiError`.

## Decisión: componentes propios al transferir

Propuesta implementada (requiere confirmación de dirección en la revisión):

1. La configuración pertenece a la máquina y viaja con ella; los componentes oficiales siguen activos con su historia.
2. Las versiones abiertas que usan componentes propios de la cuenta origen se cierran en el instante de ejecución de la transferencia. Sus filas siguen referenciando el componente en la historia técnica. El cierre se audita (`MACHINE_COMPONENTS_TRANSFER_CLOSED`) en la cuenta origen.
3. La cuenta destino ve esas versiones con origen `ACCOUNT_CUSTOM`, estado y fechas, pero `component: null`: el catálogo propio es privado de su cuenta (RF-TPL-013, F4-18). Tampoco ve actor ni motivo de versiones registradas antes de ser propietaria, en línea con `ownership-history`, que oculta referencias de la cuenta anterior.
4. La destino no puede usar el componente de la origen. Si lo necesita, lo registra en su propio catálogo y lo agrega.

Motivo: preservar la historia técnica (F4-12) sin filtrar datos privados entre cuentas. Alternativa descartada: copiar el componente propio al catálogo de la destino, porque crea datos en otra cuenta sin su decisión.

## Archivos

- Base de datos: `supabase/migrations/20261010000100_phase4_machine_components.sql`; pgTAP `supabase/tests/database/phase4_machine_components_test.sql` (nuevo) y `phase4_equipment_test.sql` (permisos de `equipment`: 4 → 5).
- Contratos: `packages/contracts/src/equipment.ts`; `packages/contracts/src/machine-components.test.ts`.
- API: `machine-components.store.ts` y `machine-components.controller.ts` (nuevos); `equipment-error.filter.ts` (antes `account-catalog-error.filter.ts`, ahora base común); `equipment.database.ts` (permiso y alcance de sucursal); `requests.store.ts` (precarga); `transfers.store.ts` (cierre al transferir); `machines.store.ts` y `equipment.controller.ts` (sección del expediente); `equipment.module.ts`; `account-catalog.controller.ts` (importación del filtro).
- Pruebas de integración: `tests/integration/machine-components.test.ts` (nuevo); `tests/integration/equipment.test.ts` (aplica la migración nueva).
- Documentación: `docs/modules/equipment.md`, `docs/tasks/README.md` y este reporte.

## Migración, compatibilidad y reversión

- Tabla nueva, vacía; índices y un permiso. Duración: segundos. Orden: migración y después API.
- Una API anterior ignora la tabla: aprobaría máquinas sin precarga (recuperable con el backfill de F4-22).
- Reversión: preferir corrección hacia adelante. Antes de activar máquinas con F4-19, el encabezado de la migración documenta cómo retirarla. Con filas existentes, la tabla es historia técnica y se conserva.

## Pruebas y validación

Comandos ejecutados el 10/10/2026 en Windows 11 con Node 24 y Docker Desktop 29.7.2:

- `pnpm check` (Prettier, ESLint sin advertencias, typecheck, fronteras, infraestructura, identidad, Vitest con 418 pruebas en 70 archivos): en verde.
- `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329 pnpm build`: 14 tareas en verde.
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: en verde, 122 pruebas en 16 archivos (incluidas las de navegador y las 7 nuevas). Las capturas de F5-15 que reescribe la ejecución se restauraron.
- `supabase db reset --local --no-seed`, `db lint --local --level error` (solo hallazgos de PostGIS en `extensions`) y `supabase test db`: PASS, 336 pruebas en 17 archivos, incluido `phase4_machine_components_test.sql` (7).

Casos de `tests/integration/machine-components.test.ts`:

1. La aprobación precarga los dos componentes de la plantilla como `TEMPLATE_DEFAULT` activos, con el mismo instante que el periodo de propiedad (misma transacción) y evento central con `machine_id`; las demás secciones del expediente siguen respondiendo.
2. AU y el OP de la sucursal consultan; OP de otra sucursal y otra cuenta no ven el expediente (404); no se puede agregar el componente propio de otra cuenta (API y trigger) ni un sistema.
3. D2: el OP de la sucursal agrega un oficial (`TEMPLATE_OPTIONAL`), el propietario un propio (`ACCOUNT_CUSTOM`); duplicado → 409; OP de otra sucursal, AU e IA → 403; HTTP 403 `FORBIDDEN`.
4. Dos desactivaciones simultáneas con la misma versión: una gana y la otra recibe conflicto de versión; HTTP 412 `PRECONDITION_FAILED`.
5. Historia v1 → v2 → v3 contigua, repetición idempotente, transición repetida → 409, auditoría con estado anterior y nuevo y proyección central.
6. `DELETE`, reescritura de estado, reapertura y versiones solapadas rechazados por la base.
7. Transferencia: la destino ve los oficiales activos y el propio de la origen cerrado y sin detalle, sin actor ni motivo previos; la origen pierde acceso; el cierre se audita en la origen; la destino edita y agrega su propio componente, pero no el de la origen.

## Decisiones y observaciones

- **`TEMPLATE_OPTIONAL`.** `template_versions.definition.components` no distingue obligatorios de opcionales (el `is_required` de `model_components` en `Database.md` no se implementó en F4-04/F4-05). Se define `TEMPLATE_OPTIONAL` como componente oficial agregado por el cliente que no está en la plantilla. Si dirección quiere componentes opcionales sugeridos por la plantilla, requiere ampliar la definición de plantilla (fuera de alcance).
- **Cambio de plantilla.** Asignar otra versión de plantilla a una máquina no agrega ni retira componentes; esa conciliación corresponde a F4-21 (recálculo) y debe definirse allí.
- **Línea de tiempo.** La sección `timeline` existente muestra `event_type` y `reason` de todos los eventos `MACHINE_%` de la máquina, incluidos los de un propietario anterior (comportamiento previo de F4-10/F4-12). Los nuevos eventos de componentes heredan ese comportamiento; se registra como riesgo.
- **Versión vieja.** Las rutas nuevas responden 412 como API.md y F4-18; el resto del módulo conserva 409.

## Riesgos y deuda

- La decisión de transferencia es una propuesta que requiere confirmación de dirección.
- Máquinas activadas antes de F4-19 no tienen configuración hasta el backfill de F4-22.
- Motivos de propietarios anteriores visibles en `timeline` (comportamiento previo).
- BFF y UI pendientes (F4-22); `Database.md` sin la tabla nueva ni la de F4-18.

## Validación manual pendiente

1. Revisión humana de migración, autorización por sucursal y aislamiento.
2. Confirmar con dirección la decisión de transferencia.
3. En un ambiente con identidad real: aprobar una máquina y comprobar la precarga; un OP de la sucursal desactiva un componente; un OP de otra sucursal recibe 403; la auditoría muestra antes y después.
