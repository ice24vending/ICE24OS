# TASK-F0-06 — Stack y runner unitario

## Resultado

Lista para adopción. [ADR-016](../decisions/adr-016-stack.md) confirma el stack y elige Vitest; fija Node.js 24 LTS y política de upgrades/seguridad.

## Cambios y trazabilidad

Archivos: ADR, índice y estado. Traza TRD 18–20 y Project Rules 5. Jest y Node 26 Current se descartaron con motivo.

## Validación y pendientes

Node 24 LTS y capacidades de Vitest se contrastaron con documentación oficial. Fase 1 fijará versiones exactas y ejecutará compatibilidad Next/Nest/Prisma antes del lockfile. No se añadieron dependencias todavía.
