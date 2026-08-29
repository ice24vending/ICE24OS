# Estado de Fase 1 — Monorepo, contratos, calidad y entorno local

Fecha de corte: 25 de agosto de 2026.

## Resultado

| Tarea | Estado                                    | Evidencia principal                      |
| ----- | ----------------------------------------- | ---------------------------------------- |
| F1-01 | Implementada                              | 14 workspaces y lockfile                 |
| F1-02 | Implementada                              | 5 builds y revisión visual responsiva    |
| F1-03 | Implementada                              | 9 paquetes, sin ciclos                   |
| F1-04 | Implementada                              | TypeScript 19/19                         |
| F1-05 | Implementada                              | formatter y lint                         |
| F1-06 | Implementada                              | política versionada                      |
| F1-07 | Implementada                              | contratos Zod/OpenAPI                    |
| F1-08 | Implementada; validación Docker pendiente | Supabase/Compose/runbook                 |
| F1-09 | Implementada; integración pendiente       | 16 unitarias; Testcontainers configurado |
| F1-10 | Implementada; CI remota pendiente         | workflow GitHub Actions                  |
| F1-11 | Implementada                              | 4 plantillas                             |
| F1-12 | Implementada                              | dataset sintético de 2 tenants           |

## Gates ejecutados

- Instalación pnpm desde versiones fijadas: correcta.
- Formatter y lint: correctos.
- TypeScript estricto: 19/19 tareas.
- Límites del workspace: 14 paquetes sin ciclos prohibidos.
- Unitarias: 9 archivos, 22 pruebas.
- Build: 14/14 workspaces, incluidas ambas aplicaciones Next.
- Arranque: API, PWA, portal, worker y PDF worker verificados; health y OpenAPI responden 200.
- Visual: PWA y portal revisados en navegador a 1440×900 y 390×844, sin desbordamiento horizontal y con estructura semántica visible.

## Validaciones pendientes antes de declarar el gate completamente verde

1. Ejecutar Testcontainers y Supabase local con Docker Desktop; esta máquina no tiene runtime de contenedores.
2. Ejecutar el workflow en un pull request y requerir sus checks en `main`.
3. Completar la auditoría formal WCAG 2.2 AA de teclado, contraste y zoom; la revisión visual automatizada de escritorio y móvil ya pasó.

Los pendientes externos de Excel, plantillas, regulación y proveedores no bloquean este esqueleto y no fueron convertidos en datos o reglas ficticias.

## Revalidación antes de Fase 2

El 25/08/2026 se repitieron `pnpm check` y `pnpm build` con resultado correcto. `pnpm test:integration` volvió a detenerse antes de iniciar PostGIS porque no existe runtime Docker; no se sustituyó la dependencia por un mock. La habilidad de navegador permitió completar la evidencia visual responsiva que antes estaba bloqueada por el entorno.
