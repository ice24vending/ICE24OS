# TASK-F1-06 — Versionado

- Estado: implementada.
- Archivos principales: `docs/contracts/versioning.md`, `packages/contracts/src/versioning.ts`, `packages/offline`.
- Criterios cubiertos: versiones independientes para API, envelope/evento, Excel y esquema offline; reglas de compatibilidad y rechazo visible.
- Validación: constantes compiladas y pruebas de contratos pasan.
- Decisiones: `/v1`, envelope 1, Excel 1 reservado y offline 1.
- Riesgo: Excel 1 no define columnas ni reglas; permanece bloqueado hasta obtener muestras anonimizadas y aprobación funcional.
