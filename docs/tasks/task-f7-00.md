# F7-00 — Arranque y sala de revisión

02/11/2026. Implementado localmente antes de P1. Por instrucción del usuario se conserva el checkout y sus cambios previos; no se crea PR, commit ni push. Validación automatizada aprobada en Linux; gate pendiente de firma humana; esto no cierra EXC-F6-01.

## Entrega y archivos

- Estado y decisiones: `docs/backlog/phase-7-status.md`, `open-decisions.md`, `docs/modules/maintenance.md`, ADR-026 y `docs/qa/phase-7/`.
- Demo: `apps/private-web/src/server/demo/{state,maintenance,mode,preview.test}.ts`, panel/slot, endpoint demo y layout. Escenarios descargada, fotos pendientes, conflicto y permiso revocado usan autorización real. Banner permanente y noindex; Preview requiere aprobación y protección verificadas y sigue desactivado.
- Maquetas: `features/maintenance/review-screen*`, rutas `maintenance/review/[screen]`, fixtures y CSS. Tickets/órdenes/conflictos no guardan operaciones. P1 sustituye las dos maquetas MNT.
- Revisión: `tests/visual/ux-review.routes.ts`, `tests/visual/walkthroughs/maintenance.ts`, `scripts/ux-walkthroughs/run.ts`, `package.json`, `tsconfig.review.json`, `.gitignore` y `.github/workflows/ui-quality.yml`.
- Doce guiones de lector listos para ejecución humana; instrucciones para requerir ui-quality en GitHub. No se afirma que la protección se haya activado.

Inventario conjunto exacto: [archivos](../qa/phase-7/changed-files.txt). El archivo de prompts, previamente no versionado, se conserva para incluirlo cuando el usuario autorice commit.

## Validación

Los resultados conjuntos P0/P1 se registran en [F7-01](task-f7-01.md). Las pruebas de producción/Preview, personas y autorización están incluidas en la suite unitaria. Los videos identifican explícitamente la simulación; no acreditan offline real.

## Checklist UX

1. Ejecutar `$env:ICE24_DEMO_MODE="1"; pnpm dev:private`; abrir http://localhost:3000/?demo=1.
2. Persona Técnico: abrir `/maintenance/review/UI-TKT-01`, `UI-TKT-02`, `UI-WO-01`, `UI-WO-02`, `UI-WO-03`, `UI-WO-04` y `UI-SYNC-01`; cambiar escenario descargada → fotos pendientes → conflicto → permiso revocado. Confirmar etiquetas de maqueta y acciones sin envío.
3. Cambiar conexión a sin conexión y cuenta a modo lectura. Repetir con Dueño, Solo lectura y Operador ICE24; comprobar alcance de máquinas y denegación.
4. `pnpm storybook` → http://localhost:6006 → Maintenance → matrices. `pnpm ux:snapshots` → galería compartida F6, sección Fase 7. `pnpm ux:walkthroughs` → `docs/qa/phase-7/walkthroughs/index.html`.
5. Registrar firma, fecha y comentarios en `docs/qa/phase-7/ux-signoff.md`; ejecutar guiones de lector con QA.

Preguntas para Axel Quevedo Zamudio y Eduardo Ramos:

- ¿Aprueban evidencia de 10 MB, compresión propuesta y firma con nombre + confirmación (F7-D01)?
- ¿Dueño y administrador resuelven conflictos con motivo obligatorio y ambas versiones conservadas (F7-D02)?
- ¿Aprueban 72 h de descarga/bloqueo y cuotas de 50 MB por orden / 250 MB por dispositivo (F7-D03)?
- ¿Aprueban la matriz de revisión/corrección/reapertura/anulación propuesta (F7-D04)?
- ¿Se distinguen claramente maqueta, offline simulado y operación real?
- ¿Aprueban ADR-026 para activar posteriormente Preview protegido, aislado y sin datos reales?

Riesgos y deuda: propuestas sin firma, Preview desactivado, offline real reservado a P6–P11, lector de pantalla pendiente y baselines Linux generadas y verificadas, pendientes de aprobación UX. No se conceden aprobaciones en nombre de Dirección.
