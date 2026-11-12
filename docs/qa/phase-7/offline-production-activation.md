# Modo offline: condición de activación productiva

Revisión del código 11/11/2026: **apagado por defecto**, salvo compilación con `NEXT_PUBLIC_ICE24_OFFLINE_SHELL=1`. No se consultaron ni cambiaron variables remotas: esto describe el valor predeterminado del código, no certifica la configuración actualmente desplegada.

| Control                                                             | Evidencia de código                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Registro inicial solo habilita shell con valor exacto 1             | apps/private-web/src/components/service-worker-registration.tsx:8–10     |
| Descarga individual no se renderiza con bandera ausente/0           | apps/private-web/src/features/sync/download-order.tsx:49–54              |
| Descarga de ruta condicionada por la misma bandera                  | apps/private-web/src/features/work-orders/work-orders-screen.tsx:524–526 |
| Worker solo precarga shell cuando query offline=1                   | apps/private-web/public/sw.js:5,14–18                                    |
| Descarga autorizada registra worker habilitado tras guardar paquete | apps/private-web/src/features/sync/download-client.ts:74                 |

La query es del URL del **worker**, no basta añadir `?offline=1` a una pantalla. La bandera controla exposición del flujo, no sustituye autorización servidor ni elimina descargas existentes. No es un interruptor de revocación: un worker/dispositivo previamente habilitado requiere el tratamiento de sesión/borrado vigente.

**Criterio del gate:** CF-01…CF-10 antes de activar el modo sin conexión en producción. Pendiente – responsable: Calixto (ejecución/evidencia); Axel y Eduardo (autorizar activación por mensaje). Antes del gate Calixto debe confirmar la variable efectiva del deployment; si ya vale 1, no aplicar la exención condicional sin revisar el alcance. No hay aprobación de campo implícita.

Activación, solo tras resultados físicos satisfactorios y aprobación por mensaje con captura en evidence/: Calixto configura `NEXT_PUBLIC_ICE24_OFFLINE_SHELL=1` en el entorno productivo del frontend y recompila/despliega (Next incorpora NEXT_PUBLIC en build); verifica flujo Técnico, reserva, descarga, recarga offline y reconexión. Preview/demo usa datos ficticios y su autorización ADR-026 independiente. No se activa durante esta tarea. Para impedir nuevas descargas, retirar bandera y recompilar; no afirmar que esto borra datos o reservas existentes.
