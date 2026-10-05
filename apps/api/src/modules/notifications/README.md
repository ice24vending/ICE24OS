# Notificaciones

Módulo de plataforma para F5-11. Application deriva el destinatario (usuario autenticado) y la cuenta del contexto activo y valida cuerpos e `Idempotency-Key`; Infrastructure lee `notifications.*` con proyección explícita y cambia estados sólo mediante `notifications.transition`; Interface publica NOT-001 a NOT-006 y el resumen del badge.

- Las alertas las crea el worker (`apps/worker/src/processors/notifications`) desde eventos de dominio; la API no crea alertas.
- Leer no marca enterado; enterado no resuelve; resolver exige la condición vinculada cerrada (`RELATED_CONDITION_NOT_RESOLVED`).
- Transiciones permitidas en modo solo lectura (`AllowReadOnlyOperation("notification-attention")`): sólo cambian el estado propio del aviso.
- Errores ApiError: 400 validación, 403 permiso, 404 aviso ajeno, 409 `STATE_TRANSITION_INVALID`, `RELATED_CONDITION_NOT_RESOLVED` o `IDEMPOTENCY_CONFLICT`.

F5-12 agrega el webhook firmado `POST /api/v1/webhooks/email` (entrega y rebote; sin sesión, firma verificada por el puerto `EmailWebhookVerifier`, 503 sin proveedor aprobado) y `emailDelivery` en la proyección de avisos. El envío lo hace el worker (`apps/worker/src/processors/notifications`); la API no envía correo.

Diseño en [docs/modules/notifications.md](../../../../../docs/modules/notifications.md), operación en [docs/runbooks/notifications.md](../../../../../docs/runbooks/notifications.md) y reportes [task-f5-11](../../../../../docs/tasks/task-f5-11.md) y [task-f5-12](../../../../../docs/tasks/task-f5-12.md); correo en [docs/runbooks/email.md](../../../../../docs/runbooks/email.md).
