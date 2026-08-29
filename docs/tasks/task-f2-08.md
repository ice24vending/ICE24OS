# TASK-F2-08 — Configurar logs, métricas y trazas OpenTelemetry

- Estado: **Implementada; backend remoto pendiente**
- Fecha de corte: 25/08/2026
- Fuentes: `context/TASKS.md`, `context/Implementation_Plan.md`, ADR-015 y ADR-018.

## Entrega

Logs JSON redactados, OTLP/HTTP para trazas y métricas, propagación W3C, correlación API y dashboard portable.

## Validación

Pruebas unitarias cubren redacción, modo no-op y health; TypeScript estricto pasa.

## Riesgo o validación manual

Debe seleccionarse/configurarse un backend OTLP dentro del presupuesto antes de activar exportación.

No se utilizaron datos reales, credenciales, valores regulatorios ni una aprobación humana ficticia.
