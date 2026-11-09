# Contrato de transporte P7–P9

Contratos ejecutables: `packages/contracts/src/private/maintenance/offline.ts`. OpenAPI expone el tag `synchronization`. Autenticación y contexto usan las mismas guardas de órdenes; el BFF añade sesión, origen, CSRF y contexto del navegador. Respuestas `Cache-Control: no-store`.

| Ruta API                                       | Permiso                      | Cuerpo                                                    | Resultado                                                          |
| ---------------------------------------------- | ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| POST `/v1/synchronization/orders/:id/download` | Ejecutar, técnico asignado   | `{deviceId}`                                              | Paquete autorizado con orden/definición congelada, lease y versión |
| POST `/v1/synchronization/orders/:id/release`  | Asignar dentro del ámbito    | `{reason}`                                                | Orden; lease liberado y auditoría atómica                          |
| POST `/v1/synchronization/operations`          | Ejecutar, asignación vigente | Operación con id, lease, dispositivo, versión y ejecución | Unión discriminada por `status`                                    |

Todas las mutaciones requieren `Idempotency-Key` e `If-Match`. En sincronización, el encabezado de idempotencia coincide con `id`, y la versión del encabezado con `expectedVersion`. El cliente conserva ambos en reintentos. `download` conserva el recibo original, pero solo permite recuperarlo mientras siga vigente el lease.

Ejemplo de guardado de borrador (UUIDs ficticios):

```http
POST /v1/synchronization/operations
Idempotency-Key: 10000000-0000-4000-8000-000000000001
If-Match: W/"7"
Content-Type: application/json
```

```json
{
  "id": "10000000-0000-4000-8000-000000000001",
  "orderId": "10000000-0000-4000-8000-000000000002",
  "leaseId": "10000000-0000-4000-8000-000000000003",
  "deviceId": "10000000-0000-4000-8000-000000000004",
  "expectedVersion": 7,
  "action": "save",
  "execution": {
    "checklist": ["ISOLATE"],
    "fields": {},
    "diagnosis": "Filtro obstruido",
    "activitiesPerformed": "Inspección inicial",
    "parts": [],
    "tests": "",
    "recommendation": "",
    "evidence": [],
    "result": "conforming",
    "followup": ""
  }
}
```

`accepted` incluye la orden y su nueva versión. `retryable_error` indica fallo transitorio; `permanent_error` indica datos o permisos no admitidos; `conflict` indica cambio de versión, liberación o vencimiento. Las guardas también pueden devolver 401/403, y una dependencia caída puede devolver 503: el cliente contempla ambos niveles. No interpretar la mera respuesta HTTP como cierre confirmado sin validar `status`.

Para `close`, el servidor deriva requisitos de la definición congelada y verifica cada versión privada de archivo: cuenta, máquina, tipo, tamaño, integridad y antivirus. La cola sustituye las referencias locales solo después de recibir las versiones verificadas. No se aceptan indicadores del cliente para saltar estas comprobaciones.

Los borradores del editor móvil se guardan inmediatamente en el dispositivo; el cierre encola la ejecución completa y sus dependencias. No se anuncia que un borrador local ya exista en el servidor. El contrato permite `save` para consumidores que mantengan la versión devuelta entre operaciones.

Estas rutas concretan el transporte por orden de esta entrega. La fachada general de paquetes/job y lotes OFF-001–005 descrita en `context/API.md` no se presenta como implementada ni compatible automáticamente con estos comandos.

## Extensión P10/P11

| Ruta                                             | Autorización                                     | Resultado                                                                                         |
| ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| GET `/v1/synchronization/access`                 | Lectura de órdenes en el contexto vigente        | Cuenta, usuario, reloj del servidor e IDs de descargas propias todavía autorizadas                |
| GET `/v1/synchronization/conflicts`              | Lectura de órdenes en el contexto vigente        | Originales inmutables, versión actual del servidor y capacidad de resolución                      |
| POST `/v1/synchronization/conflicts/:id/resolve` | Revisión, Dueño/Administrador del ámbito         | Nueva versión y auditoría; exige `If-Match`, `Idempotency-Key`, estrategia, motivo y confirmación |
| POST `/v1/synchronization/purge-receipts`        | Identidad firmada válida; solo descargas propias | Recibo idempotente de pérdida, sin devolver contenido de órdenes                                  |

La respuesta `conflict` incluye `conflictId` cuando se conserva una discrepancia de versión o lease. Repetir la operación devuelve el mismo conflicto. Resolver admite `server`, `local` o `combine`; esta última exige origen explícito para todos los campos del contrato. La versión actual debe coincidir con la revisada al confirmar. Los originales y sus referencias de evidencia no se sobrescriben.

Los GET no requieren encabezados de mutación. El recibo de limpieza usa su propio `id` y no requiere permiso vigente de ejecución: una identidad desactivada puede informar de su propia limpieza, pero no consultar ni modificar órdenes. El cliente elimina contenido y llaves incluso si no puede entregar el recibo; conserva únicamente IDs opacos y motivo para reintentar con la misma identidad. Sin conexión no puede conocer una revocación remota, por lo que aplica la vigencia local hasta verificar acceso.
