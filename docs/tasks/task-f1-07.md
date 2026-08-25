# TASK-F1-07 — Contratos iniciales

- Estado: implementada.
- Archivos principales: `packages/contracts/src`, `docs/contracts/initial-contracts.md`, API health.
- Criterios cubiertos: errores, cursor, actor/contexto, idempotencia, concurrencia/ETag, eventos y salud, todos validados con Zod y sin ORM.
- Validación: pruebas de límites, error desconocido y versión negativa; build y TypeScript pasan; OpenAPI responde HTTP 200.
- Seguridad: el contrato de contexto no constituye autorización; `@ice24/authorization` verifica la membresía por separado.
- Deuda: agregar snapshots de OpenAPI cuando aparezca el primer módulo privado.
