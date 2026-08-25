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

## Superficies

- `apps/private-web`: PWA privada y BFF futuro.
- `apps/public-portal`: portal público aislado.
- `apps/api`: API REST NestJS bajo `/v1`.
- `apps/worker`: procesos asíncronos generales.
- `apps/pdf-worker`: proceso aislado para PDF.

Las reglas obligatorias del proyecto están en [`context/PROJECT_RULES.md`](context/PROJECT_RULES.md).
