# ADR-023 — Sesiones Stripe y contratación desde demo

Fecha: 29/09/2026. Estado: implementada para revisión en F5-02.

## Contexto

El responsable solicita implementar `/v1/subscription/checkout` y `/v1/subscription/portal`, autorización de propietario y conservación de cuentas productivas al contratar desde demos. El contrato previo nombraba rutas de sesiones todavía no implementadas y suponía una fecha de expiración del Portal que Stripe no expone.

## Decisión

- Usar las rutas solicitadas y actualizar API/OpenAPI en el mismo paquete.
- Responder `{url,expiresAt,accountId}`. Checkout aporta su expiración real; Portal devuelve `null`. No se inventa un plazo del proveedor. El cliente solicita una sesión nueva con otra clave en cada nueva visita.
- La recuperación del pago es una operación de facturación permitida en READ_ONLY para un propietario activo con permiso de lectura de suscripción y ámbito de cuenta. No cambia permisos de escritura operativa. SUSPENDED y denegaciones explícitas se respetan, también en respuestas idempotentes.
- Crear la cuenta productiva limpia, vínculo demo→producción y reserva de Checkout en una transacción previa a Stripe. Conservarlos incluso ante fallo del proveedor. No copiar equipos, solicitudes ni historial ficticio. Reutilizar el vínculo y verificar permisos del propietario también en destino.
- Serializar Checkout por cuenta, conservar respuesta mientras la sesión esté vigente y reutilizar clave remota tras fallos. Las reservas sin resultado de más de 23 horas requieren reconciliación operativa para no superar silenciosamente la ventana de idempotencia del proveedor. No eliminar reservas inciertas ni iniciar otra contratación a ciegas.
- Inicializar SDK de manera diferida: sin configuración, estos endpoints responden 503 y el resto de la API sigue disponible.

## Consecuencias

Se añade una migración de reservas protegida por RLS y permisos de servidor. El estado productivo permanece pendiente de activación hasta recibir confirmación reconciliada en la fase de webhooks. Una cuenta productiva puede existir aunque el propietario abandone Checkout; su retención no se resuelve con borrado automático.

La llamada al proveedor se ejecuta bajo el bloqueo transaccional de la cuenta objetivo para evitar sesiones simultáneas; los timeouts/reintentos del SDK acotan esa espera. Revisar carga y latencia antes de promoción. Cancelación/reversión/reconciliación HTTP `202 Job` siguen pendientes.
