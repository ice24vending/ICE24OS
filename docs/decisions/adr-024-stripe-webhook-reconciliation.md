# ADR-024 — Recepción Stripe y reconciliación transaccional

Fecha: 30/09/2026. Estado: implementada para revisión en F5-02.

## Contexto y alcance

El responsable solicita `POST /v1/webhooks/stripe`, cuerpo crudo firmado, persistencia previa a consultar Stripe, deduplicación y reconciliación comercial. Esta entrega no incorpora los endpoints administrativos `202 Job`, la UI ni el scheduler de tareas posteriores.

## Decisión

- Habilitar `rawBody` de Nest en ambos arranques (local y Vercel). El receptor exige `Stripe-Signature`, valida bytes originales, tolerancia temporal del SDK y modo test/live. Límite de aplicación: 1 MiB. No reconstruir el cuerpo desde JSON para validar la firma.
- Confirmar la recepción en `subscriptions.stripe_webhooks` antes de llamadas externas. Conservar bytes, hash SHA-256, evento normalizado con payload original, fecha del proveedor y correlación. PK por evento, restricciones RLS y protección de evidencia contra modificación/borrado.
- Una entrega simultánea se serializa por ID. Un ID con otros bytes devuelve 409. Un evento ya aplicado/ignorado responde 200 sin repetir consulta ni cambios; los fallidos se vuelven a procesar.
- Procesar dentro de la solicitud, sin tareas en memoria posteriores al ACK. Se responde 200 tras confirmar cambios; ante fallo, 503 solicita reentrega y conserva el recibo con error normalizado. La consulta Stripe tiene timeout de 3 segundos por llamada y cero reintentos internos; los reintentos de entrega son durables. La futura infraestructura de jobs podrá consumir estos recibos sin cambiar su identidad.
- Bloquear cuenta/suscripción antes de consultar Stripe y reconciliar su estado actual. Los eventos antiguos no imponen su snapshot histórico; una suscripción retirada no reemplaza la vigente. Validar cliente, metadatos de cuenta, importe, moneda y periodo. Un pago solo concede acceso si la factura pagada contiene una línea que cubre el periodo de suscripción.
- Rechazo: `payment_failed` y READ_ONLY. Pago confirmado: activa/reactiva; `identity.apply_subscription_access` conserva SUSPENDED. La cancelación respeta el periodo ya pagado. Una renovación pendiente no amplía ese periodo ni borra un derecho ya pagado.
- Auditoría de proveedor: `actor_type=STRIPE`, `provider_event_id` único y actor/contexto humanos nulos. `audit.updatedBy` de suscripción puede ser nulo para estas actualizaciones; no atribuirlas al creador de la cuenta.

## Consecuencias y recuperación

Aplicar la migración `20260929000200_phase5_stripe_webhooks.sql` antes del binario. Eventos originales y auditoría son inmutables; estado de procesamiento/intentos es mutable. Los fallos de auditoría revierten suscripción y acceso juntos; el recibo original permanece.

La recuperación operativa utiliza reentrega firmada desde Stripe, también para fallos transitorios de consulta. No se añaden webhooks sin autenticación ni endpoints de reactivación desde el navegador. La activación Stripe test/staging, CI remota y políticas DEC-008/DEC-017 siguen pendientes.

El rollback debe usar un binario compatible con `audit.updatedBy=null` y conservar tablas/evidencia. Volver a un lector anterior que exija actor humano rompería las consultas; no rellenar actores ficticios para evitarlo.

Fuentes técnicas: [webhooks de Stripe](https://docs.stripe.com/webhooks), tipos del SDK `stripe@22.6.2` fijado y contratos del repositorio.
