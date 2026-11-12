# Revisión de Fase 7

Para Axel Quevedo Zamudio y Eduardo Ramos. Usar solo datos ficticios. Las pantallas marcadas «Maqueta — sin lógica» muestran la propuesta y no guardan operaciones.

1. **Capturas:** `pnpm ux:snapshots`; abrir `docs/qa/phase-6/ux-review/index.html` y seleccionar «Fase 7 — Mantenimiento y offline». La galería compartida conserva F6. En GitHub: PR → Checks → UI quality → Summary → Artifacts → ux-review-gallery; descargar, extraer y abrir index.html.
2. **Videos:** `pnpm ux:walkthroughs`; abrir `docs/qa/phase-7/walkthroughs/index.html`. En el mismo resumen descargar ux-walkthroughs. Los pasos están rotulados y el resultado distingue simulación de operación real.
3. **Storybook:** `pnpm storybook`, abrir http://localhost:6006; controles y Matriz de estados de mantenimiento. También se entrega storybook-static.
4. **App:** PowerShell: `$env:ICE24_DEMO_MODE="1"; pnpm dev:private`; abrir http://localhost:3000/?demo=1. Panel Demo: persona, sucursal, conexión y escenario de mantenimiento. Preview permanece desactivado hasta aprobación de ADR-026.

Registrar Aprobado/Cambios solicitados, comentario, revisor y fecha en [ux-signoff](ux-signoff.md). Las capturas y axe no sustituyen los [recorridos con lector](screen-reader-walkthroughs.md).

P3: revisar lista, asignación, detalle y cronología de órdenes con el [checklist F7-03](../../tasks/task-f7-03.md), la [máquina de estados F7-04](../../tasks/task-f7-04.md) y la [evidencia de validación](work-orders-validation.md). El recorrido «Del ticket a la orden asignada» usa servicios simulados identificados; la persistencia se verifica por separado con PostgreSQL. Baselines nuevas y modificadas requieren aprobación UX.

## ui-quality requerido en main

Resuelto: ruleset `main-require-ui-quality`, ID 26916128, activo únicamente para main; check exacto `ui-quality` de GitHub Actions 15368 y rama actualizada. Verificado de nuevo por lectura el 11/11/2026, sin cambios remotos. [Evidencia e instrucciones exactas para el administrador](gate-f7.md#protección-de-main-instrucciones-exactas-para-el-administrador).

## Gate

EXC-F6-01 sigue abierta; QA ejecuta los 12 recorridos y registra resultados antes de retirarla. DEC-020, dispositivos definitivos DEC-018 y O-02 permanecen fuera del gate según cierre F6. [Trazabilidad](traceability.md), [estado](../../backlog/phase-7-status.md).

## Preparación del cierre P13

[Declaración del 08/11/2026](evidence/20261108-declaracion-cierre.md): cierre rechazado, con bloqueos y responsables. [Consulta de GitHub](evidence/20261108-gate-github.json): main sin protección/rulesets y PR #66 abierto. Los resultados automatizados de P10–P12 son antecedentes; no se presentan como batería final sobre main integrado.

El usuario confirmó que aún faltan los 12 recorridos con lector y las pruebas físicas. Registrar para cada escenario resultado, dispositivo/navegador/versión, lector y versión si aplica, fecha, responsable y evidencia. No se requiere repetir la aprobación UX ya registrada de UI-SYNC-01; sí completar los requisitos humanos distintos de esa aprobación.

Preparación P13: [guion de lector](screen-reader-script.md), [protocolo de campo](field-test-protocol.md), [decisiones para firma](decisions-for-signature.md) y [checklist del gate](gate-f7.md). Todo resultado humano permanece pendiente con responsable; no se amplía EXC-F6-01.

P13 posterior a #68: [auditoría de anuncios del producto](live-region-audit.md), [evidencia vigente](evidence/20261111-p13-live-regions.json) y [guion de anuncios por recorrido](screen-reader-script.md). Main `cba6e15`; publicación autorizada, sin aprobación humana ni merge automático.
