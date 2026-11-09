# TASK-F7-16 — Limpieza local por pérdida de acceso

Implementación local P11 del 08/11/2026; TASK-F3-09 y riesgo de datos retenidos por usuario desactivado.

Monitor al abrir, pageshow, reconectar y periódicamente; borra órdenes, borradores, fotos/originales, operaciones, checkpoints y última llave del ámbito afectado. Se invalida escritura en curso y se avisa a otras pestañas. El cierre voluntario conserva advertencia de pendientes y opción de volver a sincronizar. Revocación, desactivación, cambio de cuenta/alcance, cierre global y expiración siguen el mismo mecanismo.

El servidor decide acceso con authorize() y alcance vigente. Una caída de red/503 no prueba revocación. La vigencia de una descarga nueva se traduce al reloj del dispositivo. La auditoría de pérdida valida propiedad de descargas e identidad firmada, sin conceder lectura ni escritura de órdenes al usuario desactivado.

Archivos: `packages/offline/src/lifecycle.ts`, protected-store, `features/sync/lifecycle.ts`, OfflineAccessMonitor, local-data/logout, BFF lifecycle y `offline-purge.controller.ts`. Pruebas de monitor, IndexedDB, PostgreSQL y móvil: [resultados](../qa/phase-7/evidence/20261108-suite-campo.md).

Limitación explícita: una app desconectada no recibe revocación remota hasta reconectar o vencer. Un recibo pendiente no sobrevive al borrado completo del navegador; no se afirma auditoría recibida sin confirmación del servidor. No guarda contenido sensible ni tokens para conseguirlo.

Validación automatizada: 1.033 pruebas unitarias, build 14/14, integración 204/204 y UI Linux 2.283/2.283. [Inventario completo](../qa/phase-7/evidence/20261108-inventario-p10-p12.md).

## Checklist de revisión UX

Las seis preguntas sí/no y sus pendientes humanos están en el [reporte compartido](../qa/phase-7/evidence/20261108-suite-campo.md#checklist-de-revisión-ux--aprobado). UI-SYNC-01 aprobada por el usuario solicitante el 08/11/2026; véase el registro de UX. Pruebas físicas y lector de pantalla siguen pendientes.
