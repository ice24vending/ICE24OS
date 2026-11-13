# Aprobación UX Fase 7

08/11/2026: después de indicar inicialmente que aún no lo había revisado, el usuario solicitante confirmó: «Ya revisé las pantallas y todo está bien. Registra la aprobación UX de UI-SYNC-01 y haz commit y push de los cambios». Se registra **Aprobado** para el centro de sincronización UI-SYNC-01: comparación servidor/dispositivo, permisos de consulta y resolución, confirmación con motivo, conservación de originales y gestión de pendientes. Esta aprobación UX no acredita pruebas físicas ni lector de pantalla, no aprueba F7-D02/D03 y no cierra el gate F7 ni EXC-F6-01. Se mantienen las aprobaciones históricas P7–P9 y UI-MNT-01/02.

Aprobación parcial registrada el 04/11/2026: el usuario solicitante confirmó «Sí, se entiende claramente» para la lista de requisitos faltantes de UI-WO-03 en móvil. No implica aprobación global de la pantalla, de lector de pantalla ni del resto de F7.

P7–P9: aprobación UX registrada el 06/11/2026 por el usuario solicitante: «Ya revisé las pantallas y todo está bien. Registra la aprobación UX». Cubre descarga, detalle/bloqueo, trabajo en campo, revisión de cierre, sincronización en la pantalla de campo y liberación administrativa. No aprueba F7-D03 ni acredita lector de pantalla/dispositivo específico. El centro de conflictos P10 queda fuera de esta aprobación.

UI-MNT-01/02: aprobación UX registrada el 06/11/2026 por el usuario solicitante: «Ya revisé el nuevo enlace al expediente y todo está bien. Registra la aprobación UX de UI-MNT-01/02 y haz commit y push de los cambios». Cubre calendario, lista y navegación al expediente de la máquina. No acredita recorridos con lector de pantalla ni dispositivo físico específico, ni aprueba decisiones de negocio pendientes.

| Pantalla         | Aprobado / Cambios solicitados | Comentario                                                                          | Revisor                                             | Fecha                     |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------- |
| UI-MNT-01        | Aprobado                       | Calendario/lista y enlace al expediente revisados                                   | Usuario solicitante, respuesta en chat              | 06/11/2026                |
| UI-MNT-02        | Aprobado                       | Calendario/lista y enlace al expediente revisados                                   | Usuario solicitante, respuesta en chat              | 06/11/2026                |
| UI-TKT-01        | Aprobado                       | Alcance ratificado; diseño por WhatsApp 15/10/2026 según usuario, captura pendiente | Calixto (chat); Axel y Eduardo (WhatsApp reportado) | 11/11/2026 (ratificación) |
| UI-TKT-02        | Aprobado                       | Alcance ratificado; diseño por WhatsApp 15/10/2026 según usuario, captura pendiente | Calixto (chat); Axel y Eduardo (WhatsApp reportado) | 11/11/2026 (ratificación) |
| UI-WO-01         | Aprobado (P7–P9)               | Flujo de descarga, trabajo local y cierre revisado; alcance P7–P9                   | Usuario solicitante, respuesta en chat              | 06/11/2026                |
| UI-WO-02         | Aprobado (P7–P9)               | Flujo de descarga, trabajo local y cierre revisado; alcance P7–P9                   | Usuario solicitante, respuesta en chat              | 06/11/2026                |
| UI-WO-03         | Aprobado (P7–P9)               | Flujo de descarga, trabajo local y cierre revisado; alcance P7–P9                   | Usuario solicitante, respuesta en chat              | 06/11/2026                |
| UI-WO-04         | Aprobado                       | Alcance ratificado; diseño por WhatsApp 15/10/2026 según usuario, captura pendiente | Calixto (chat); Axel y Eduardo (WhatsApp reportado) | 11/11/2026 (ratificación) |
| UI-SYNC-01       | Aprobado (P10)                 | Centro de sincronización, conflictos y pendientes revisados                         | Usuario solicitante, respuesta en chat              | 08/11/2026                |
| Resumen KPI      | Aprobado                       | Alcance ratificado; diseño por WhatsApp 15/10/2026 según usuario, captura pendiente | Calixto (chat); Axel y Eduardo (WhatsApp reportado) | 11/11/2026 (ratificación) |
| Trabajo en campo | Aprobado (P7–P9)               | Editor local, revisión y reconexión                                                 | Usuario solicitante, respuesta en chat              | 06/11/2026                |

