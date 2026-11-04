# Publicación P3 y correcciones de experiencia operativa

03/11/2026 · rama `feat/f7-03-04-work-orders-state-machine` · base `791f471` (P2, PR #62).

## Alcance

Órdenes desde tickets y actividades, asignación autorizada, definición congelada, idempotencia, auditoría y máquina de estados F7-03/F7-04. Incluye las correcciones solicitadas de contraste, jerarquía de botones, iconos, calendario mensual/semanal/diario, expediente de máquinas y navegación Ticket → Orden.

El expediente recibe foco y desplazamiento al seleccionarlo; respeta movimiento reducido. Los filtros de órdenes conservan su combinación en URL y el enlace al ticket verifica la relación antes de mostrar el regreso a la orden. «Reportar una falla» usa botón secundario, icono de advertencia y separación respecto a las pestañas.

Durante el gate de publicación se detectó que un selector podía recibir cambios antes de conectar los manejadores de React. Los filtros y su botón permanecen deshabilitados hasta completar la hidratación; el formulario expone `aria-busy`. No se relajaron aserciones, umbrales ni tiempos de espera.

## Validación de publicación

| Comando                                       | Resultado final                                                                                      | Evidencia                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `pnpm check`                                  | Aprobado: 943 pruebas, 120 archivos; 88 pares de contraste y 49 componentes; cero warnings de ESLint | [check](evidence/20261103-f7-03-push-check.txt)             |
| `pnpm build`                                  | 14 tareas aprobadas                                                                                  | [build](evidence/20261103-f7-03-push-build.txt)             |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | 181 pruebas, 21 archivos aprobados                                                                   | [integración](evidence/20261103-f7-03-push-integration.txt) |
| `pnpm test:ui -- --workers=8`                 | Linux: 2078 pruebas aprobadas, cero fallos y flaky                                                   | [Linux](evidence/20261103-f7-03-push-linux.txt)             |
| `pnpm ux:snapshots`                           | Linux: 1184 capturas; manifiesto sin problemas ni respuestas HTTP >=400                              | [galería](evidence/20261103-f7-03-push-gallery.txt)         |
| `pnpm ux:walkthroughs`                        | Linux: cinco recorridos verificados                                                                  | [recorridos](evidence/20261103-f7-03-push-walkthroughs.txt) |

La primera integración coincidió con la regeneración del build y Next.js no encontró el build de producción. Se descartó ese resultado y se ejecutó de nuevo después del build completo: 181/181 aprobadas. La suite final de Linux se ejecutó después de corregir la hidratación de filtros. La copia aislada de la galería no incluye Git; su manifiesto indica «sin git» y corresponde al workspace de esta entrega.

CI se verificará en el PR; estos resultados no atribuyen aprobación remota ni humana. Los resultados históricos de implementación permanecen en [validación P3](work-orders-validation.md), [auditoría UI](ui-ux-audit.md) y [navegación](machine-order-navigation.md).

## Conservación y límites

La integración regenera 22 capturas históricas de F5/F6: se conservaron en `tmp/push-p3-integration-captures` y se restauraron los originales versionados. Los cambios locales previos de documentación F6, `next-env.d.ts` y `.tmp/` quedan fuera del commit. Galería generada, videos, informes de Playwright y temporales no se versionan.

O-02 (avisos heredados de chunks/directivas de Storybook) continúa fuera del gate conforme al cierre F6; ESLint exige cero warnings. EXC-F6-01 y decisiones F7-D04/F7-D07 siguen pendientes. Las baselines requieren revisión UX antes del merge; las pruebas automáticas no acreditan aprobación humana. No se aplicaron migraciones remotas.

Para Dirección: artefactos `ux-review-gallery`, `ux-walkthroughs`, `storybook-static` y `playwright-report` del check UI quality; checklist en [F7-03](../../tasks/task-f7-03.md). Preview desactivado por ADR-026. Esta publicación no autoriza merge.
