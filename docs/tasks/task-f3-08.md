# TASK-F3-08 — Guards y políticas API/BFF

- Estado: **Implementada**
- Entrega: validación OIDC RS256 por discovery/JWKS y guard de autorización que niega endpoints sin política.
- Evidencia: `apps/api/src/common/security` y `apps/api/src/common/authorization`.
- Validación: typecheck, lint y prueba de resolución no filtrante.
- Riesgo: ejecutar pentest y probar rotación JWKS real.
