# Pruebas de campo — Fase 7

Guion del 08/11/2026. Ejecutar con datos de prueba y una orden asignada al técnico. No usar órdenes productivas para provocar conflictos. El responsable de QA registra dispositivo, navegador, versión, fecha y evidencia. Ningún resultado de este documento acredita una prueba física todavía. En P13 (08/11/2026), el usuario confirmó explícitamente que aún no las ejecuta; las 10 filas siguen pendientes.

## Condición vigente

CF-01…CF-10 **antes de activar el modo sin conexión en producción**, apagado por defecto en código. No ejecutados; Calixto verifica el entorno efectivo y realiza los casos con Android y Windows. Axel y Eduardo autorizan activación por mensaje después de evidencia satisfactoria. [Código y activación](offline-production-activation.md).

## Preparación

1. Abrir la demo protegida autorizada o el servidor de desarrollo desde un origen seguro HTTPS. Service worker y WebCrypto requieren contexto seguro; una IP HTTP de la red local no basta.
2. Seleccionar Técnico, descargar una orden y abrir «Trabajo en campo» antes de desconectarse.
3. Registrar la orden, cuenta y usuario. La política F7-D03 sigue propuesta: 72 h, 50 MB por orden y 250 MB por dispositivo.

| Escenario                                                              | Dispositivo / navegador | Datos                                 | Resultado        | Defecto | Severidad | Responsable |
| ---------------------------------------------------------------------- | ----------------------- | ------------------------------------- | ---------------- | ------- | --------- | ----------- |
| Modo avión en checklist, diagnóstico, lecturas, lote y firma; recargar | Pendiente               | Orden descargada                      | Pendiente físico | —       | —         | Calixto     |
| Interrumpir red en un lugar seguro y recuperar señal                   | Pendiente               | Dos fotos pendientes y cierre         | Pendiente físico | —       | —         | Calixto     |
| Forzar cierre de la app durante guardado; reabrir sin red              | Pendiente               | Borrador confirmado y cambio en curso | Pendiente físico | —       | —         | Calixto     |
| Batería baja / ahorro de energía; suspensión prolongada                | Pendiente               | Fotos y borrador local                | Pendiente físico | —       | —         | Calixto     |
| Cámara: imagen grande con almacenamiento casi lleno                    | Pendiente               | Fotos antes/después                   | Pendiente físico | —       | —         | Calixto     |
| Dos dispositivos intentan descargar la misma orden                     | Pendiente               | Mismo técnico y cuenta                | Pendiente físico | —       | —         | Calixto     |
| Administrador modifica después de liberar; técnico sincroniza          | Pendiente               | Conflicto con evidencia               | Pendiente físico | —       | —         | Calixto     |
| Revocar acceso o desactivar mientras está sin señal; reconectar        | Pendiente               | Borrador pendiente                    | Pendiente físico | —       | —         | Calixto     |
| Cerrar sesión con pendientes y cancelar; luego confirmar               | Pendiente               | Cola local sin subir                  | Pendiente físico | —       | —         | Calixto     |
| Reloj adelantado y zona horaria distinta                               | Pendiente               | Descarga nueva y fechas locales       | Pendiente físico | —       | —         | Calixto     |

## Qué comprobar

- Guardado confirmado antes de cerrar la app: el último cambio confirmado permanece; una transacción interrumpida nunca deja medio archivo o media operación.
- «Guardado en este dispositivo» no significa recibido por el servidor. Solo después de verificar fotos se confirma el cierre remoto.
- Al comparar, identificar servidor/dispositivo, elegir explícitamente, escribir motivo y confirmar. Ambas versiones originales siguen consultables.
- Revocación: al recuperar conexión desaparecen descargas, borradores, evidencia, operaciones y llaves del ámbito afectado. Un fallo temporal del servicio no equivale a revocación.
- Desconectado no se puede conocer una revocación remota; la vigencia local limita el acceso hasta la siguiente verificación. La auditoría de pérdida requiere identidad verificable y conexión. Si el token ya no sirve, el recibo mínimo espera una nueva sesión del mismo usuario; borrar datos del navegador también borra ese recibo.
- Confirmar una sola actividad/orden/cierre y una resolución auditada. Adjuntar folio y evidencia sin copiar información sensible a los reportes.

Ante pérdida de datos confirmados, exposición tras revocación verificada o duplicación de ejecución: detener aprobación, registrar severidad alta y responsable. EXC-F6-01 y pruebas con lector de pantalla siguen separadas de este guion.

Guion detallado y registro para ejecución humana: [field-test-protocol.md](field-test-protocol.md). Pendiente – responsable: Calixto Isaac Galeana Medrano (QA), usando las personas de prueba indicadas en sesiones separadas. No se sustituye por automatización.

> Organización vigente, 11/11/2026: Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) reúne desarrollo, verificación técnica y QA; no hay áreas separadas de Producto o Seguridad. Las decisiones de negocio corresponden a Axel Quevedo Zamudio y Eduardo Ramos. No se exige firma impresa: aprobación por mensaje, con captura guardada en docs/qa/phase-7/evidence/. Las menciones históricas de responsabilidades se interpretan con esta asignación; no acreditan aprobaciones nuevas.
