# TASK-F1-04 — TypeScript estricto

- Estado: implementada.
- Archivos principales: `tsconfig.base.json`, `packages/config/tsconfig`, tsconfig por workspace.
- Criterios cubiertos: `strict`, optional exacto, índices sin comprobación, retornos y overrides explícitos, ESM y decoradores Nest aislados.
- Validación: `pnpm typecheck`, 19/19 tareas exitosas.
- Decisión: TypeScript 6.0.3 se fija por compatibilidad declarada con `typescript-eslint`; TypeScript 7.0.2 queda diferido.
- Deuda: reevaluar TypeScript 7 cuando el linter declare soporte.
