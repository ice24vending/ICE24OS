# Estado de Fase 4 — Cuentas, sucursales, usuarios, equipos y plantillas

Fecha de revisión: 23 de septiembre de 2026.

## Resultado

**Fase aprobada y firmada, según confirmación expresa del responsable el 23/09/2026. Gate de salida aceptado; Fase 5 habilitada.** La confirmación recibida es: «La Fase 4 ha sido aprobada y firmada. Vamos a iniciar con la Fase 5». Se registra la decisión del responsable sin atribuir nuevas ejecuciones de pruebas a esta actualización ni reproducir firmas no adjuntas.

## Entrega

- Cuenta titular, sucursales, miembros y permisos delegados.
- Catálogos, plantillas versionadas y definiciones de actividades.
- Solicitudes, aprobación y expediente con código permanente.
- Periodos, traslados, retiro, transferencia y calendarios durables.
- API, administración, BFF, pantallas privadas, pruebas y migración.
- [Módulo](../modules/equipment.md), [runbook](../runbooks/equipment.md) y [resultados QA](../qa/phase-4/README.md).

## Evidencia y siguiente paso

Las 15 integraciones aprobadas se registran conforme a la confirmación del responsable; no se repitieron durante este cierre documental. No se atribuyen los resultados de Fase 3 a Fase 4. La [declaración de cierre](../qa/phase-4/evidence/20260923-declaracion-cierre.md) conserva los límites de la evidencia técnica recibida; la confirmación posterior de aprobación y firma resuelve el gate de entrada de Fase 5.

El gate anterior está en [F3-20260914-SCOPE-03](../qa/phase-3/evidence/F3-20260914-SCOPE-03/README.md). El siguiente trabajo se registra en el [arranque de Fase 5](phase-5-status.md). Commit y push quedan a cargo del responsable.

## Complemento RA-01

Agregado el 10 de octubre de 2026. Esta sección no modifica la aprobación de la Fase 4 del 23/09/2026: registra por separado el complemento derivado de `RA-01` (`context/Requerimientos_Adicionales_v1.1.md`, decisiones D1–D4 del 09/10/2026).

### Estado

| Tarea | Entrega                                                              | PR  | Estado            |
| ----- | -------------------------------------------------------------------- | --- | ----------------- |
| F4-18 | [Catálogo oficial y por cuenta](../tasks/task-f4-18.md)              | #30 | Integrada en main |
| F4-19 | [Componentes por máquina](../tasks/task-f4-19.md)                    | #31 | Integrada en main |
| F4-20 | [Frecuencias de fábrica y del cliente](../tasks/task-f4-20.md)       | #32 | Integrada en main |
| F4-21 | [Recálculo de calendarios](../tasks/task-f4-21.md)                   | #33 | Integrada en main |
| F4-22 | [UI de componentes y frecuencias y backfill](../tasks/task-f4-22.md) | #34 | Integrada en main |

**Gate técnico del complemento: validaciones en verde sobre `main` `494ba67`; pendiente de aprobación del responsable.**

### Evidencia

- [Evidencia RA-01](../qa/phase-4/ra-01/README.md) del 10/10/2026: `pnpm check` (463 pruebas en 75 archivos), `pnpm build` (14 tareas), `ICE24_BROWSER_TESTS=1 pnpm test:integration` (145 pruebas en 19 archivos, con Chromium) y, de CI del PR #34, migraciones, lint de base de datos y pgTAP (353 pruebas en 19 archivos).
- [Matriz de trazabilidad](../qa/phase-4/ra-01/traceability.md) RA-01 → RF-TPL-013..016 → D1..D4 → tareas → pruebas.
- [Reporte del gate](../tasks/task-f4-ra01-gate.md), con lo que necesitan F7-01, F8-01, F8-02 y F8-14.

### Pendientes

1. Decisiones de dirección: componentes propios y frecuencias al transferir (F4-19/F4-20), sin advertencia en componentes propios (F4-20) y «aplicar a un modelo» como sobrescrituras de máquina (F4-22).
2. Decisiones de ICE24 sobre la plantilla (F4-06): ventanas de alerta de fábrica, vínculo actividad–componente y componentes sugeridos opcionales. Bloquean parte de F8-02 y F8-14 (ver reporte).
3. Validación manual con identidad, worker y PGMQ reales, y revisión UX de F4-22 con dirección.
4. Pruebas faltantes de bajo riesgo: D4 en recálculo y en «aplicar a un modelo»; pgTAP del backfill.
5. Documentación: rutas de F4-18 a F4-22 en `context/API.md` y tablas en `context/Database.md`.

### Aprobación del responsable

| Campo                                               | Valor |
| --------------------------------------------------- | ----- |
| Decisión (aprobado / con observaciones / rechazado) |       |
| Responsable                                         |       |
| Fecha                                               |       |
| Observaciones                                       |       |
