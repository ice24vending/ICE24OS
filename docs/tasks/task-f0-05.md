# TASK-F0-05 — Disponibilidad, RPO, RTO y retención

## Resultado

En revisión. [ADR-018](../decisions/adr-018-continuity.md) define SLI/SLO piloto, RPO 15 min, RTO 4 h y una matriz provisional de retención con legal hold.

## Cambios y trazabilidad

Archivos: ADR, estado e índice. Traza PRD 9.3/9.4/15.7/15.11 y TRD 64/75–77. No implementa borrado ni lifecycle.

## Validación y pendientes

Los objetivos son medibles y separan servicios. Jurídico/Sanidad deben aprobar retenciones; Operación debe costear Multi-AZ y ensayar restauración. Prohibido ejecutar eliminación con esta propuesta sin dictamen.
