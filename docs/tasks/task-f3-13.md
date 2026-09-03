# TASK-F3-13 — Aislamiento multiempresa

- Estado: **Implementada; ejecución local Docker pendiente**
- Entrega: suite negativa con cuentas A/B, activación cruzada rechazada y RLS en todas las tablas Phase 3.
- Evidencia: `supabase/tests/database/phase3_identity_test.sql` y pruebas del paquete de autorización.
- Validación: CI ejecuta reset, lint y pgTAP; esta máquina aún no dispone de runtime Docker.
- Riesgo: ampliar con objetos de negocio conforme aparezcan.
