# TASK-F7-15 — Centro de sincronización

Implementación local P10 del 08/11/2026. Ruta `/maintenance/synchronization`, accesible desde órdenes, pendientes y trabajo de campo. Reutiliza Comparator, SyncStatus y Dialog.

Lista operaciones del usuario/cuenta con entidad, fecha, archivos, intentos y estado. Reintentar requiere permiso; descartar exige confirmación y no elimina versiones remotas. El comparador diferencia servidor actual, dispositivo y originales detectados. Conservación local/servidor o combinación explícita exige motivo y confirmación; solo Dueño/Administrador autorizado en el ámbito puede resolver. Cada resolución produce versión nueva y auditoría con actor real.

Archivos: `features/sync/synchronization-center.tsx/css`, página/BFF synchronization, contratos, demo y Storybook `synchronization-center.stories.tsx`. UI-SYNC-01 deja de apuntar a la maqueta. Catálogo y recorrido «Detectar y resolver un conflicto» incluyen técnico y administrador.

Validación: [reporte compartido](../qa/phase-7/evidence/20261108-suite-campo.md). UX de UI-SYNC-01 aprobada explícitamente el 08/11/2026: comparación de versiones, resolución y originales conservados. Esta aprobación es independiente de las históricas P7–P9.

Validación automatizada: 1.033 pruebas unitarias, build 14/14, integración 204/204 y UI Linux 2.283/2.283. [Inventario completo](../qa/phase-7/evidence/20261108-inventario-p10-p12.md).

## Checklist de revisión UX

Las seis preguntas sí/no y sus pendientes humanos están en el [reporte compartido](../qa/phase-7/evidence/20261108-suite-campo.md#checklist-de-revisión-ux--aprobado). UI-SYNC-01 aprobada por el usuario solicitante el 08/11/2026; véase el registro de UX. Pruebas físicas y lector de pantalla siguen pendientes.
