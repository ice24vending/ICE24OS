# TASK-F2-11 — Configurar WAF/CDN y perímetro

- Estado: **Implementada; activación comercial pendiente**
- Fecha de corte: 25/08/2026
- Fuentes: `context/TASKS.md`, `context/Implementation_Plan.md`, ADR-015 y ADR-018.

## Entrega

Vercel Firewall con OWASP, bot challenge y rate limit por IP/JA4; headers defensivos en ambas webs.

## Validación

HCL y builds web forman parte de los gates.

## Riesgo o validación manual

La disponibilidad/costo del WAF debe verificarse antes de `ENABLE_EDGE_FIREWALL=true`; CSP con nonce se difiere al shell productivo.

No se utilizaron datos reales, credenciales, valores regulatorios ni una aprobación humana ficticia.
