# Catálogo de formatos Excel

Estado: **bloqueado por falta de muestras reales**. No se encontraron `.xlsx`, `.xls`, `.csv` ni `.tsv` en el repositorio. No se inventan columnas ni llaves de deduplicación.

## Matriz de muestras

| ID | Fabricante/modelo | Versión app/firmware | Periodo | Archivo anonimizado | SHA-256 | Filas | Zona | Estado |
|---|---|---|---|---|---|---:|---|---|
| EX-001 | Por recibir | Por recibir | Por recibir | No | — | — | — | Pendiente |
| EX-002 | Por recibir | Por recibir | Por recibir | No | — | — | — | Pendiente |
| EX-003 | Por recibir | Por recibir | Por recibir | No | — | — | — | Pendiente |

## Paquete mínimo solicitado

- Tres archivos por cada combinación modelo/versión: periodo normal, cambio de mes y caso con correcciones/duplicados.
- Exportación original y copia anonimizada; eliminar nombres, teléfonos, direcciones, tokens y datos fiscales.
- Manual de exportación, zona horaria del equipo, versión de software y significado de columnas.
- Confirmación de si existe ID de transacción estable.

## Validación al recibir

1. Guardar muestra sólo en almacenamiento restringido; registrar hash y custodio.
2. Inspeccionar hojas, encabezados, tipos, fórmulas, filas de resumen y codificación.
3. Proponer mapeo a fecha, hora, pago, producto, cantidad, importe, máquina y transacción.
4. Probar llaves candidatas de deduplicación sin asumir que fecha+importe es única.
5. Versionar un adaptador; vista previa y errores por fila antes de confirmar.
6. Obtener aprobación del responsable Comercial/Data y recién entonces crear fixtures sintéticos.

Fuentes: PRD RF-VTA-001–011 y preguntas 62–67; TRD pendiente 14. Consecuencia: Fase 11 y cualquier dato semilla Excel permanecen bloqueados.

