# TASK-F7-17 — Suite de campo

Implementación local P12 del 08/11/2026. Escenarios móviles en `tests/e2e/maintenance-offline`: desconexión/recarga, red intermitente, respuesta perdida después de commit, conflicto con fotos, dos dispositivos, cierre de pestaña durante transacción, cuota casi llena, expiración, reloj desfasado y revocación a mitad del trabajo.

«criterio de salida F7» se ejecuta con `ICE24_BROWSER_TESTS=1 pnpm test:integration`: recorrido Chromium de `criterion-flow.ts`, IndexedDB/service worker y PostgreSQL real. Descarga, ejecución/fotos offline, recarga, cambio concurrente, sincronización, comparación y resolución auditada; verifica una actividad, una orden, un cierre y una resolución sin duplicados. Usa zona Pacific/Auckland. Transporte HTTP y almacenamiento de objetos adaptados; no suplanta los conteos de base de datos.

Pruebas complementarias de transacciones, descarte con dependencias y limpieza parcial en `packages/offline/src/__tests__`; monitor en `features/sync/lifecycle.test.ts`.

[Resultados reales y defectos](../qa/phase-7/evidence/20261108-suite-campo.md). [Guion para teléfono físico](../qa/phase-7/field-tests.md), aún pendiente. No aprueba gate F7, lector de pantalla ni decisiones de dispositivos.

Validación automatizada: 1.033 pruebas unitarias, build 14/14, integración 204/204 y UI Linux 2.283/2.283. [Inventario completo](../qa/phase-7/evidence/20261108-inventario-p10-p12.md).

## Checklist de revisión UX

Las seis preguntas sí/no y sus pendientes humanos están en el [reporte compartido](../qa/phase-7/evidence/20261108-suite-campo.md#checklist-de-revisión-ux--aprobado). UI-SYNC-01 aprobada por el usuario solicitante el 08/11/2026; véase el registro de UX. Pruebas físicas y lector de pantalla siguen pendientes.
