# TASK-F1-03 — Paquetes compartidos

- Estado: implementada.
- Archivos principales: `packages/contracts`, `ui`, `domain`, `authorization`, `database`, `offline`, `config`, `observability`, `testing`.
- Criterios cubiertos: límites explícitos, exports ESM tipados, dominio sin framework, contratos sin ORM y autorización denegada por defecto.
- Validación: validador de grafo sin ciclos; pruebas positivas y negativas de cuenta, acción y sucursal; TypeScript estricto pasa.
- Seguridad/aislamiento: existe prueba negativa entre dos cuentas; ninguna entidad Prisma se expone como DTO.
- Deuda: las políticas de autorización específicas se incorporan en sus fases de dominio aprobadas.
