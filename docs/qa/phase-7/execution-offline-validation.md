# Validación P4/P5/P6 — ejecución, revisión y base offline

04/11/2026. Trabajo local en `codex/f7-p4-p5-p6`; sin commit, push ni merge. Los cambios previos ajenos a estas tareas se conservan.

## Validación inicial (04/11/2026)

- `pnpm check`: 967 pruebas en 123 archivos; formato, lint, tipos, límites entre módulos, 88 pares de contraste y catálogo de 53 componentes correctos.
- `pnpm build`: 14 tareas correctas.
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: 191 pruebas en 21 suites correctas. Incluye 24 casos de órdenes: cierre, archivos/versiones, responsable, aislamiento, corrección conservando original, anulación idempotente y rollback de auditoría.
- `pnpm test:ui:update`: 2158 pruebas Linux correctas (40,1 min). Después de los últimos ajustes de interactividad, estilos y límites de carga, actualización focal de las tres vistas: 132 pruebas correctas.
- `pnpm test:ui -- --grep 'execution|gated shell|Ejecutar orden|Revisar cierre|Revisar y corregir|Evidencia|SyncStatus'`: 266 pruebas correctas (5,2 min), sin fallos ni reintentos fallidos. Esta comparación final es focal; no se declara una segunda comparación completa de 2158 casos. Se retiraron 48 baselines de las maquetas reemplazadas.
- `pnpm ux:snapshots`: 1224 capturas, sin observaciones. Se corrigieron los límites de carga de Ejecución/Cierre/Revisión y la edición antes de hidratar React; no se relajaron las aserciones.
- `pnpm ux:walkthroughs`: 7 recorridos verificados, incluidos ejecución/cierre con fotos y firma y corrección de lectura. [Galería](../phase-6/ux-review/index.html) y [videos](walkthroughs/index.html), artefactos generados e ignorados por Git.
- Storybook compilado. Conserva las advertencias de Rolldown sobre directivas de cliente y tamaño de paquetes (O-02); no se presenta el bloque Push como aprobado ni se publica nada.

## Decisiones y límites

Reapertura aprobada por el usuario el 04/11/2026 e implementada según ADR-028; validación adicional registrada al final de este documento. ADR-027 y los límites F7-D01/D03 continúan como propuestas. El shell offline está desactivado por defecto. Las pruebas de navegador usan servicios simulados de archivos y comandos; PostgreSQL verifica el dominio real. El usuario aprobó la claridad de los requisitos de cierre en móvil (UI-WO-03); las demás aprobaciones visuales y recorridos con lector siguen pendientes. La consulta del historial devuelve las últimas 100 revisiones; las anteriores permanecen conservadas en PostgreSQL.

## Revisión manual

En demo, Técnico → orden OT-000004 → Consultar ejecución. Completar checklist, lectura, lote, firma y fotos, consultar su verificación y guardar borrador. Revisar cierre y sus enlaces. Dueño → OT-000005 → Revisar y corregir: motivo, comparación y registro. En Storybook revisar Dominio/Evidencia y SyncStatus, incluyendo almacenamiento lleno/no disponible. Un error nunca debe verse como guardado.

## Ampliación aprobada: reapertura — 04/11/2026

El usuario aprobó la regla de reapertura y la claridad de los requisitos de cierre en móvil. La primera queda registrada en ADR-028 y AppFlow §15; la segunda, con alcance parcial, en `ux-signoff.md`.

- Calidad: `pnpm check`, 979 pruebas en 123 archivos, tipos/lint/formato y verificaciones de arquitectura correctos.
- Compilación: `pnpm build`, 14 tareas correctas.
- Integración: `ICE24_BROWSER_TESTS=1 pnpm test:integration`, 197 pruebas en 21 suites. Incluye 30 casos de órdenes: todos los estados reabribles, roles, cuentas, motivo, versión esperada, idempotencia, historial inmutable, guardado nuevo antes del siguiente cierre y rollback si falla la auditoría.
- Baselines: 212 pruebas correctas para las vistas afectadas y los estados de carga. Se corrigió la simulación lenta de `me/contexts`, que bloqueaba el shell antes de mostrar la carga de la página. La comprobación visual exige que el estado de carga continúe visible tras preparar estilos y fuentes; no se relajaron umbrales.
- `pnpm ux:snapshots`: 1224 capturas, sin observaciones.
- `pnpm ux:walkthroughs`: 8 recorridos verificados, incluida la reapertura con motivo e historial conservado.
- Comparación Linux completa (05/11/2026): `pnpm test:ui -- --workers=6`, 2162 pruebas correctas en 15,3 minutos, salida 0. Incluye accesibilidad, recorridos funcionales y comparación visual en los cuatro tamaños. Esta ejecución completa reemplaza la ejecución interrumpida del 04/11.

No se ha hecho commit, push ni despliegue. La base offline sigue desactivada por defecto y sus decisiones no quedan aprobadas por estas respuestas del usuario.
