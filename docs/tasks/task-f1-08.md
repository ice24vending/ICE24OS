# TASK-F1-08 — Dependencias locales

- Estado: implementada; arranque con Docker pendiente en esta máquina.
- Archivos principales: `supabase/config.toml`, migración PostGIS, `docker-compose.yml`, `infra/containers`, runbook local.
- Criterios cubiertos: Supabase local fijado, PostGIS 17/3.5, WireMock, puertos, healthcheck, configuración sin secretos por defecto y recuperación documentada.
- Validación: Supabase CLI queda fijado en lockfile; Testcontainers intentó iniciar y reportó ausencia de runtime de contenedores.
- Seguridad: Auth local deshabilita signup; mocks sólo escuchan en loopback; `.env` no se versiona.
- Pendiente manual: instalar/activar Docker Desktop y ejecutar `pnpm local:infra`, `pnpm local:mocks` y `pnpm test:integration`.
