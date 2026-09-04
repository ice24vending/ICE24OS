# ICE24 OS

Monorepo fundacional de ICE24 OS. La arquitectura parte de un monolito modular con cinco superficies desplegables y paquetes compartidos con dependencias explícitas.

## Inicio rápido

Requisitos: Node.js 24.19, pnpm 11.19 y Docker Desktop para Supabase/Testcontainers.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

Para levantar servicios locales, consulta [`docs/runbooks/local-development.md`](docs/runbooks/local-development.md). No se deben usar datos reales ni secretos productivos en local.

La infraestructura de Fase 2 está modelada en [`infra/terraform`](infra/terraform/README.md). Todos los ejemplos conservan el aprovisionamiento apagado; los cambios remotos se promueven únicamente mediante ambientes protegidos y el [runbook de despliegue](docs/runbooks/deployment.md).

## Superficies

- `apps/private-web`: PWA privada y BFF de identidad/sesión.
- `apps/public-portal`: portal público aislado.
- `apps/api`: API REST NestJS bajo `/v1`.
- `apps/worker`: procesos asíncronos generales.
- `apps/pdf-worker`: proceso aislado para PDF.

Las reglas obligatorias del proyecto están en [`context/PROJECT_RULES.md`](context/PROJECT_RULES.md).

## Estado

- [Fase 1](docs/backlog/phase-1-status.md): implementación local verde; Docker y CI remota pendientes.
- [Fase 2](docs/backlog/phase-2-status.md): implementación versionada completa; aprovisionamiento, OIDC y restauración remotos pendientes de credenciales y aprobación.
- [Fase 3](docs/backlog/phase-3-status.md): identidad, BFF, multiempresa y autorización implementados; PoC Supabase, Docker y validaciones humanas pendientes.
