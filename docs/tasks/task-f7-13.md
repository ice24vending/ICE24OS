# TASK-F7-13 — Conflictos de sincronización

Implementación local P10 del 08/11/2026. AppFlow §27, UI_UX §14.18 y política propuesta F7-D02.

La discrepancia de versión/descarga registra versiones completas inmutables del dispositivo y servidor, actor, dispositivo, fecha y campos diferentes. La respuesta idempotente conserva el ID del conflicto; no sobrescribe ejecución. El servidor mantiene además una comparación con la versión actual para exigir una nueva revisión si cambia antes de confirmar.

Archivos principales: contratos `private/maintenance/conflicts.ts`, `work-orders.store.ts`, `synchronization.controller.ts`, migración `20261108000100_phase7_sync_conflicts.sql` y `server/demo/conflicts.ts`. RLS y triggers prohíben mutación de originales y resoluciones.

Validación y límites: [suite de campo](../qa/phase-7/evidence/20261108-suite-campo.md). Integración con dos actores, archivos, ámbito ajeno, repetición y resolución concurrente. Demo «Provocar conflicto» altera realmente la versión del paquete descargado al sincronizar; «Comparación de conflicto (ejemplo)» es un ejemplo separado del catálogo.

Reversión: retirar primero rutas/funciones nuevas; conservar tablas e historial. No borrar auditoría ni ejecutar un rollback destructivo. Commit y push autorizados el 08/11/2026. Sin migración remota.

Validación automatizada: 1.033 pruebas unitarias, build 14/14, integración 204/204 y UI Linux 2.283/2.283. [Inventario completo](../qa/phase-7/evidence/20261108-inventario-p10-p12.md).

## Checklist de revisión UX

Las seis preguntas sí/no y sus pendientes humanos están en el [reporte compartido](../qa/phase-7/evidence/20261108-suite-campo.md#checklist-de-revisión-ux--aprobado). UI-SYNC-01 aprobada por el usuario solicitante el 08/11/2026; véase el registro de UX. Pruebas físicas y lector de pantalla siguen pendientes.
