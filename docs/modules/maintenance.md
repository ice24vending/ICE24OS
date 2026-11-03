# Mantenimiento

Alcance F7: actividades programadas, tickets, órdenes, evidencia, revisión y sincronización offline. P0 solo prepara demostración y revisión; no ejecuta órdenes reales.

## Entidades y límites

- Actividad programada: `equipment.scheduled_activities`, creada por el worker de F4; conserva definición y frecuencia efectiva. No se crea un calendario paralelo.
- Ticket, orden, ejecución, evidencia y conflicto: implementación en P2–P11. Las maquetas están marcadas «Maqueta — sin lógica».
- Historial append-only; cancelación de futuras al recalcular, jamás borrado de atrasos. Componentes propios activos y frecuencias máquina → cuenta → plantilla (F4-20/21).

## Estados y eventos

AppFlow §15: Programado → Próximo/Vencido → En atención → Completado/Con observaciones/No conforme; corrección y anulación autorizadas conservan historia. «Crítico» es una señal de prioridad, no una transición adicional.

F4 emite MachineFrequenciesChanged, AccountFrequenciesChanged y eventos de componentes/plantilla; el consumidor encola jobs idempotentes. P3 define eventos y guardas de ejecución. P8 define sincronización idempotente con versión esperada.

## Permisos y offline

Toda lectura valida cuenta, sucursal, máquina, módulo y `authorize()`. Las propuestas F7-D01–D06 se detallan en [estado](../backlog/phase-7-status.md); no representan permisos productivos concedidos.

Solo una orden descargada permite trabajo offline (P6–P11). En P0 los controles son simulaciones: no descargan datos ni resuelven conflictos. Revisión UX en [QA](../qa/phase-7/README.md).

## Fuentes

## Implementación P1

`GET /v1/maintenance/activities` devuelve actividades paginadas y filtros por estado, máquina, sucursal, responsable y periodo. `GET /v1/maintenance/summary` cuenta pendientes de los próximos siete días en el contexto autorizado. El permiso `maintenance.read` aplica en API y BFF; cuenta, sucursal y máquinas limitan cada consulta. El módulo puede deshabilitarse.

La UI `/maintenance?view=calendar` agrupa por fecha local de sucursal; `view=list` conserva filtros en URL. Los atrasos siguen disponibles fuera del periodo de próximos. El Resumen enlaza al listado con `period=next7days`. Estados temporales se calculan al leer, sin reescribir historia. La versión de fila se expone para futuros comandos; P1 no incorpora mutaciones de órdenes.

El worker reutiliza recálculo F4, frecuencia efectiva y componentes propios activos. La instalación opcional ancla el primer calendario; cambios de plantilla/configuración posteriores se respetan. Se opera en zona IANA y se prueban saltos y ambigüedades DST. F7-D05/D06 siguen siendo propuestas visibles. La relación de componentes oficiales con actividades de plantilla continúa pendiente del modelo, sin inventar filtros.

Validación y límites en [F7-01](../tasks/task-f7-01.md); operación y reversión en [runbook](../runbooks/maintenance.md).

[PRD](../../context/PRD.md), [TRD](../../context/TRD.md), [AppFlow §15 y §27](../../context/AppFlow.md), [UI_UX §12.5, §13.5, §14.8, §14.18, §15.3 y §20](../../context/UI_UX.md), [F4-20](../tasks/task-f4-20.md), [F4-21](../tasks/task-f4-21.md).
