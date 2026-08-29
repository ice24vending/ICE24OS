# Estado de Fase 2 — Infraestructura, despliegue y observabilidad base

Fecha de corte: 25 de agosto de 2026.

## Resultado

| Tarea | Implementación versionada | Gate operativo                             |
| ----- | ------------------------- | ------------------------------------------ |
| F2-01 | Terminada                 | Terraform apply pendiente                  |
| F2-02 | Terminada                 | Alta de proyectos pendiente                |
| F2-03 | Terminada                 | Supabase remoto/PITR pendiente             |
| F2-04 | Terminada                 | Prueba remota de objetos pendiente         |
| F2-05 | Terminada                 | Integración PGMQ pendiente de Docker/CI    |
| F2-06 | Terminada                 | Discovery OIDC remoto pendiente            |
| F2-07 | Terminada                 | Custodios y rotación real pendientes       |
| F2-08 | Terminada                 | Backend OTLP pendiente de selección        |
| F2-09 | Terminada                 | Probes de dependencias futuras diferidos   |
| F2-10 | Terminada                 | Primera promoción remota pendiente         |
| F2-11 | Terminada                 | Activación/costo WAF pendiente             |
| F2-12 | Terminada                 | Evidencia de restauración remota pendiente |

## Alcance completado

La implementación reproducible está en el repositorio: cuatro raíces Terraform aisladas, módulos de plataforma, migración Supabase, despliegue Vercel, firewall, contratos de backup, observabilidad OpenTelemetry, health checks, contenedores endurecidos, workflows y runbooks. El interruptor `provision_cloud` permanece apagado en todos los ejemplos y producción exige además `production_approved=true`.

## Validación ejecutada

- `pnpm check`: formato, lint, TypeScript 19/19, límites de 14 workspaces, contratos de infraestructura y 22 pruebas pasan.
- `pnpm build`: 14/14 workspaces pasan.
- `terraform fmt -check` y `terraform validate`: cuatro entornos pasan; queda una advertencia deprecada documentada por desactivar llaves heredadas de Supabase.
- API, worker y PDF worker: liveness/readiness responden 200; la API preserva el correlation ID.
- PWA y portal: revisión visual en escritorio y móvil sin desbordamiento horizontal.
- La suite pgTAP está versionada y conectada a CI; su ejecución local requiere Docker.

## Gate que no puede declararse verde localmente

Las cuatro raíces pasaron `terraform init -backend=false` y `terraform validate` con Terraform 1.11.4; el proveedor de Supabase únicamente reportó la advertencia esperada por desactivar explícitamente sus llaves heredadas. No hay runtime Docker, credenciales, backend de estado ni cuentas Vercel/Supabase disponibles en esta máquina. Por tanto no se afirma que existan recursos remotos, que OIDC responda, que el WAF esté habilitado ni que una restauración administrada haya terminado. Esos pasos cambian estado externo y pueden generar costo; el pipeline exige GitHub Environments protegidos.

## Fase 1 revalidada antes de avanzar

`pnpm check` y `pnpm build` pasaron antes de iniciar esta fase. `pnpm test:integration` confirmó el bloqueo ya registrado: no existe runtime de contenedores. El DOCX no rastreado de Fase 1 fue preservado sin cambios.
