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

## Gate vigente

**Pendiente; no aprobado.** [Checklist y responsables](gate-f7.md): Calixto reúne desarrollo, Tech Lead y QA; Axel Quevedo Zamudio y Eduardo Ramos aprueban negocio por mensaje con captura en evidence/. EXC-F6-01 exige ocho recorridos Windows/Android, sin extender fecha; [guion y tabla](screen-reader-script.md). Apple no probado, riesgo aceptado hasta disponer de dispositivo.

UX del pulido #68, tickets, revisión y KPI: [aprobación registrada](ux-signoff.md). Campo CF-01…CF-10 pendiente antes de [activar offline en producción](offline-production-activation.md); apagado por defecto en código, verificar entorno efectivo. [Protocolo](field-test-protocol.md), [decisiones para aprobación por mensaje](decisions-for-signature.md), [declaración](evidence/20261108-declaracion-cierre.md), [mensaje para los jefes](mensaje-aprobacion-jefes.md).

Evidencia técnica de producto: [auditoría LiveRegion](live-region-audit.md), [resultados y fallos anteriores](evidence/20261111-p13-live-regions.json). La consulta de GitHub del 08/11 es antecedente: main protegido y #66 integrado están resueltos en registros posteriores. DEC-020, dispositivos definitivos DEC-018 y O-02 siguen fuera del gate.
