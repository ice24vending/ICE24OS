# TASK-F1-05 — Calidad local y commits

- Estado: implementada.
- Archivos principales: `eslint.config.mjs`, `prettier.config.mjs`, `.husky`, `commitlint.config.mjs`, `.editorconfig`.
- Criterios cubiertos: formatter, lint sin warnings, pre-commit y validación Conventional Commits.
- Validación: `pnpm format:check` y `pnpm lint` pasan; los documentos heredados quedan excluidos para evitar reescrituras ajenas a la fase.
- Riesgo: hooks locales pueden omitirse deliberadamente; CI repite los gates obligatorios.
- Pendiente manual: confirmar que Husky se instala en un clon nuevo de cada sistema operativo objetivo.
