# Contratos iniciales

El paquete `@ice24/contracts` contiene esquemas Zod consumibles sin Prisma:

- error normalizado y catálogo inicial de códigos;
- paginación por cursor con límite de 1 a 100;
- actor y contexto de cuenta/sucursal;
- llave y registro de idempotencia;
- versión esperada y ETag débil;
- envelope de eventos con actor, contexto, causalidad y sensibilidad;
- respuesta mínima de salud.

Los contratos externos se validan en runtime. El endpoint inicial `GET /v1/health` está documentado por OpenAPI en `/v1/docs`; no expone estado de dependencias, configuración ni secretos.
