# TASK-F4-20 — Frecuencias de fábrica y frecuencias del cliente

Estado: implementada el 09/10/2026 en la rama `feat/f4-20-frequency-overrides`, creada desde `main` (`821e675`, F4-19 integrada por #31). Complemento de la Fase 4 derivado de RA-01. Pendiente de revisión humana (autorización, aislamiento multiempresa, migración y SQL explícito). No se desplegó ni se aplicaron migraciones remotas.

## Alcance y trazabilidad

- TASKS F4-20; PRD RF-TPL-015 (frecuencias y ventanas de alerta de la plantilla como valor por defecto; frecuencias del propietario por cuenta o máquina y del Operador por máquina de sus sucursales; advertencia de garantía y restablecer valores de fábrica; sin efecto en el indicador sanitario ni en el portal público).
- Decisiones de dirección: RA-01-D1 (solo advertencia), RA-01-D2 ampliada por #29 (OW en la cuenta; `OP` solo en máquinas de sus sucursales), RA-01-D3 (actividad del componente propio) y RA-01-D4 (sin efecto sanitario ni público).
- Contexto: F4-06 (definición de actividades en plantilla), F4-13 (calendarios), F4-19 (componentes activos por máquina), F5-05 (outbox), API.md §6.1 y §34, PROJECT_RULES §4.2, §4.3, §9, §10.
- Fuera de alcance: recálculo de calendarios y consumo del evento (F4-21); interfaz, BFF y migración de máquinas existentes (F4-22); uso de la anticipación en alertas sanitarias (F7/F8).

## Requisitos de la solicitud

| #   | Requisito                                                   | Entrega                                                                                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tabla `maintenance_frequency_overrides` sin borrado físico  | Migración `20261011000100_phase4_frequency_overrides.sql`: cuenta, alcance, máquina, componente y/o actividad, tipo, frecuencia y anticipación con unidad, valores de fábrica, `warranty_warning_acknowledged_at`, actor, vigencia y `row_version`; restablecer = cerrar la vigencia          |
| 2   | `resolveEffectiveFrequency` pura en `packages/domain`       | `packages/domain/src/maintenance-frequency.ts`: máquina → cuenta → plantilla, con `source` y `factoryValue`; 9 pruebas unitarias (sin sobrescrituras, solo cuenta, solo máquina, ambas, cerradas y futuras, unidades, herencia de alerta, valores inválidos, equivalencias)                   |
| 3   | D1: sin mínimo; advertencia con código propio               | Validación: entero positivo con unidad válida. Si difiere del valor de fábrica ICE24 sin `warrantyWarningAcknowledged: true` → 422 `WARRANTY_WARNING_CONFIRMATION_REQUIRED` (documentado en `context/API.md` §34 y en `errorCodeSchema`). La confirmación se guarda en la fila y la auditoría |
| 4   | Endpoints con D2, idempotencia, versión y auditoría         | `GET /v1/machines/{id}/frequencies`; `POST`/`PUT /v1/machines/{id}/frequency-overrides` y `…/reset`; `GET`/`POST`/`PUT /v1/account-frequency-overrides` y `…/reset`. Permisos nuevos `equipment.account-frequencies-manage` (OW) y `equipment.machine-frequencies-manage` (OW, OP)            |
| 5   | D4: prueba explícita                                        | Prueba de integración que compara `sanitary_status`, `publication_status`, `technical_status`, `operational_status` y `row_version` de la máquina antes y después de crear, editar y restablecer                                                                                              |
| 6   | Evento "frecuencias cambiadas" por el outbox, sin recálculo | `MACHINE_FREQUENCIES_CHANGED` / `ACCOUNT_FREQUENCIES_CHANGED` en `equipment.events` → outbox `MachineFrequenciesChanged` / `AccountFrequenciesChanged` con `operation` y `machineIds`; prueba de que `schedule_jobs` y `scheduled_activities` no cambian                                      |
| 7   | Pruebas de integración                                      | `tests/integration/frequency-overrides.test.ts` (10): aislamiento, permisos, advertencia obligatoria, restablecer, conservación del valor de fábrica, concurrencia, outbox, D4 y transferencia                                                                                                |
| 8   | Documentación                                               | `docs/modules/equipment.md`, `context/API.md` (código de error), `docs/tasks/README.md` y este reporte                                                                                                                                                                                        |

## Criterios de aceptación (TASKS F4-20)

| Criterio                                                                                  | Estado                                                                                              |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Tabla por cuenta y por máquina/componente/actividad con frecuencia, unidad y anticipación | Cumplido                                                                                            |
| Resolución máquina/componente → cuenta → plantilla en función de dominio probada          | Cumplido                                                                                            |
| Sin definición del cliente se usan exactamente los valores de la plantilla                | Cumplido; probado por actividad, incluida la de un componente propio                                |
| Sin límite que bloquee; advertencia de garantía con confirmación explícita auditada (D1)  | Cumplido: un día es válido con confirmación; sin ella, 422 con código propio                        |
| Restablecer valores de fábrica por componente, por máquina y por cuenta (D1)              | Cumplido; también por actividad                                                                     |
| Cuenta: solo propietario. Máquina: propietario u Operador de su sucursal (D2)             | Cumplido: OP de otra sucursal, AU e IA → 403; OP en frecuencias de cuenta → 403; otra cuenta → 404  |
| Se conservan el valor de fábrica y el del cliente                                         | Cumplido: la plantilla no cambia; cada fila guarda los valores de fábrica vigentes y nunca se borra |
| La frecuencia del cliente no altera el indicador sanitario ni el portal (D4)              | Cumplido y probado                                                                                  |
| Cada cambio genera auditoría y no modifica la plantilla oficial ni actividades históricas | Cumplido: evento con antes/después; prueba de plantilla y calendarios intactos                      |

## Diseño

- **Objetivo de una sobrescritura.** Una actividad de plantilla se identifica por `activity_code` (con `component_catalog_id` nulo). La actividad de un componente propio (RA-01-D3) se identifica por `component_catalog_id` + `activity_code`, porque su código puede coincidir con el de la plantilla o con el de otro componente. Solo las actividades por tiempo tienen frecuencia; las de uso, condición o evento responden 404.
- **Objetivos válidos.** En una máquina: las actividades por tiempo de su plantilla y las de los componentes propios activos en ella (F4-19). En la cuenta: una actividad de las plantillas de sus máquinas no retiradas, o la de un componente propio activo de su catálogo.
- **Valores de fábrica.** Plantilla: `frequencyDays` en días. Componente propio: su `defaultFrequency`. A nivel de cuenta, una misma actividad puede tener distinto valor en distintas plantillas; se guardan todos y la advertencia se exige si el valor difiere de cualquiera.
- **Equivalencias.** 1 semana = 7 días; los meses solo se comparan con meses (1 mes ≠ 30 días). Guardar 1 semana cuando la fábrica es 7 días no pide advertencia.
- **Versionado y concurrencia.** Igual que F4-19: editar cierra la versión abierta en `T` e inserta la siguiente desde `T` con `row_version + 1`. Las escrituras de máquina se serializan con el bloqueo de la máquina en `EquipmentDatabase.run`; las de cuenta, con un bloqueo transaccional por cuenta. La segunda edición concurrente recibe 412.
- **Autorización.** `run()` generaliza el mecanismo de F4-19: las operaciones `machine-frequencies:<id>:*` exigen `equipment.machine-frequencies-manage` evaluado con `branchId` de la máquina; las `account-frequencies:*`, alcance de cuenta y `equipment.account-frequencies-manage`. Ambas comprobaciones ocurren antes de reproducir una respuesta idempotente.
- **Evento y auditoría.** Una sola fila en `equipment.events` por cambio sirve de auditoría (antes/después completos, motivo y confirmación de garantía) y de evento de dominio. Los productores de Fase 5 la proyectan a `audit.events` y a `infra.outbox_events` en la misma transacción. Del payload, la lista permitida del outbox conserva `operation` y `machineIds`; para la cuenta, `machineIds` son sus máquinas no retiradas. No hizo falta cambiar la lista permitida.
- **Errores.** `FrequencyOverridesErrorFilter` (base común `equipment-error.filter.ts`). El error de garantía ya viene normalizado como `ApiError` y conserva su código y `details`.

## Decisiones y observaciones

- **Ventanas de alerta de fábrica.** TASKS y RF-TPL-015 dicen que la plantilla define ventanas de alerta por defecto, pero `activityInputSchema` (F4-06) no tiene ese campo. No se amplió la plantilla oficial: el valor de fábrica de la anticipación es nulo y el cliente puede definir la suya. Agregar la anticipación a la plantilla es un cambio de F4-06 que debe decidir ICE24; `resolveEffectiveFrequency` ya la admite.
- **Advertencia de garantía en componentes propios.** D1 se refiere al valor de fábrica que define ICE24. El valor por defecto de un componente propio lo eligió el cliente, así que cambiarlo no pide advertencia (`warrantyApplies: false`). Requiere confirmación de dirección.
- **Tipo de actividad.** La categoría `sanitation` corresponde a `SANITATION`; `maintenance` e `inspection` a `MAINTENANCE`.
- **Restablecer sin versión esperada.** El restablecimiento es convergente (el resultado siempre es el valor de fábrica) y puede afectar varias filas, así que usa `Idempotency-Key` sin `If-Match`. Si no hay nada que restablecer, responde `closed: []` sin evento.
- **Transferencia.** Las frecuencias de máquina pertenecen a la cuenta que las definió: se cierran al ejecutar la transferencia (`TRANSFER_CLOSED`, auditado en la cuenta origen) y la cuenta destino parte de los valores de fábrica. Las de cuenta no viajan. Es coherente con la decisión de F4-19 y requiere la misma confirmación.
- **Línea de tiempo.** `MACHINE_FREQUENCIES_CHANGED` aparece en la sección `timeline` (filtro `MACHINE_%`) y hereda el riesgo ya registrado en F4-19 sobre motivos de propietarios anteriores.

## Archivos

- Base de datos: `supabase/migrations/20261011000100_phase4_frequency_overrides.sql`; pgTAP `supabase/tests/database/phase4_frequency_overrides_test.sql` (nuevo, 9) y `phase4_equipment_test.sql` (permisos de `equipment`: 5 → 7).
- Dominio: `packages/domain/src/maintenance-frequency.ts` y su prueba; exportación en `index.ts`.
- Contratos: `packages/contracts/src/equipment.ts`, `errors.ts` (`WARRANTY_WARNING_CONFIRMATION_REQUIRED`) y `frequency-overrides.test.ts` (4).
- API: `frequency-overrides.store.ts` y `frequency-overrides.controller.ts` (nuevos); `equipment.database.ts` (permisos por máquina y de cuenta generalizados); `equipment-error.filter.ts`; `machines.store.ts` y `equipment.controller.ts` (sección `frequencies`); `transfers.store.ts` (cierre al transferir); `equipment.module.ts`.
- Pruebas de integración: `tests/integration/frequency-overrides.test.ts` (nuevo); `equipment.test.ts` y `machine-components.test.ts` aplican la migración nueva.
- Documentación: `docs/modules/equipment.md`, `context/API.md`, `docs/tasks/README.md` y este reporte.

## Migración, compatibilidad y reversión

- Tabla nueva, vacía; índices y dos permisos. Duración: segundos. Orden: migración y después API.
- Aditiva para `/v1`: rutas nuevas, sección nueva del expediente y un código de error nuevo. Las respuestas existentes no cambian.
- Una API anterior ignora la tabla. Una transferencia ejecutada con una API anterior no cerraría las frecuencias de máquina de la cuenta origen; la resolución filtra por la cuenta propietaria, así que no se aplicarían a la destino, pero quedarían abiertas.
- Reversión: preferir corrección hacia adelante. Antes de que existan filas, el encabezado de la migración documenta cómo retirarla. Con filas, la tabla es evidencia de garantía y se conserva.

## Pruebas y validación

Comandos ejecutados el 09/10/2026 en Windows 11 con Node 24 y Docker Desktop 29.7.2:

- `pnpm check` (Prettier, ESLint sin advertencias, typecheck, fronteras, infraestructura, identidad, Vitest con 431 pruebas en 72 archivos): en verde.
- `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329 pnpm build`: 14 tareas en verde.
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: en verde, 132 pruebas en 17 archivos (incluidas las de navegador y las 10 nuevas). Las capturas de F5-15 que reescribe la ejecución se restauraron.
- `supabase db reset --local --no-seed`, `db lint --local --level error` (solo hallazgos de PostGIS en `extensions`) y `supabase test db`: PASS, 345 pruebas en 18 archivos, incluido `phase4_frequency_overrides_test.sql` (9).

Casos de `tests/integration/frequency-overrides.test.ts`:

1. Sin definición del cliente, el expediente muestra exactamente la plantilla (CLEAN 7 días, FILTER 30 días) y el valor por defecto del componente propio (6 meses); la actividad por uso no aparece.
2. D1: 1 semana = fábrica, sin advertencia; 10 días sin confirmación → `WarrantyWarningRequiredException` y HTTP 422 `WARRANTY_WARNING_CONFIRMATION_REQUIRED` con los valores de fábrica; 1 día con confirmación → versión 2 con fecha de confirmación, auditada con valor anterior y motivo; componente propio sin advertencia; actividad por uso → 404.
3. Prioridad: cuenta (2 semanas, fuente `ACCOUNT`) y luego máquina (30 días con alerta de 3 días, fuente `MACHINE`); el valor de fábrica se conserva y la plantilla oficial no cambia.
4. D2: el OP de la sucursal edita la máquina; OP de otra sucursal, AU e IA → 403; OP, AU e IA en frecuencias de cuenta → 403; OP en restablecer cuenta → 403; HTTP 403 `FORBIDDEN`.
5. Aislamiento: otra cuenta no ve el expediente, no escribe en la máquina, no usa la actividad ni el componente propio de A, y su lista de cuenta está vacía.
6. Concurrencia en máquina y en cuenta (una gana, otra 412; HTTP 412), repetición idempotente, crear duplicado → 409, historia v1→v4 contigua, `DELETE` y reescritura rechazados por la base.
7. Restablecer por componente, por actividad, por máquina (vuelve a regir la cuenta) y por cuenta (todo vuelve a fábrica); restablecer sin nada que cerrar → `closed: []`; las filas se conservan cerradas con su valor de fábrica.
8. Outbox: `MachineFrequenciesChanged` y `AccountFrequenciesChanged` con `operation` y `machineIds`; calendarios sin cambios.
9. D4: estados sanitario, de publicación, técnico y operativo y `row_version` de la máquina iguales antes y después.
10. Transferencia: las frecuencias de máquina de la origen se cierran (`TRANSFER_CLOSED` en la origen) y la destino ve solo valores de fábrica.

## Riesgos y deuda

- Las decisiones sobre la alerta de fábrica, la advertencia en componentes propios y la transferencia requieren confirmación de dirección.
- F4-21 debe consumir `MachineFrequenciesChanged`/`AccountFrequenciesChanged` y usar `resolveEffectiveFrequency`; hasta entonces los calendarios siguen usando la plantilla.
- BFF y UI pendientes (F4-22). `Database.md` y el catálogo de endpoints de `API.md` no incluyen las tablas ni las rutas de F4-18, F4-19 y F4-20.

## Validación manual pendiente

1. Revisión humana de la migración, la autorización por sucursal y de cuenta y el aislamiento.
2. Confirmar con dirección las decisiones anteriores.
3. En un ambiente con identidad real: el propietario define una frecuencia de cuenta distinta de fábrica y ve la advertencia; un OP de la sucursal cambia una frecuencia de máquina; un OP de otra sucursal recibe 403; "restablecer valores de fábrica" devuelve la fuente `TEMPLATE`; la auditoría muestra la confirmación.
