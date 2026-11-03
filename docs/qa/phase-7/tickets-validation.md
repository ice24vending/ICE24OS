# Validación local de tickets P2 — 02/11/2026

Rama `codex/f7-02-tickets`, desde P0/P1 integrados en PR #61. Publicación solicitada el 03/11/2026; CI comprueba el commit del PR. La validación local no sustituye la firma UX.

| Comando                                       | Resultado                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm check`                                  | 831 pruebas en 113 archivos; formato, lint, tipos y verificaciones del repositorio aprobados |
| `pnpm build`                                  | 14 tareas aprobadas                                                                          |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | 166 pruebas en 20 suites aprobadas; incluye 12 de tickets con PostgreSQL                     |
| `pnpm test:ui -- --workers=6`                 | 1830 pruebas Linux aprobadas en 17.3 minutos, sin fallos ni flaky                            |
| `pnpm ux:snapshots`                           | 1052 capturas; manifiesto sin observaciones ni errores HTTP                                  |
| `pnpm ux:walkthroughs`                        | 4 recorridos verificados, incluido reporte con foto desde el celular                         |

Evidencia en `evidence/`: `20261102-f7-02-check.txt`, `20261102-f7-02-build.txt`, `20261102-f7-02-integration.txt`, `20261102-f7-02-ui-linux.txt`, `20261102-f7-02-gallery.txt` y `20261102-f7-02-walkthroughs.txt`.

La compilación para integración usa `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329`, igual que CI. Sin ese valor CSP bloquea correctamente el almacenamiento simulado. Se corrigieron controles habilitados antes de hidratación y la medición durante su transición de color. Las capturas sostienen la carga simulada 15 s con `ICE24_DEMO_CAPTURE_LOADING=1`; la demo interactiva conserva 2.5 s. No se relajaron umbrales, reglas ni pruebas.

Las baselines se generaron en el contenedor oficial Playwright Linux. Las 108 capturas nuevas y 91 modificadas requieren aprobación UX. Se conservaron las baselines históricas. Las capturas regeneradas por integración de F5/F6 se guardaron en `tmp/f7-02-integration-captures` y se restauraron los originales versionados.

Se inspeccionaron cinco referencias de «Cargando» que contenían la pantalla ya cargada. Se regeneraron las 20 combinaciones de plantillas y las cuatro de actividades programadas; ambas ejecuciones pasaron. Antes de comparar la última referencia corregida se comprobó igualdad byte a byte entre las 1084 baselines del workspace y del contenedor: cero diferencias. Evidencia de regeneración: `20261102-f7-02-loading-baselines.txt` y `20261102-f7-02-scheduled-loading-baselines.txt`.

El recorrido de foto usa dobles explícitos del almacenamiento y la respuesta de creación. La integración valida persistencia, autorización y auditoría reales contra PostgreSQL; ningún recorrido acredita un análisis antivirus externo real. La demo no persiste tickets.

Pendientes humanos: revisión de las capturas y preguntas de [TASK-F7-02](../../tasks/task-f7-02.md), F7-D04, EXC-F6-01 y firma de ADR-026 para habilitar Preview. O-02 (tamaño de chunks de Storybook) permanece como observación heredada fuera del gate.

## Revalidación para publicación — 03/11/2026

Se repitieron los seis comandos antes del commit: 831 pruebas unitarias, 14 tareas de compilación, 166 pruebas de integración, 1830 pruebas Linux (22.6 minutos, sin fallos ni flaky), 1052 capturas sin observaciones ni errores HTTP y cuatro recorridos verificados. Evidencias: `evidence/20261103-f7-02-push-{check,build,integration,ui-linux,gallery,walkthroughs}.txt`.

Node 24.19.0, Docker 29.7.2 y Playwright v1.62.1-noble. Docker requirió reinicio manual; la compilación pasó al repetir un bloqueo transitorio de `next-env.d.ts`. Galería y recorridos se ejecutaron en una copia Linux aislada para conservar el servidor de desarrollo abierto en Windows. Se mantuvieron las reglas y baselines finales; no se incluyeron documentos locales previos de F6 ni artefactos temporales en la selección del commit.
