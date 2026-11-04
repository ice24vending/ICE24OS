# Validación P3 — Órdenes y estados

03/11/2026. Rama `feat/f7-03-04-work-orders-state-machine`, desde `origin/main` con P2 integrado en PR #62. Validación local; no acredita CI ni firma humana. Sin commit, push ni migraciones remotas.

| Comando                                       | Resultado                                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                  | 938 pruebas en 119 archivos; formato, lint sin warnings, tipos y comprobaciones del repositorio aprobados |
| `pnpm build`                                  | 14 tareas aprobadas                                                                                       |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | 181 pruebas en 21 suites aprobadas, con PostgreSQL y navegador                                            |
| `pnpm test:ui -- --workers=6`                 | 2034 pruebas aprobadas en 19.5m, sin fallos ni flaky                                                      |
| `pnpm ux:snapshots`                           | 1164 capturas; manifiesto con cero observaciones y cero errores HTTP                                      |
| `pnpm ux:walkthroughs`                        | 5 recorridos verificados, incluido «Del ticket a la orden asignada — servicios simulados»                 |

Node 24.19.0 y contenedor oficial `mcr.microsoft.com/playwright:v1.62.1-noble`. Galería y recorridos se ejecutaron en una copia Linux aislada. La compilación de integración usa `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329`, como CI. No se relajaron reglas ni umbrales.

La suite PostgreSQL cubre asignación, ámbito, versiones, replay, rollback de auditoría, snapshots, técnico activo y recálculo de actividades asignadas. Las pruebas de navegador usan un doble explícito de la respuesta de asignación; la persistencia real se acredita con PostgreSQL.

Cobertura añadida: 82 pruebas de tabla/guardas de estados, una de diagrama/contrato, tres de contratos, 21 de BFF/autorización/demo, 14 de integración de órdenes, una regresión de recálculo y ocho flujos E2E de órdenes. La tabla Mermaid se verifica contra el código.

## Hallazgos corregidos durante validación

- El worker consultaba una columna de responsable inexistente en los esquemas antiguos de F4. La lectura compatible mediante `to_jsonb` conserva esos escenarios y congela actividades asignadas en F7. Las 181 pruebas de integración pasaron después de la corrección.
- La prueba heredada de recuperación de suscripción comprobaba el botón de carga antes de la hidratación. Ahora espera el estado listo existente y mantiene la misma aserción y límite de tiempo.
- Las historias de órdenes importaban la API demo y arrastraban `node:crypto` al navegador. Usan fixtures puros; las tres historias renderizan y pasan axe.
- Se corrigieron etiquetas de navegación en inglés e identificadores internos visibles. Se inspeccionaron capturas de asignación móvil, detalle técnico y carga en escritorio.
- Una pasada de regeneración detectó mediciones de tamaño táctil antes de cargar CSS. La revisión del estado de carga espera hojas de estilo y fuentes, conservando el esqueleto visible. La primera pasada completa obtuvo 2027 aprobadas y siete fallos de Storybook; la regeneración posterior cubrió 259 pruebas con una intermitencia de carga. La comparación final aprobó las 2034 pruebas sin fallos ni flaky, incluida esa pantalla de carga.
- La primera galería agotó el tiempo de navegación al cargar Auditoría; la repetición final produjo las 1164 capturas sin observaciones, conservando los límites existentes.

## Baselines y conservación del workspace

1212 baselines en el workspace: 128 nuevas y 92 modificadas requieren aprobación UX. Se conservaron las referencias históricas. Antes de comparar se comprobó igualdad byte a byte con el contenedor: SHA-256 agregado `bec3dad63fda74e79019503b60b617dc881aa759137f29fdfcf6386b171f38bc`. El helper de revisión también coincide.

Las 22 capturas históricas regeneradas por integración se conservaron en `tmp/f7-03-integration-captures`; sus originales versionados se restauraron. Se conservaron los cambios locales anteriores de F6, `.tmp/` y `next-env.d.ts`. No forman parte del inventario P3. Los videos, galería generada y temporales permanecen fuera del código versionado.

La observación heredada O-02 sobre chunks de Storybook y sus avisos de directivas de cliente permanecen fuera del gate según el cierre F6. No hay warnings de ESLint.

Revisión UX y decisiones F7-D04/F7-D07 pendientes. Preview desactivado (ADR-026); EXC-F6-01 continúa vigente.

Ver [F7-03 y checklist UX](../../tasks/task-f7-03.md), [F7-04](../../tasks/task-f7-04.md) y [trazabilidad](traceability.md).

Evidencia reproducible: `evidence/20261103-f7-03-{check,build,integration,ui-update-first,ui-update-orders,ui-linux,gallery,storybook-fix,walkthroughs}.txt`. [Inventario de archivos P3](evidence/20261103-f7-03-files.txt).

La repetición del gate para publicar P3 junto con las mejoras UI posteriores se registra en el [reporte de publicación](publication-f7-03-04.md). Los conteos anteriores corresponden al alcance original de implementación.
