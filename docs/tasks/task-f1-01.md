# TASK-F1-01 — Monorepo

- Estado: implementada.
- Archivos principales: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, `README.md`.
- Criterios cubiertos: 14 workspaces, versiones exactas, lockfile y scripts raíz reproducibles.
- Validación: `pnpm check:boundaries` valida 14 workspaces sin ciclos; instalación con pnpm 11.19 finaliza correctamente.
- Riesgo/deuda: la telemetría de herramientas debe deshabilitarse en CI productivo si la política de privacidad lo exige.
- Pendiente manual: abrir PR y verificar protecciones de rama.
