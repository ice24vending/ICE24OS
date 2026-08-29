# TASK-F2-07 — Configurar secretos, cifrado, certificados y rotación

- Estado: **Implementada; alta de secretos pendiente**
- Fecha de corte: 25/08/2026
- Fuentes: `context/TASKS.md`, `context/Implementation_Plan.md`, ADR-015 y ADR-018.

## Entrega

Sólo se versionan nombres; valores llegan desde GitHub Environments y variables protegidas de Supabase/Vercel; rotación 90/180 días.

## Validación

Escaneo existente de gitleaks más chequeo de firmas de secretos en IaC.

## Riesgo o validación manual

Faltan custodios nominales, backend de estado y ceremonia de rotación con cuentas reales.

No se utilizaron datos reales, credenciales, valores regulatorios ni una aprobación humana ficticia.