## Separación de aprobación UX y gate P13

08/11/2026: el usuario confirmó que aún no ejecuta los recorridos con lector ni las pruebas físicas. Se conserva la aprobación explícita de UI-SYNC-01 y las históricas de UI-MNT-01/02 y P7–P9; no se rellenan otras filas ni aprobaciones por mensaje de Axel y Eduardo por inferencia. El [dictamen de cierre](evidence/20261108-declaracion-cierre.md) permanece rechazado.

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

## Pulido posterior a F7-18 — aprobación registrada 11/11/2026

**Aprobado**: pulido PR #68, UI-TKT-01/02, UI-WO-04 y Resumen KPI. Revisor: usuario solicitante (Calixto Isaac Galeana Medrano), respuesta en chat del 11/11/2026: «Revisé las pantallas varias veces y todo está bien». Ratifica expresamente estas superficies. Según su confirmación «15/10/2026 Whatsapp», Axel Quevedo Zamudio y Eduardo Ramos aprobaron el diseño por **WhatsApp el 15/10/2026**. Esa fecha corresponde a la aprobación de diseño comunicada por el usuario; no se atribuye una revisión del commit posterior #68 en esa fecha. Captura del mensaje: **pendiente de adjuntar por Calixto** en evidence/; no se inventa un archivo.

| Superficie                         | Estado   | Revisor / medio / fecha                                                                       | Alcance                                        |
| ---------------------------------- | -------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Resumen / KPI / Tareas por atender | Aprobado | Usuario solicitante, chat 11/11/2026; diseño: Axel/Eduardo, WhatsApp 15/10/2026 según usuario | Pulido #68                                     |
| UI-WO-01 / lista y asignación      | Aprobado | Mismos revisores, medios y fechas                                                             | Pulido #68                                     |
| UI-WO-02/03/04                     | Aprobado | Mismos revisores, medios y fechas                                                             | Consulta, breadcrumb y revisión del pulido #68 |
| UI-TKT-01/02 y lista               | Aprobado | Mismos revisores, medios y fechas                                                             | Tickets y pulido #68                           |
| UI-SYNC-01 / descarga              | Aprobado | Mismos revisores, medios y fechas                                                             | Textos del pulido #68                          |

Esta aprobación no acredita lector, campo físico, decisiones, nuevos cambios P13 ni gate F7. Las aprobaciones históricas conservan su alcance. [Checklist del pulido](../../tasks/task-f7-gate-polish.md).

Revisión P13 posterior al squash #68, 11/11/2026: corrección de anuncios en Resumen operativo, órdenes/ejecución, tickets, descarga, sincronización y referencias F6, con `LiveRegion` compartido. **Pendiente – responsable: Calixto; Axel y Eduardo (UX), Calixto Isaac Galeana Medrano (lector/QA)**. No se aprueba por pruebas DOM/axe ni por las aprobaciones UX históricas. Contrastes indeterminados: medición técnica en curso; responsable QA: Calixto. [Inventario](live-region-audit.md).

## Corrección de contraste del acceso — 11/11/2026

Superficie opaca del panel de acceso y nueva historia compartida: **pendiente – responsable: Calixto (revisión), Axel/Eduardo si requiere ratificación visual**. No se extiende la aprobación de diseño reportada del 15/10/2026. La [medición técnica](rendered-contrast.md) corrige texto blanco sobre la parte clara de la diagonal (1,06:1 antes); 53 mediciones finales cumplen. La inspección de siete baselines no es aprobación humana.

## Panel del acceso sin recuadro — 12/11/2026

El recuadro opaco del 11/11 se sustituye por la diagonal original acotada a la columna de marca (ver [medición](rendered-contrast.md#panel-sin-recuadro--12112026)). **Aprobado visualmente por Calixto en chat, 12/11/2026.** Ratificación de Axel/Eduardo a decisión de Calixto; no se infiere. No aprueba los anuncios P13 ni el gate F7.
