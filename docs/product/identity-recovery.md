# Runbook inicial de recuperación de identidad

Estado: propuesta; antes de producción se nombran operadores y se define evidencia admisible con Jurídico/Seguridad.

## Recuperación normal

1. Usuario solicita recuperación sin que la pantalla confirme existencia de cuenta.
2. Supabase Auth envía un enlace de un solo uso al correo verificado.
3. Usuario cambia contraseña y completa TOTP si aplica.
4. Se revocan sesiones anteriores y se registra evento de seguridad.

## Pérdida de correo o segundo factor

1. Soporte abre caso `INC` sin pedir contraseña, código TOTP ni recuperación completos.
2. Operador A verifica evidencia aprobada y relación activa; no modifica credenciales.
3. Operador B revisa independientemente y aprueba/rechaza.
4. ICE24 Admin inicia una recuperación administrativa controlada mediante Supabase Auth, revoca sesiones globales y contextuales y exige nueva contraseña y configuración TOTP.
5. Notificar por canales previamente registrados cuando sea seguro.
6. Auditoría contiene actores, motivo, evidencia referenciada, tiempos y resultado; la evidencia sensible no va en logs.

## Evidencia por aprobar

- Identificación y videollamada sólo si Jurídico las autoriza y define tratamiento/retención.
- Confirmación por contacto corporativo registrado y responsable de cuenta.
- Datos históricos no secretos como apoyo, nunca como único factor.

SLA propuesto: atención P1, acuse <= 1 hora en horario de soporte; no se promete recuperación hasta completar verificación. Emergencias que impliquen posible toma de cuenta se tratan como incidente de seguridad P0/P1.

Prohibido: contraseña enviada por chat/correo, cuenta compartida, autoaprobación, desactivar 2FA sin revocar sesiones, revelar si un correo existe, copiar identificación a tickets no restringidos.

Fuentes: TRD 34–36; PRD preguntas 8–9; ADR-017.
