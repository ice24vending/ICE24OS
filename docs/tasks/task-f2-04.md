# TASK-F2-04 — Configurar almacenamiento de objetos privado

- Estado: **Implementada; prueba remota pendiente**
- Fecha de corte: 25/08/2026
- Fuentes: `context/TASKS.md`, `context/Implementation_Plan.md`, ADR-015 y ADR-018.

## Entrega

Buckets privados separados para cuarentena, originales, derivados y exportaciones; límites MIME/tamaño y clases de retención.

## Validación

Validador verifica migración y contrato; políticas RLS niegan acceso cliente por defecto.

## Riesgo o validación manual

Ciclo de eliminación automática de originales queda prohibido hasta dictamen legal; restauración de objetos requiere cuenta de prueba.

No se utilizaron datos reales, credenciales, valores regulatorios ni una aprobación humana ficticia.
