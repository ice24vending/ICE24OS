# Threat model — Módulo o flujo

## Alcance y activos

Actores, datos, superficies y dependencias externas.

## Límites de confianza y flujo

Contextos de cuenta, autenticación, autorización, persistencia y publicación.

## Amenazas

| Amenaza | Impacto | Control preventivo | Detección | Prueba | Riesgo residual |
| ------- | ------- | ------------------ | --------- | ------ | --------------- |

## Casos obligatorios

- acceso cruzado/IDOR;
- elevación de permisos;
- reintento, replay e idempotencia;
- datos en logs, caché, archivos y URLs;
- revocación de sesión y limpieza offline;
- degradación de proveedor.

## Aprobaciones y revisión

Responsables, fecha y condición que obliga a revisar el modelo.
