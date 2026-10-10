# Gate del complemento RA-01 de la Fase 4 (F4-18 a F4-22)

Estado: preparado el 10/10/2026 en la rama `docs/f4-ra01-gate`, creada desde `main` `494ba67` (F4-22 integrada por #34). Cambio solo documental y de evidencia. **No firma ni aprueba el complemento**: la aprobación queda en el espacio reservado de `docs/backlog/phase-4-status.md`. La aprobación original de la Fase 4 (23/09/2026) no se modificó.

## Alcance

- Fuentes leídas: `context/TASKS.md` (F4-18 a F4-22, F7-01, F8-01, F8-02, F8-14), `context/Requerimientos_Adicionales_v1.1.md`, `context/ICE24_OS_PRD_v1.0.md` (RF-TPL-013 a 016), `docs/tasks/task-f4-18.md` a `task-f4-22.md`, `docs/backlog/phase-4-status.md`, `docs/qa/phase-4/README.md` y el código en `main`.
- Sin cambios de código, migraciones ni contratos.

## 1. Validación y evidencia

Ejecutado localmente sobre `494ba67` (Windows 11 Pro, Node v24.19.0, pnpm 11.24.0, Docker 29.7.2). Registros completos en [`docs/qa/phase-4/ra-01/`](../qa/phase-4/ra-01/README.md):

| Comando                                                  | Resultado                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `pnpm check`                                             | Código 0; Vitest 463 pruebas en 75 archivos                                 |
| `pnpm build`                                             | Código 0; 14 de 14 tareas                                                   |
| `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329 pnpm build` | Código 0; 14 de 14 tareas (acierto de caché de turbo con la misma variable) |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration`            | Código 0; 145 pruebas en 19 archivos, con Chromium                          |

De CI del PR #34 (cabeza `6da5e0d`, mismo árbol que `494ba67`): todos los checks en `pass`; el job `supabase-migrations` aplicó todas las migraciones (incluido el backfill), `db lint --level error` y pgTAP con `Files=19, Tests=353, Result: PASS`. Se guardaron el JSON de checks y el log del job, con las claves locales por defecto de `supabase start` redactadas.

No se ejecutaron localmente las pruebas pgTAP; la suite de integración reescribe capturas de Fase 5, que se restauraron.

## 2. Trazabilidad

La [matriz](../qa/phase-4/ra-01/traceability.md) cruza cada punto y regla de RA-01 con RF-TPL-013..016, D1..D4, tareas y pruebas. Resumen:

- **Cubierto:** catálogo propio aislado, aplicación a cualquier tipo de máquina, frecuencias de fábrica y del cliente, prioridad máquina → cuenta → plantilla, recálculo solo de futuras, auditoría, conservación de ambos valores, advertencia y restablecer (D1), roles (D2), componente propio con actividad (D3).
- **Parcial:** componentes por máquina (las actividades de plantilla no están ligadas a componentes oficiales), componentes sugeridos opcionales de la plantilla, D4 (probado solo en F4-20).
- **Hueco:** ventanas de alerta de fábrica en la plantilla (RF-TPL-015), más los pendientes H4–H9 de la matriz (pruebas menores, decisiones, validación manual y documentación).

## 3. Estado de fase

Se agregó la sección «Complemento RA-01» a `docs/backlog/phase-4-status.md`: estado por tarea con su PR, evidencia, pendientes y una tabla de aprobación vacía para el responsable.

## 4. Lo que F7-01, F8-01, F8-02 y F8-14 reciben de RA-01

Disponible hoy en `main`:

- **Dominio** (`@ice24/domain`): `resolveEffectiveFrequency` (frecuencia y anticipación efectivas con su fuente y el valor de fábrica), `sameFrequency`, `assertFrequency`, `addFrequency`, `subtractFrequency`.
- **Datos:** `equipment.machine_component_configs` (componentes vigentes e historia), `equipment.maintenance_frequency_overrides` (cuenta y máquina, con fábrica y aceptación de garantía), `scheduled_activities.definition.schedule` (frecuencia, fuente, fábrica, anticipación y ancla) y `scheduled_activities.alert_at`.
- **Eventos (outbox):** `MachineComponentAdded`, `MachineComponentActivated`, `MachineComponentDeactivated`, `MachineComponentsTransferClosed`, `MachineFrequenciesChanged`, `AccountFrequenciesChanged` (payload permitido: `operation`, `machineIds`), además de `MachineTransferred`; consumidor `schedule-recalc` con jobs idempotentes.
- **Contratos** (`packages/contracts/src/equipment.ts`): esquemas de catálogo de cuenta, componentes por máquina, sobrescrituras, frecuencias efectivas y por modelo, y `WARRANTY_WARNING_CONFIRMATION_REQUIRED`.
- **API:** `listMachineFrequencies` y `listMachineComponents` (funciones exportadas del módulo `equipment`) y las rutas `GET /v1/machines/{id}/frequencies` y `/components`.

| Tarea                                        | Criterio RA-01                                                                               | Tiene                                                                                                                                                           | Le falta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F7-01 — generación y recálculo               | Usar componentes activos y frecuencia efectiva; depende de F4-21                             | Resolución de dominio, planificador `planActivities` y recálculo idempotente por eventos; pendientes vencidas se conservan («sin borrar atrasos»)               | (a) `planActivities` y `diffSchedule` viven en `apps/worker/src/processors`; F7-01 prevé `apps/api/src/modules/maintenance/scheduling`, así que conviene moverlos a un paquete (`@ice24/domain` o uno de mantenimiento) antes de reutilizarlos. (b) El calendario guarda una sola ocurrencia por actividad, no una serie; «próximas» puede requerir varias. (c) El ancla usa el vencimiento de la última actividad realizada porque no existe fecha real de ejecución; F7 debe registrarla y el ancla debe usarla. (d) No hay esquemas tipados de payload para los eventos RA-01 en `@ice24/contracts` (solo el sobre genérico) ni constantes compartidas de nombres de evento (están en el worker). (e) Hueco H2: actividades de plantilla sin vínculo con componentes oficiales |
| F8-01 — plantillas sanitarias con frecuencia | La frecuencia sanitaria de la plantilla es el default; el cliente la sobrescribe según F4-20 | Tipo de actividad `SANITATION`, sobrescrituras y resolución                                                                                                     | Las sobrescrituras de F4-20 solo apuntan a actividades de `template_versions.definition` (por `activity_code`) o de componentes propios. Si F8-01 crea plantillas sanitarias como entidad nueva, hay que ampliar el objetivo de `maintenance_frequency_overrides` (o definir que la frecuencia sanitaria siga en la actividad de la plantilla de equipo con categoría `sanitation`). Decisión de diseño necesaria antes de F8-01                                                                                                                                                                                                                                                                                                                                                  |
| F8-02 — programación de bitácoras            | Frecuencia sanitaria efectiva y solo componentes activos                                     | `resolveEffectiveFrequency`, componentes vigentes por máquina, eventos de cambio                                                                                | (a) Hueco H2: una bitácora de una actividad de plantilla no puede filtrarse por componente activo porque no hay vínculo actividad–componente; solo las actividades de componentes propios dependen del estado. (b) La lectura de la frecuencia efectiva está en el store de la API (`listMachineFrequencies`) y en SQL propio del worker; falta una consulta o servicio reutilizable para un procesador nuevo. (c) Mismos puntos (a) y (d) de F7-01                                                                                                                                                                                                                                                                                                                               |
| F8-14 — alertas y «Enterado»                 | La anticipación usa el valor del cliente o el default de la plantilla                        | Anticipación del cliente (cuenta o máquina) resuelta con su fuente; `alert_at` calculado para actividades de equipo; infraestructura de notificaciones de F5-11 | (a) Hueco H1: la plantilla no define anticipación de fábrica, así que sin valor del cliente no hay alerta; requiere decisión de ICE24 y el campo en `activityInputSchema` (F4-06). (b) Ningún proceso convierte `alert_at` en notificación; F4-21 lo dejó para F7/F8. (c) Si las bitácoras sanitarias de F8 son una entidad distinta de `scheduled_activities`, necesitarán su propio `alert_at` con la misma resolución                                                                                                                                                                                                                                                                                                                                                          |

## Archivos

- `docs/qa/phase-4/ra-01/`: `README.md`, `traceability.md`, `environment.txt`, `check.txt`, `build.txt`, `build-storage-origin.txt`, `integration.txt`, `ci-pr34-checks.json`, `ci-pr34-supabase-migrations.log` (nuevos).
- `docs/backlog/phase-4-status.md` (sección agregada).
- `docs/tasks/task-f4-ra01-gate.md` (este reporte) y `docs/tasks/README.md` (índice).

## Riesgos y pendientes

- El complemento queda técnicamente validado pero **sin aprobación**: depende de las decisiones H1–H3 y H6 y de la validación manual H7.
- H1 y H2 condicionan F8-02 y F8-14; conviene decidirlas antes de iniciar la Fase 8.
- Las rutas y tablas RA-01 siguen fuera de `context/API.md` y `context/Database.md` (H8).
