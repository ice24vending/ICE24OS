# TASK-F7-04 — Máquina de estados y guardas

Paquete P3 junto a [F7-03](task-f7-03.md), 03/11/2026. Entrega conjunta con las correcciones de experiencia operativa. Ver [validación de publicación](../qa/phase-7/publication-f7-03-04.md); CI y aprobación UX se verifican por separado.

## Resultado

Tabla explícita en `packages/domain/src/work-order-state.ts` con los 13 arcos de AppFlow §15. Evalúa estado previo, permiso, versión esperada, técnico responsable activo, ventana/fecha límite, evidencia/ejecución, resultado, seguimiento, revisión versionada y motivo. El diagrama de `docs/modules/maintenance.md` y los estados HTTP se verifican contra esta fuente en una prueba.

API mediante comandos `POST /v1/work-orders/:id/transitions`, nunca PATCH arbitrario. Autoriza acción de escritura específica y obtiene hechos del servidor; rechaza banderas de conformidad/evidencia enviadas por cliente. Auditoría atómica con antes/después, actor, contexto, correlación y motivo. Inicio actualiza ticket y actividad vinculados sin eliminar atrasos. UI recibe acciones aplicables con explicación de bloqueos; muestra cronología.

P3 habilita clasificación temporal e inicio. P4/P5 deberán aportar registros reales para satisfacer guardas de cierre, corrección y anulación. Todas las rutas inválidas se rechazan; no se inventa reapertura fuera del diagrama aprobado.

## Validación y archivos

Pruebas exhaustivas estado × acción y guardas en `packages/domain/src/work-order-state.test.ts`; prueba de diagrama/contrato en `scripts/check-work-order-diagram.test.ts`; concurrencia, roles, auditoría y replay en integración de órdenes. UI, BFF, migración y evidencias compartidas con F7-03. [Resultados P3](../qa/phase-7/work-orders-validation.md): 938 unitarias, 14 tareas de build, 181 de integración, 2034 Linux sin fallos ni flaky, 1164 capturas y cinco recorridos. [Inventario de archivos](../qa/phase-7/evidence/20261103-f7-03-files.txt). Validación local aprobada; CI y revisión humana pendientes.

Revisión UX: seguir el checklist y seis preguntas del [reporte F7-03](task-f7-03.md), especialmente cronología, motivos de bloqueo y diferencias entre permisos. Decisiones F7-D04/F7-D07 y revisión humana pendientes; ninguna firma se acredita automáticamente.
