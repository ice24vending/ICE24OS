# TASK-F3-04 — Alta de cuenta y propietario principal

- Estado: **Implementada; envío remoto pendiente**
- Entrega: endpoint protegido por IA+AAL2, transacción de cuenta/membresía OW/ámbito e invitación privada Supabase.
- Evidencia: `AdminIdentityController`, `SupabaseAdminClient` y migración de Fase 3.
- Validación: denegación por defecto, constraints e idempotencia de identidad por correo.
- Riesgo: reconciliar una invitación remota si la transacción posterior falla.
