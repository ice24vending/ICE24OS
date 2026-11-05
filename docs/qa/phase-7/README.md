# Revisión de Fase 7

Para Axel Quevedo Zamudio y Eduardo Ramos. Usar solo datos ficticios. Las pantallas marcadas «Maqueta — sin lógica» muestran la propuesta y no guardan operaciones.

1. **Capturas:** `pnpm ux:snapshots`; abrir `docs/qa/phase-6/ux-review/index.html` y seleccionar «Fase 7 — Mantenimiento y offline». La galería compartida conserva F6. En GitHub: PR → Checks → UI quality → Summary → Artifacts → ux-review-gallery; descargar, extraer y abrir index.html.
2. **Videos:** `pnpm ux:walkthroughs`; abrir `docs/qa/phase-7/walkthroughs/index.html`. En el mismo resumen descargar ux-walkthroughs. Los pasos están rotulados y el resultado distingue simulación de operación real.
3. **Storybook:** `pnpm storybook`, abrir http://localhost:6006; controles y Matriz de estados de mantenimiento. También se entrega storybook-static.
4. **App:** PowerShell: `$env:ICE24_DEMO_MODE="1"; pnpm dev:private`; abrir http://localhost:3000/?demo=1. Panel Demo: persona, sucursal, conexión y escenario de mantenimiento. Preview permanece desactivado hasta aprobación de ADR-026.

Registrar Aprobado/Cambios solicitados, comentario, revisor y fecha en [ux-signoff](ux-signoff.md). Las capturas y axe no sustituyen los [recorridos con lector](screen-reader-walkthroughs.md).

P3: revisar lista, asignación, detalle y cronología de órdenes con el [checklist F7-03](../../tasks/task-f7-03.md), la [máquina de estados F7-04](../../tasks/task-f7-04.md) y la [evidencia de validación](work-orders-validation.md). El recorrido «Del ticket a la orden asignada» usa servicios simulados identificados; la persistencia se verifica por separado con PostgreSQL. Baselines nuevas y modificadas requieren aprobación UX.

## Hacer requerido ui-quality

Administrador: GitHub → ice24vending/ICE24OS → Settings → Branches → Branch protection rules → regla main → Edit (o Add rule, patrón main). Activar Require a pull request before merging y Require status checks to pass before merging; buscar y seleccionar `ui-quality` después de que haya corrido una vez; conservar quality/integration existentes. Guardar. Si el repositorio usa Rulesets: Settings → Rules → Rulesets → regla de main → Require status checks → Add checks → ui-quality → Save. Verificar con un PR que un fallo bloquee merge. No se afirma que ya esté configurado.

## Gate

EXC-F6-01 sigue abierta; QA ejecuta los 12 recorridos y registra resultados antes de retirarla. DEC-020, dispositivos definitivos DEC-018 y O-02 permanecen fuera del gate según cierre F6. [Trazabilidad](traceability.md), [estado](../../backlog/phase-7-status.md).
