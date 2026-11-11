# Aprobación UX Fase 7

08/11/2026: después de indicar inicialmente que aún no lo había revisado, el usuario solicitante confirmó: «Ya revisé las pantallas y todo está bien. Registra la aprobación UX de UI-SYNC-01 y haz commit y push de los cambios». Se registra **Aprobado** para el centro de sincronización UI-SYNC-01: comparación servidor/dispositivo, permisos de consulta y resolución, confirmación con motivo, conservación de originales y gestión de pendientes. Esta aprobación UX no acredita pruebas físicas ni lector de pantalla, no aprueba F7-D02/D03 y no cierra el gate F7 ni EXC-F6-01. Se mantienen las aprobaciones históricas P7–P9 y UI-MNT-01/02.

Aprobación parcial registrada el 04/11/2026: el usuario solicitante confirmó «Sí, se entiende claramente» para la lista de requisitos faltantes de UI-WO-03 en móvil. No implica aprobación global de la pantalla, de lector de pantalla ni del resto de F7.

P7–P9: aprobación UX registrada el 06/11/2026 por el usuario solicitante: «Ya revisé las pantallas y todo está bien. Registra la aprobación UX». Cubre descarga, detalle/bloqueo, trabajo en campo, revisión de cierre, sincronización en la pantalla de campo y liberación administrativa. No aprueba F7-D03 ni acredita lector de pantalla/dispositivo específico. El centro de conflictos P10 queda fuera de esta aprobación.

UI-MNT-01/02: aprobación UX registrada el 06/11/2026 por el usuario solicitante: «Ya revisé el nuevo enlace al expediente y todo está bien. Registra la aprobación UX de UI-MNT-01/02 y haz commit y push de los cambios». Cubre calendario, lista y navegación al expediente de la máquina. No acredita recorridos con lector de pantalla ni dispositivo físico específico, ni aprueba decisiones de negocio pendientes.

| Pantalla         | Aprobado / Cambios solicitados | Comentario                                                        | Revisor                                | Fecha      |
| ---------------- | ------------------------------ | ----------------------------------------------------------------- | -------------------------------------- | ---------- |
| UI-MNT-01        | Aprobado                       | Calendario/lista y enlace al expediente revisados                 | Usuario solicitante, respuesta en chat | 06/11/2026 |
| UI-MNT-02        | Aprobado                       | Calendario/lista y enlace al expediente revisados                 | Usuario solicitante, respuesta en chat | 06/11/2026 |
| UI-TKT-01        | Pendiente                      | —                                                                 | —                                      | —          |
| UI-TKT-02        | Pendiente                      | —                                                                 | —                                      | —          |
| UI-WO-01         | Aprobado (P7–P9)               | Flujo de descarga, trabajo local y cierre revisado; alcance P7–P9 | Usuario solicitante, respuesta en chat | 06/11/2026 |
| UI-WO-02         | Aprobado (P7–P9)               | Flujo de descarga, trabajo local y cierre revisado; alcance P7–P9 | Usuario solicitante, respuesta en chat | 06/11/2026 |
| UI-WO-03         | Aprobado (P7–P9)               | Flujo de descarga, trabajo local y cierre revisado; alcance P7–P9 | Usuario solicitante, respuesta en chat | 06/11/2026 |
| UI-WO-04         | Pendiente                      | —                                                                 | —                                      | —          |
| UI-SYNC-01       | Aprobado (P10)                 | Centro de sincronización, conflictos y pendientes revisados       | Usuario solicitante, respuesta en chat | 08/11/2026 |
| Resumen KPI      | Pendiente                      | —                                                                 | —                                      | —          |
| Trabajo en campo | Aprobado (P7–P9)               | Editor local, revisión y reconexión                               | Usuario solicitante, respuesta en chat | 06/11/2026 |

## F7-18 — aprobación UX del 10/11/2026

**Aprobado**, por revisión explícita en demo del usuario solicitante:

> Ya revisé en el demo las superficies de F7-18 (Preparar mi ruta / descarga, lista sin conexión al recargar, Centro de sincronización sin red y editor de campo con navegación superior) y todo está bien.

| Superficie                     | Estado   | Revisor                                | Fecha      |
| ------------------------------ | -------- | -------------------------------------- | ---------- |
| UI-WO-01 / Asignadas           | Aprobado | Usuario solicitante, respuesta en chat | 10/11/2026 |
| UI-WO-01 sin red               | Aprobado | Usuario solicitante, respuesta en chat | 10/11/2026 |
| UI-SYNC-01                     | Aprobado | Usuario solicitante, respuesta en chat | 10/11/2026 |
| Trabajo en campo / UI-WO-02/03 | Aprobado | Usuario solicitante, respuesta en chat | 10/11/2026 |

Esta aprobación acredita únicamente la revisión UX de estas cuatro superficies de F7-18. No acredita lector de pantalla ni pruebas físicas, no aprueba F7-D03 ni ADR-027 y no cierra el gate F7. Las demás filas pendientes y firmas conservan su estado. Pruebas y capturas en [F7-18](../../tasks/task-f7-18.md).

## F7-18 — actualización del editor y caché, 10/11/2026

**Corrección incluida en la aprobación UX explícita del 10/11/2026.** Se identificó la caché fija v5 como causa de que el navegador instalado siguiera mostrando CSS antiguo. El build genera ahora una versión por contenido del shell público, sin borrar IndexedDB ni ampliar permisos. La navegación de regreso se mueve antes de Trabajo en campo; muestra folio/máquina y usa botones secundarios con separación de 16 px. Se elimina la navegación duplicada del pie. Checklist, fotos y ausencia de Administración permanecen en el editor reutilizado. Se verifica confirmación de salida ante fallo de almacenamiento y regreso a descargas sin red. Las cuatro baselines del editor fueron inspeccionadas; el usuario revisó esta superficie en demo. Resultados finales en task-f7-18.md; gate F7 no aprobado.

Validación automática de esta corrección completada: 7 E2E focales, 2.380 pruebas UI Linux sin reintentos y cuatro capturas del editor inspeccionadas. La aprobación humana consta arriba y tiene el alcance limitado allí indicado. Evidencia de caché/estilos por Chrome DevTools Protocol en `evidence/20261110-f7-18-cache-browser.json`.
