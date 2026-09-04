# TASK-F3-02 — Perfil local y enlace con identidad externa

- Estado: **Implementada; enlace remoto pendiente de PoC**
- Entrega: perfil único por `identity_subject`, correo y username normalizados; invitaciones pendientes se enlazan por correo sin duplicar persona.
- Evidencia: migración de Fase 3, contratos de identidad e `IdentityStore.synchronizeIdentity`.
- Validación: constraints únicas, Zod y typecheck.
- Riesgo: probar colisiones y cambios de correo con usuarios reales anonimizados.
