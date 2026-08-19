# ICE24 OS — Especificación completa de API

> **Confidencial.** Información propiedad intelectual de ICE24 MX. Su reproducción total o parcial requiere autorización escrita.

## Control del documento
| Campo | Valor |
| --- | --- |
| Proyecto | ICE24 OS |
| Documento | API Specification |
| Versión | 1.0 |
| Fecha | Agosto de 2026 |
| Estado | Propuesta técnica para validación de producto, arquitectura, backend, frontend y QA |
| Fuentes | ICE24 OS PRD v1.0 e ICE24 OS TRD v1.0 |
| Estilo | REST sobre HTTPS, JSON UTF-8, OpenAPI 3.1 como contrato publicable |
| Idioma de contratos | Inglés para rutas, campos, códigos y eventos; documentación explicativa en español |

## 1. Propósito

Esta especificación traduce los requisitos funcionales y técnicos de ICE24 OS a contratos de API. Define recursos, rutas, métodos HTTP, parámetros, cuerpos, respuestas, errores y ejemplos JSON para la aplicación privada, el portal público, las integraciones y las operaciones internas.

La forma concreta de las rutas es una decisión técnica propuesta. Las capacidades, restricciones, roles, estados y reglas de negocio provienen del PRD y del TRD. Cuando el PRD mantiene una decisión abierta, esta especificación no la cierra silenciosamente; la identifica en la sección **Decisiones abiertas de API**.

## 2. Alcance de la API
| Superficie | Prefijo recomendado | Consumidores | Contenido |
| --- | --- | --- | --- |
| API privada | `/api/v1` | PWA privada, BFF y clientes internos autorizados | Operación de cuentas, equipos, mantenimiento, sanidad, inventario, reportes, ventas, tarjetas, pedidos, reparto, notificaciones, suscripción y auditoría. |
| API pública | `/public/v1` | Portal público y consumidores anónimos | Proyecciones publicadas, documentos públicos protegidos, autenticidad y registro de actividad QR. |
| API de integraciones | `/integrations/v1` | Stripe y otros proveedores autorizados | Webhooks firmados, callbacks y reconciliación controlada. |
| API interna | `/internal/v1` | Workers, scheduler, monitorización y operación técnica | Trabajos, salud, reintentos, proyecciones y acciones no expuestas al navegador. |

No se define una API de control físico de la máquina, una API de facturación fiscal, una API de saldo real de tarjetas ni una API de pago de pedidos, porque estos elementos están fuera del alcance confirmado.

## 3. Principios de diseño
| Principio | Aplicación |
| --- | --- |
| Recursos estables | Sustantivos plurales en inglés y rutas previsibles. |
| Comandos explícitos | Transiciones sensibles usan subrecursos de acción como `/approve`, `/publish`, `/take` o `/complete`; no se cambian estados críticos mediante un `PATCH` arbitrario. |
| Aislamiento multiempresa | Toda operación privada se evalúa contra el contexto activo, la asociación del usuario y el ámbito de cuenta, sucursal, máquina y acción. |
| Trazabilidad | Las mutaciones sensibles producen auditoría y `correlationId`; las correcciones conservan versión anterior y motivo. |
| Idempotencia | Operaciones repetibles por conectividad, webhooks o reintentos exigen `Idempotency-Key`. |
| Concurrencia optimista | Actualizaciones sensibles usan `If-Match`/ETag o `expectedVersion`. |
| Asincronía | PDF, Excel, exportaciones, correo, procesamiento de archivos e indicadores pesados responden con `202 Accepted` y un `Job`. |
| Sin hard delete | Entidades históricas se archivan, anulan, retiran o desactivan. |
| Datos mínimos | Las respuestas no exponen campos sensibles que el actor no esté autorizado a consultar. |
| Proyección pública | El portal público solo consume datos deliberadamente publicados y no consulta entidades privadas directamente. |

## 4. Convenciones HTTP
### 4.1 Headers comunes
| Header | Dirección | Obligatorio | Uso |
| --- | --- | --- | --- |
| `Authorization: Bearer <token>` | Request | Sí en API privada sin BFF; el BFF puede sustituirlo por sesión servidor | Identidad OIDC validada por la API. |
| `Cookie: ice24_session=...` | Request | Sí cuando se utiliza BFF | Sesión `HttpOnly`, `Secure` y `SameSite`. |
| `X-Account-Context` | Request | Sí para recursos dependientes de cuenta | UUID de la cuenta activa. No otorga acceso por sí mismo. |
| `X-Branch-Context` | Request | Condicional | Sucursal activa cuando el flujo requiere contexto explícito. |
| `X-Correlation-ID` | Ambos | Recomendado en request; siempre en response | Seguimiento entre API, colas, workers e integraciones. |
| `Idempotency-Key` | Request | Obligatorio en operaciones marcadas | Clave única por operación lógica. |
| `If-Match` | Request | Obligatorio en actualizaciones sensibles | ETag o versión esperada. |
| `ETag` | Response | En recursos versionados | Versión utilizada para concurrencia optimista. |
| `Accept-Language` | Request | Opcional | Idioma de mensajes; inicialmente `es-MX`. |
| `Content-Type: application/json` | Request | Sí para JSON | Cuerpos estructurados. |

### 4.2 Códigos HTTP
| Código | Uso |
| --- | --- |
| `200 OK` | Consulta o comando síncrono exitoso. |
| `201 Created` | Recurso creado. |
| `202 Accepted` | Trabajo asíncrono aceptado. |
| `204 No Content` | Acción exitosa sin cuerpo. |
| `400 Bad Request` | JSON malformado, parámetro inválido o cabecera requerida ausente. |
| `401 Unauthorized` | Identidad o sesión ausente/inválida. |
| `403 Forbidden` | Identidad válida sin permiso, cuenta en modo lectura o política de datos sensibles. |
| `404 Not Found` | Recurso inexistente o no visible para el contexto. |
| `409 Conflict` | Duplicado, transición inválida, conflicto offline o idempotencia incompatible. |
| `412 Precondition Failed` | ETag o versión esperada no coincide. |
| `413 Payload Too Large` | Archivo o payload excede el límite. |
| `415 Unsupported Media Type` | Tipo de archivo o contenido no permitido. |
| `422 Unprocessable Content` | Validación semántica o regla de negocio incumplida. |
| `429 Too Many Requests` | Límite de tasa superado. |
| `500 Internal Server Error` | Fallo no esperado, sin detalle sensible. |
| `502 Bad Gateway` | Proveedor externo respondió de forma inválida. |
| `503 Service Unavailable` | Dependencia o capacidad temporalmente no disponible. |

### 4.3 Identificadores, fechas y cantidades

- Los IDs internos son UUID y nunca se reutilizan.
- El `machineCode` es el código visible permanente de ICE24 OS y no sustituye la PK interna.
- Las fechas y horas se intercambian en ISO 8601 con zona; la persistencia autoritativa es UTC.
- La zona horaria se expresa como identificador IANA, por ejemplo `America/Mexico_City`.
- El dinero usa enteros en centavos más `currency`, nunca punto flotante.
- Las mediciones usan decimal representado como cadena, unidad catalogada y precisión explícita.
- Los folios son identificadores de negocio visibles, no llaves primarias.

### 4.4 Paginación, filtros y ordenamiento

- Listas de alto crecimiento: cursor opaco mediante `page[cursor]` y `page[size]`.
- Catálogos pequeños: `page[number]` y `page[size]` cuando se documente expresamente.
- Tamaño recomendado por defecto: 25; máximo inicial propuesto: 100.
- Filtros: `filter[field]=value`; solo se admiten campos enumerados por endpoint.
- Orden: `sort=field,-otherField`; `-` indica descendente.
- Inclusiones: `include=relationA,relationB`; solo relaciones permitidas.
- Fechas: `filter[createdFrom]`, `filter[createdTo]`, `filter[occurredFrom]`, `filter[occurredTo]`.

### 4.5 Respuesta de lista
**Ejemplo**
```json
{
  "data": [
    {"id": "0192e8e8-45ad-7b12-8d90-73db122e70e1", "name": "Sucursal Centro"}
  ],
  "page": {
    "nextCursor": "eyJpZCI6IjAxOTJlOGU4LTQ1YWQifQ",
    "hasMore": true,
    "size": 25
  },
  "meta": {
    "correlationId": "5d987788-e3ef-4ab9-9fe8-b8377e845ad3"
  }
}
```

## 5. Autenticación, sesión y autorización

- La autenticación se realiza mediante Supabase Auth, Authorization Code con PKCE y patrón BFF, conforme a ADR-017.
- La aplicación privada usa patrón BFF. El navegador no conserva refresh tokens persistentes.
- Los roles y permisos de negocio permanecen en ICE24 OS; el proveedor de identidad no es la fuente de verdad para acceso a cuentas, sucursales o máquinas.
- El usuario selecciona un contexto activo. La API valida en cada solicitud que la asociación y la sesión de contexto sigan vigentes.
- El portal público no comparte sesión con la aplicación privada.
- Los estados de suscripción pueden limitar las mutaciones. En modo lectura se permiten las consultas y descargas previamente generadas autorizadas, pero no las creaciones o modificaciones.

### 5.1 Evaluación de autorización
| Dimensión | Ejemplo |
| --- | --- |
| Identidad | Usuario autenticado y sesión vigente. |
| Organización | Cuenta titular activa y asociación válida. |
| Ámbito | Toda la cuenta, una sucursal o una máquina concreta. |
| Módulo | Mantenimiento, sanidad, inventario, reportes, ventas, pedidos, etc. |
| Acción | `view`, `create`, `edit`, `correct`, `approve`, `publish`, `download`, `restrict`, `administer`. |
| Sensibilidad | Costos, ingresos, documentos sanitarios, datos personales, auditoría y originales. |
| Estado | Suscripción, restricción técnica/sanitaria, estado de la máquina y estado del recurso. |

## 6. Formato estándar de errores
Las respuestas de error siguen **Problem Details for HTTP APIs (RFC 9457)**.
### `ProblemDetails`
Error normalizado para respuestas síncronas.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| type | string URI | Sí | Identificador estable del tipo de problema. |
| title | string | Sí | Título breve legible. |
| status | integer | Sí | Código HTTP. |
| detail | string | Sí | Descripción segura para el consumidor. |
| instance | string URI | Sí | Ruta o identificador de la ocurrencia. |
| code | string | Sí | Código estable de ICE24 OS. |
| correlationId | uuid | Sí | Identificador de seguimiento. |
| errors | array<FieldError> | No | Errores por campo. |
| retryable | boolean | No | Indica si un reintento puede ser apropiado. |
| meta | object | No | Datos no sensibles adicionales. |

### `FieldError`
Detalle de validación por campo.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| field | string | Sí | Ruta JSON o nombre del parámetro. |
| code | string | Sí | Código de validación. |
| message | string | Sí | Mensaje en idioma de la interfaz. |
| rejectedValue | any | No | Solo cuando no sea sensible. |

**Ejemplo de error**
```json
{
  "type": "https://api.ice24.mx/problems/state-transition-invalid",
  "title": "Transición de estado inválida",
  "status": 409,
  "detail": "La orden no puede completarse mientras falte evidencia obligatoria.",
  "instance": "/api/v1/work-orders/0192e9b3-9c0a-7c2a-a6ad-c6b9f4536ce8/complete",
  "code": "WORK_ORDER_EVIDENCE_REQUIRED",
  "correlationId": "b688eedd-c011-4a5d-bb38-2f7d6f29af52",
  "retryable": false,
  "errors": [
    {"field": "evidence", "code": "required", "message": "Falta la fotografía de la pieza instalada."}
  ]
}
```

### 6.1 Códigos de error transversales
| Código de API | HTTP | Significado |
| --- | --- | --- |
| `AUTHENTICATION_REQUIRED` | 401 | No existe sesión o token válido. |
| `SESSION_REVOKED` | 401 | La sesión fue revocada. |
| `CONTEXT_REQUIRED` | 400 | Falta contexto de cuenta requerido. |
| `CONTEXT_INACTIVE` | 403 | La asociación o sesión de contexto ya no está activa. |
| `PERMISSION_DENIED` | 403 | El actor no puede ejecutar la acción. |
| `ACCOUNT_READ_ONLY` | 403 | La suscripción limita la cuenta a lectura. |
| `RESOURCE_NOT_FOUND` | 404 | Recurso inexistente o no visible. |
| `VALIDATION_ERROR` | 422 | Campos válidos sintácticamente pero inválidos para el dominio. |
| `DUPLICATE_RESOURCE` | 409 | Existe una entidad única equivalente. |
| `STATE_TRANSITION_INVALID` | 409 | La transición no es válida desde el estado actual. |
| `VERSION_CONFLICT` | 412 | La versión esperada no coincide. |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Falta clave para operación crítica. |
| `IDEMPOTENCY_CONFLICT` | 409 | La misma clave se reutilizó con otro payload. |
| `RATE_LIMITED` | 429 | Se superó el límite. |
| `DEPENDENCY_UNAVAILABLE` | 503 | Una dependencia necesaria no está disponible. |
| `INTERNAL_ERROR` | 500 | Fallo no esperado. |

## 7. Esquemas compartidos
### `AuditFields`
Campos incluidos en recursos mutables o históricos cuando corresponda.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| createdAt | date-time | Sí | Fecha UTC de creación. |
| createdBy | uuid | Sí | Actor de creación; puede ser identidad técnica. |
| updatedAt | date-time | Sí | Última modificación. |
| updatedBy | uuid | Sí | Actor de modificación. |
| version | integer | Sí | Versión para concurrencia optimista. |
| archivedAt | date-time | No | Fecha de archivado lógico. |
| archivedBy | uuid | No | Actor de archivado. |

### `Money`
Importe monetario sin punto flotante.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| amountMinor | integer(int64) | Sí | Centavos u otra unidad menor. |
| currency | string(3) | Sí | ISO 4217; inicialmente `MXN`. |
| kind | enum | No | `actual`, `administrative_balance`, `estimated_cost`, `estimated_profit`. |

### `Measurement`
Valor físico con unidad explícita.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| value | decimal string | Sí | Valor decimal serializado como cadena. |
| unit | string | Sí | Código de unidad catalogado. |
| precision | integer | No | Decimales significativos esperados. |

### `Address`
Dirección estructurada.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| line1 | string | Sí | Calle y número. |
| line2 | string | No | Complemento. |
| neighborhood | string | No | Colonia. |
| municipality | string | Sí | Municipio o alcaldía. |
| state | string | Sí | Entidad federativa. |
| postalCode | string | Sí | Código postal. |
| country | string(2) | Sí | ISO 3166-1 alpha-2; inicialmente `MX`. |
| coordinates | GeoPoint | No | Coordenadas cuando estén disponibles. |

### `GeoPoint`
Punto geográfico.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| latitude | decimal | Sí | -90 a 90. |
| longitude | decimal | Sí | -180 a 180. |
| accuracyMeters | decimal | No | Precisión reportada por el dispositivo. |
| capturedAt | date-time | No | Momento de captura. |
| source | enum | No | `gps`, `manual`, `geocoded`, `ip_approximation`. |

### `Job`
Representa una tarea asíncrona.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID del trabajo. |
| type | string | Sí | Tipo estable. |
| status | enum | Sí | `queued`, `processing`, `completed`, `failed`, `cancelled`. |
| progressPercent | integer | No | 0 a 100 cuando sea calculable. |
| resourceType | string | No | Tipo del resultado. |
| resourceId | uuid | No | ID del resultado. |
| error | ProblemDetails | No | Error normalizado restringido. |
| createdAt | date-time | Sí | Creación. |
| startedAt | date-time | No | Inicio. |
| finishedAt | date-time | No | Fin. |
| links | object | Sí | Enlaces `self` y `result` cuando exista. |

### `StateTransitionRequest`
Comando común para transiciones sensibles.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| reason | string | Condicional | Motivo obligatorio en correcciones, anulaciones, restricciones, retiros y acciones similares. |
| occurredAt | date-time | No | Fecha real del evento si difiere de la captura. |
| localTimeZone | string IANA | No | Zona relevante. |
| evidenceFileIds | array<uuid> | No | Evidencias ya cargadas. |
| expectedVersion | integer | Condicional | Alternativa a `If-Match`. |
| confirmation | boolean | Condicional | Confirmación explícita de responsabilidad o veracidad. |

### `FileReference`
Referencia segura a un archivo.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID de archivo. |
| fileName | string | Sí | Nombre visible. |
| mediaType | string | Sí | MIME validado. |
| sizeBytes | integer | Sí | Tamaño. |
| status | enum | Sí | `pending`, `uploaded`, `processing`, `available`, `rejected`, `quarantined`. |
| version | integer | Sí | Versión del metadato. |
| downloadAllowed | boolean | Sí | Resultado de autorización para el actor. |

## 8. Catálogo de recursos y esquemas de dominio
### `UserProfile`
Identidad local única asociada con el proveedor OIDC.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID local. |
| identityProviderSubject | string | Sí | `sub` global del proveedor. |
| username | string | Sí | Único global. |
| email | email | Sí | Único global. |
| displayName | string | Sí | Nombre visible. |
| phone | string | No | Teléfono autorizado. |
| status | enum | Sí | `invited`, `active`, `disabled`. |
| twoFactorEnabled | boolean | Sí | Estado reflejado desde identidad. |
| audit | AuditFields | Sí | Auditoría. |

### `AccessContext`
Contexto activo de operación.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID de sesión de contexto. |
| accountId | uuid | Sí | Cuenta. |
| branchId | uuid | No | Sucursal seleccionada. |
| roles | array<string> | Sí | Roles aplicables. |
| scopes | array<object> | Sí | Ámbitos autorizados. |
| expiresAt | date-time | Sí | Vigencia. |
| status | enum | Sí | `active`, `revoked`, `expired`. |

### `UserAssociation`
Relación de una identidad con cuenta, sucursal o máquina.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| userId | uuid | Sí | Usuario. |
| accountId | uuid | Sí | Cuenta. |
| branchIds | array<uuid> | No | Sucursales limitadas. |
| machineIds | array<uuid> | No | Máquinas limitadas. |
| roleIds | array<uuid> | Sí | Roles. |
| permissionOverrides | array<object> | No | Ajustes permitidos. |
| status | enum | Sí | `pending`, `active`, `suspended`, `ended`. |
| validFrom | date-time | Sí | Inicio. |
| validTo | date-time | No | Fin. |
| audit | AuditFields | Sí | Auditoría. |

### `Account`
Cuenta titular contratante.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| legalType | enum | Sí | `individual`, `company`. |
| displayName | string | Sí | Nombre. |
| legalName | string | No | Razón social. |
| timeZone | string IANA | Sí | Zona principal. |
| currency | string | Sí | Inicialmente `MXN`. |
| contact | object | Sí | Datos de contacto. |
| taxProfile | TaxProfile | No | Datos fiscales. |
| subscriptionStatus | enum | Sí | Estado derivado de suscripción. |
| moduleConfiguration | object | Sí | Módulos habilitados. |
| status | enum | Sí | `pending`, `active`, `read_only`, `cancelled`, `archived`. |
| audit | AuditFields | Sí | Auditoría. |

### `Branch`
Sucursal operativa.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| accountId | uuid | Sí | Cuenta. |
| name | string | Sí | Nombre. |
| address | Address | Sí | Dirección. |
| timeZone | string IANA | Sí | Zona. |
| schedule | array<object> | No | Horario. |
| publicPhone | string | No | Teléfono público. |
| ownerPhonePublic | boolean | Sí | Autorización. |
| referenceTemperature | Measurement | No | Temperatura de referencia. |
| status | enum | Sí | `active`, `archived`. |
| audit | AuditFields | Sí | Auditoría. |

### `EquipmentRequest`
Solicitud de alta de equipo.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| accountId | uuid | Sí | Cuenta. |
| branchId | uuid | Sí | Sucursal. |
| manufacturer | string | Sí | Fabricante. |
| modelName | string | Sí | Modelo declarado. |
| serialNumber | string | Sí | Serie física. |
| capacity | object | No | Capacidad declarada. |
| characteristics | object | No | Tamaño de cubo, pagos y accesorios. |
| fileIds | array<uuid> | No | Fotos y documentos. |
| validationMethod | enum | No | `documents`, `extra_photos`, `video_call`, `site_visit`. |
| status | enum | Sí | `draft`, `submitted`, `in_review`, `information_required`, `validated`, `rejected`, `active`. |
| review | object | No | Responsable, resolución y motivo. |
| audit | AuditFields | Sí | Auditoría. |

### `Machine`
Activo físico permanente.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| machineCode | string | Sí | Código ICE24 OS único e inmutable. |
| serialNumber | string | Sí | Serie de fabricante. |
| manufacturer | string | Sí | Fabricante. |
| technicalModelId | uuid | Sí | Modelo oficial. |
| templateVersionId | uuid | Sí | Plantilla vigente. |
| commercialBrand | string | No | Marca del cliente. |
| internalName | string | No | Nombre interno. |
| currentAccountId | uuid | Sí | Propietario actual. |
| currentBranchId | uuid | Sí | Sucursal actual. |
| operationalStatus | enum | Sí | `available`, `off`, `maintenance`, `out_of_service`, `suspended`, `retired`. |
| technicalStatus | enum | Sí | `optimal`, `preventive_attention`, `attention_required`, `critical`. |
| sanitaryStatus | enum | Sí | `up_to_date`, `expiring_soon`, `attention_required`, `corrective_action`, `restricted`. |
| publicVisibility | enum | Sí | `private`, `pending`, `published`, `withdrawn`. |
| characteristics | object | Sí | Configuración permitida. |
| audit | AuditFields | Sí | Auditoría. |

### `MachineTransfer`
Transferencia controlada entre cuentas.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| machineId | uuid | Sí | Máquina. |
| fromAccountId | uuid | Sí | Cuenta anterior. |
| toAccountId | uuid | Sí | Cuenta destino. |
| effectiveAt | date-time | No | Fecha efectiva. |
| commercialDataTransfer | object | Sí | Ventas, clientes, recargas y pedidos autorizados o excluidos. |
| authorizationFileIds | array<uuid> | Sí | Evidencia. |
| status | enum | Sí | `draft`, `pending`, `approved`, `executed`, `rejected`, `cancelled`. |
| audit | AuditFields | Sí | Auditoría. |

### `TechnicalModel`
Modelo técnico administrado por ICE24.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| code | string | Sí | Código único. |
| name | string | Sí | Nombre. |
| equipmentType | enum | Sí | `ice_450`, `ice_water_450`, `ice_900`, `water_vending`, `external_validated`, `private_label`. |
| nominalCapacity | object | No | Producción/almacenamiento. |
| status | enum | Sí | `draft`, `active`, `retired`. |
| audit | AuditFields | Sí | Auditoría. |

### `TemplateVersion`
Versión oficial de plantilla.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| technicalModelId | uuid | Sí | Modelo. |
| versionNumber | integer | Sí | Secuencial. |
| status | enum | Sí | `draft`, `published`, `superseded`. |
| effectiveFrom | date-time | No | Vigencia. |
| changeSummary | string | Sí | Resumen. |
| systems | array<object> | Sí | Sistemas. |
| components | array<object> | Sí | Componentes. |
| activities | array<TemplateActivity> | Sí | Actividades. |
| affectedMachineCount | integer | No | Vista de impacto. |
| audit | AuditFields | Sí | Auditoría. |

### `TemplateActivity`
Actividad oficial parametrizada.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| code | string | Sí | Código. |
| name | string | Sí | Nombre. |
| category | enum | Sí | Mantenimiento, sanidad, análisis, inspección, etc. |
| triggerType | enum | Sí | `time`, `usage`, `condition`, `event`. |
| frequency | object | Sí | Regla. |
| responsibleRole | string | Sí | Rol. |
| checklist | array<object> | Sí | Pasos. |
| fields | array<object> | Sí | Campos dinámicos. |
| evidenceRules | array<object> | Sí | Evidencias. |
| escalationRules | array<object> | Sí | Escalamientos. |
| criticality | enum | Sí | `low`, `medium`, `high`, `critical`. |

### `MaintenanceTask`
Actividad programada por plantilla.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| machineId | uuid | Sí | Máquina. |
| templateActivityId | uuid | Sí | Origen. |
| templateVersionId | uuid | Sí | Versión de origen. |
| dueAt | date-time | Sí | Vencimiento. |
| warningAt | date-time | No | Aviso. |
| assignedUserId | uuid | No | Responsable. |
| status | enum | Sí | `scheduled`, `upcoming`, `in_progress`, `completed`, `with_observations`, `overdue`, `non_conforming`, `annulled`. |
| daysOverdue | integer | Sí | Días vencidos. |
| audit | AuditFields | Sí | Auditoría. |

### `Ticket`
Incidencia reportada.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| machineId | uuid | Sí | Máquina. |
| systemId | uuid | No | Sistema. |
| description | string | Sí | Descripción. |
| priority | enum | Sí | `low`, `medium`, `high`, `critical`. |
| reportedBy | uuid | Sí | Actor. |
| assignedTechnicianId | uuid | No | Técnico. |
| status | enum | Sí | `open`, `assigned`, `in_progress`, `resolved`, `closed`, `annulled`. |
| fileIds | array<uuid> | No | Evidencias. |
| audit | AuditFields | Sí | Auditoría. |

### `WorkOrder`
Orden de trabajo.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| machineId | uuid | Sí | Máquina. |
| ticketId | uuid | No | Ticket origen. |
| maintenanceTaskId | uuid | No | Tarea origen. |
| assignedTechnicianId | uuid | Sí | Técnico. |
| procedure | array<object> | Sí | Checklist/procedimiento. |
| diagnosis | string | No | Diagnóstico. |
| activitiesPerformed | array<object> | No | Actividades. |
| parts | array<object> | No | Piezas utilizadas/retiradas. |
| testResults | array<object> | No | Pruebas. |
| recommendation | string | No | Recomendación. |
| evidenceFileIds | array<uuid> | No | Evidencias. |
| confirmation | boolean | No | Confirmación de veracidad. |
| status | enum | Sí | `draft`, `assigned`, `in_progress`, `completed`, `with_observations`, `non_conforming`, `annulled`. |
| audit | AuditFields | Sí | Auditoría. |

### `LogbookEntry`
Registro sanitario dinámico.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| machineId | uuid | No | Máquina cuando aplica. |
| branchId | uuid | Sí | Sucursal. |
| templateActivityId | uuid | Sí | Plantilla. |
| templateVersionId | uuid | Sí | Versión. |
| occurredAt | date-time | Sí | Fecha real. |
| values | object | Sí | Campos dinámicos tipados. |
| result | enum | Sí | `conforming`, `non_conforming`, `pending`, `not_evaluable`. |
| evidenceFileIds | array<uuid> | No | Evidencia. |
| status | enum | Sí | `draft`, `completed`, `corrected`, `annulled`. |
| audit | AuditFields | Sí | Auditoría. |

### `LaboratoryAnalysis`
Análisis de laboratorio.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| machineId | uuid | Sí | Máquina. |
| productType | string | Sí | Agua entrada, tratada, hielo, etc. |
| samplingPoint | string | Sí | Punto. |
| laboratoryName | string | Sí | Laboratorio. |
| laboratoryFolio | string | No | Folio externo. |
| analysisType | string | Sí | Plantilla. |
| sampledAt | date-time | Sí | Muestreo. |
| receivedAt | date-time | No | Recepción. |
| resultedAt | date-time | No | Resultado. |
| validUntil | date-time | No | Vigencia. |
| parameters | array<LabParameterResult> | Sí | Resultados. |
| overallResult | enum | Sí | `conforming`, `non_conforming`, `pending`, `not_evaluable`. |
| originalDocumentId | uuid | Sí | PDF original. |
| publicDocumentVersionId | uuid | No | Versión pública. |
| status | enum | Sí | `draft`, `submitted`, `reviewed`, `corrective_action`, `closed`, `annulled`. |
| audit | AuditFields | Sí | Auditoría. |

### `LabParameterResult`
Resultado estructurado de parámetro.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| parameterId | uuid | Sí | Parámetro catalogado. |
| name | string | Sí | Nombre. |
| unit | string | Sí | Unidad. |
| value | decimal string | No | Resultado numérico. |
| textValue | string | No | Resultado cualitativo. |
| lowerLimit | decimal string | No | Límite inferior. |
| upperLimit | decimal string | No | Límite superior. |
| criterion | string | Sí | Criterio aplicado y versión. |
| result | enum | Sí | `conforming`, `non_conforming`, `pending`, `not_evaluable`. |

### `NonConformity`
Evento fuera de criterio.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| sourceType | enum | Sí | `laboratory`, `logbook`, `maintenance`, `inspection`. |
| sourceId | uuid | Sí | Origen. |
| machineId | uuid | Sí | Máquina. |
| riskLevel | enum | Sí | `low`, `medium`, `high`, `critical`. |
| description | string | Sí | Descripción. |
| status | enum | Sí | `open`, `acknowledged`, `in_corrective_action`, `verified`, `closed`, `annulled`. |
| restrictionId | uuid | No | Restricción. |
| audit | AuditFields | Sí | Auditoría. |

### `CorrectiveAction`
Acción correctiva.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| nonConformityId | uuid | Sí | No conformidad. |
| responsibleUserId | uuid | Sí | Responsable. |
| actionPlan | string | Sí | Plan. |
| dueAt | date-time | Sí | Fecha límite. |
| performedAt | date-time | No | Ejecución. |
| verification | string | No | Verificación. |
| evidenceFileIds | array<uuid> | No | Evidencia. |
| status | enum | Sí | `planned`, `in_progress`, `completed`, `verified`, `rejected`, `annulled`. |
| audit | AuditFields | Sí | Auditoría. |

### `Restriction`
Restricción técnica o sanitaria.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| machineId | uuid | Sí | Máquina. |
| type | enum | Sí | `technical`, `sanitary`. |
| reason | string | Sí | Motivo. |
| evidenceFileIds | array<uuid> | No | Evidencia. |
| conditionsToLift | string | Sí | Condiciones. |
| appliedAt | date-time | Sí | Aplicación. |
| liftedAt | date-time | No | Levantamiento. |
| status | enum | Sí | `active`, `reactivation_requested`, `lifted`, `reapplied`. |
| audit | AuditFields | Sí | Auditoría. |

### `InventoryItem`
Refacción o consumible catalogado.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| accountId | uuid | Sí | Cuenta. |
| code | string | Sí | Código único por cuenta. |
| category | string | Sí | Categoría. |
| description | string | Sí | Descripción. |
| photoFileId | uuid | No | Fotografía. |
| compatibleModelIds | array<uuid> | No | Compatibilidad. |
| unitOfMeasure | string | Sí | Unidad. |
| minimumStock | decimal string | No | Mínimo. |
| maximumStock | decimal string | No | Máximo. |
| status | enum | Sí | `active`, `inactive`. |
| audit | AuditFields | Sí | Auditoría. |

### `Warehouse`
Ubicación de inventario.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| accountId | uuid | Sí | Cuenta. |
| branchId | uuid | No | Sucursal. |
| name | string | Sí | Nombre. |
| type | enum | Sí | `general`, `branch`, `machine`, `technician`, `vehicle`. |
| status | enum | Sí | `active`, `archived`. |
| audit | AuditFields | Sí | Auditoría. |

### `InventoryMovement`
Movimiento trazable.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| itemId | uuid | Sí | Producto. |
| lotId | uuid | No | Lote. |
| movementType | enum | Sí | `purchase`, `consume`, `transfer`, `adjust`, `install`, `remove`. |
| quantity | decimal string | Sí | Cantidad positiva; dirección derivada del tipo. |
| fromWarehouseId | uuid | No | Origen. |
| toWarehouseId | uuid | No | Destino. |
| machineId | uuid | No | Máquina. |
| workOrderId | uuid | No | Orden. |
| unitCost | Money | No | Costo. |
| reason | string | Condicional | Obligatorio para ajustes/retiros. |
| evidenceFileIds | array<uuid> | No | Evidencia. |
| occurredAt | date-time | Sí | Fecha. |
| audit | AuditFields | Sí | Auditoría. |

### `FileObject`
Metadatos de binario privado.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| ownerAccountId | uuid | Sí | Cuenta. |
| fileName | string | Sí | Nombre. |
| mediaType | string | Sí | MIME. |
| sizeBytes | integer | Sí | Tamaño. |
| sha256 | string | No | Hash tras carga. |
| purpose | string | Sí | Propósito autorizado. |
| relatedResource | object | Sí | Tipo e ID. |
| visibility | enum | Sí | `private`, `public_derivative`, `temporary_export`. |
| status | enum | Sí | `pending`, `uploaded`, `processing`, `available`, `rejected`, `quarantined`, `deleted_temporary`. |
| audit | AuditFields | Sí | Auditoría. |

### `Document`
Activo documental con versiones.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| accountId | uuid | Sí | Cuenta. |
| branchId | uuid | No | Sucursal. |
| machineId | uuid | No | Máquina. |
| documentType | string | Sí | Tipo. |
| title | string | Sí | Título. |
| description | string | No | Descripción. |
| issuer | string | No | Emisor. |
| externalFolio | string | No | Folio externo. |
| issuedAt | date-time | No | Emisión. |
| validFrom | date-time | No | Inicio. |
| validUntil | date-time | No | Vencimiento. |
| operationalStatus | enum | Sí | `draft`, `pending_review`, `completed`, `non_conforming`, `corrective_action`, `corrected`, `annulled`. |
| publicVisibility | enum | Sí | `private`, `pending`, `published`, `withdrawn`, `superseded`. |
| currentVersionId | uuid | Sí | Versión vigente. |
| audit | AuditFields | Sí | Auditoría. |

### `DocumentVersion`
Versión inmutable de documento.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| documentId | uuid | Sí | Documento. |
| versionNumber | integer | Sí | Secuencia. |
| originalFileId | uuid | Sí | Original. |
| publicFileId | uuid | No | Derivado público. |
| sha256 | string | Sí | Integridad. |
| changeReason | string | No | Motivo de corrección. |
| replacesVersionId | uuid | No | Versión reemplazada. |
| createdAt | date-time | Sí | Creación. |
| createdBy | uuid | Sí | Actor. |

### `ReportRequest`
Configuración de generación.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| reportType | string | Sí | Tipo permitido. |
| period | object | Sí | Inicio y fin. |
| accountId | uuid | Sí | Cuenta. |
| branchIds | array<uuid> | No | Sucursales. |
| machineIds | array<uuid> | No | Máquinas. |
| sections | array<string> | Sí | Secciones permitidas. |
| includeAttachments | boolean | Sí | Anexos. |
| includePhotos | boolean | Sí | Fotos. |
| privacyLevel | enum | Sí | `private`, `public`. |
| watermark | enum | Sí | `required`, `optional`, `none` según permiso. |
| financialData | enum | Sí | `include`, `exclude` según permiso. |
| locale | string | Sí | Inicialmente `es-MX`. |

### `Report`
Reporte generado.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| request | ReportRequest | Sí | Configuración congelada. |
| status | enum | Sí | `queued`, `generating`, `available`, `failed`, `expired`. |
| previewUrl | string URI | No | Vista protegida. |
| pdfFileId | uuid | No | PDF. |
| generatedAt | date-time | No | Generación. |
| expiresAt | date-time | No | Expiración cuando aplica. |
| audit | AuditFields | Sí | Auditoría. |

### `SalesImport`
Importación de Excel.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| machineId | uuid | Sí | Máquina. |
| sourceFileId | uuid | Sí | Excel original. |
| adapterVersion | string | Sí | Formato usado. |
| period | object | No | Periodo detectado. |
| summary | object | Sí | Nuevos, duplicados, errores. |
| status | enum | Sí | `uploaded`, `validating`, `preview_ready`, `confirmed`, `annulled`, `failed`. |
| confirmedAt | date-time | No | Confirmación. |
| annulledAt | date-time | No | Anulación. |
| audit | AuditFields | Sí | Auditoría. |

### `Sale`
Venta importada.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| salesImportId | uuid | Sí | Importación. |
| machineId | uuid | Sí | Máquina. |
| occurredAt | date-time | Sí | Fecha. |
| paymentMethod | string | Sí | Método. |
| productCode | string | Sí | Producto. |
| quantity | decimal string | Sí | Cantidad. |
| amount | Money | Sí | Importe. |
| externalTransactionId | string | No | ID externo. |
| deduplicationKey | string | Sí | Llave de deduplicación. |
| status | enum | Sí | `active`, `withdrawn_by_annulment`. |

### `Card`
Tarjeta física administrada.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio impreso. |
| machineId | uuid | Sí | Máquina exclusiva. |
| status | enum | Sí | `unassigned`, `assigned`, `inactive`, `lost`, `retired`. |
| administrativeBalance | Money | Sí | Saldo registrado, no saldo real. |
| currentAssignment | object | No | Titular actual. |
| audit | AuditFields | Sí | Auditoría. |

### `CardMovement`
Movimiento administrativo de tarjeta.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| cardId | uuid | Sí | Tarjeta. |
| movementType | enum | Sí | `recharge`, `withdrawal`, `transfer_out`, `transfer_in`, `reassignment_adjustment`. |
| moneyReceived | Money | No | Dinero recibido. |
| balanceAmount | Money | Sí | Saldo cargado/retirado. |
| bonusAmount | Money | No | Bonificación. |
| counterpartyCardId | uuid | No | Tarjeta relacionada. |
| reason | string | Condicional | Motivo. |
| evidenceFileIds | array<uuid> | No | Evidencia. |
| occurredAt | date-time | Sí | Fecha. |
| audit | AuditFields | Sí | Auditoría. |

### `ConsumerBusiness`
Empresa o restaurante consumidor.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| name | string | Sí | Nombre comercial. |
| legalName | string | No | Razón social. |
| administratorUserId | uuid | Sí | Administrador. |
| status | enum | Sí | `active`, `suspended`, `archived`. |
| taxProfile | TaxProfile | No | Datos fiscales. |
| audit | AuditFields | Sí | Auditoría. |

### `ConsumerBranch`
Sucursal consumidora.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| businessId | uuid | Sí | Negocio. |
| name | string | Sí | Nombre. |
| address | Address | Sí | Dirección. |
| contact | object | Sí | Contacto. |
| status | enum | Sí | `active`, `archived`. |
| audit | AuditFields | Sí | Auditoría. |

### `TaxProfile`
Datos fiscales almacenados, sin timbrado.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| rfc | string | Sí | RFC. |
| legalName | string | Sí | Razón social. |
| taxRegime | string | Sí | Régimen. |
| postalCode | string | Sí | Código postal. |
| cfdiUse | string | Sí | Uso CFDI. |
| billingEmail | email | Sí | Correo. |
| version | integer | Sí | Versión. |

### `MachineProduct`
Oferta por máquina.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| machineId | uuid | Sí | Máquina. |
| name | string | Sí | Nombre. |
| presentation | string | Sí | Presentación. |
| weight | Measurement | Sí | Kilogramos. |
| photoFileId | uuid | No | Imagen. |
| machineValue | Money | Sí | Valor descontado de tarjeta. |
| restaurantPrice | Money | Sí | Precio comercial. |
| maximumPerOrder | decimal string | No | Máximo. |
| availability | enum | Sí | `available`, `limited`, `unavailable`. |
| active | boolean | Sí | Estado. |
| audit | AuditFields | Sí | Auditoría. |

### `DeliveryZone`
Zona y tarifa de entrega.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| machineId | uuid | Sí | Máquina. |
| name | string | Sí | Nombre. |
| geometry | object | No | Polígono o radio. |
| feeType | enum | Sí | `fixed`, `zone`, `distance`, `approximate`, `free`. |
| fee | Money | Sí | Tarifa base. |
| maximumFee | Money | No | Límite del repartidor. |
| distanceRules | array<object> | No | Tramos. |
| status | enum | Sí | `active`, `inactive`. |
| audit | AuditFields | Sí | Auditoría. |

### `Order`
Pedido de hielo.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| folio | string | Sí | Folio. |
| ownerAccountId | uuid | Sí | Propietario. |
| operatingBranchId | uuid | Sí | Sucursal operativa. |
| machineId | uuid | Sí | Máquina. |
| consumerBusinessId | uuid | Sí | Negocio. |
| consumerBranchId | uuid | Sí | Sucursal consumidora. |
| driverId | uuid | No | Repartidor responsable. |
| lines | array<OrderLine> | Sí | Productos. |
| deliveryFee | Money | Sí | Tarifa. |
| total | Money | Sí | Total. |
| deliveryAddress | Address | Sí | Destino. |
| deliveryCode | string | Sí | Código protegido/no devuelto completo a roles no autorizados. |
| status | enum | Sí | `created`, `available`, `taken`, `collecting`, `collected`, `en_route`, `delivered`, `closed`, `cancelled`, `released`, `partial`, `not_delivered`, `incident`. |
| timestamps | object | Sí | Hitos. |
| audit | AuditFields | Sí | Auditoría. |

### `OrderLine`
Partida del pedido.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| machineProductId | uuid | Sí | Producto. |
| quantity | decimal string | Sí | Cantidad. |
| unitPrice | Money | Sí | Precio congelado. |
| subtotal | Money | Sí | Subtotal. |
| fulfilledQuantity | decimal string | No | Surtido real. |

### `DriverProfile`
Perfil de repartidor.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| userId | uuid | Sí | Identidad. |
| status | enum | Sí | `available`, `busy`, `temporarily_unavailable`, `out_of_service`, `vacation`. |
| currentLocation | GeoPoint | No | Ubicación conforme a política. |
| activeOrderId | uuid | No | Pedido. |
| audit | AuditFields | Sí | Auditoría. |

### `DriverMachineAssociation`
Relación elegible repartidor-máquina.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| driverId | uuid | Sí | Repartidor. |
| machineId | uuid | Sí | Máquina. |
| cardId | uuid | Sí | Tarjeta exclusiva. |
| zoneIds | array<uuid> | No | Zonas. |
| status | enum | Sí | `pending`, `active`, `inactive`, `ended`. |
| validFrom | date-time | Sí | Inicio. |
| validTo | date-time | No | Fin. |
| audit | AuditFields | Sí | Auditoría. |

### `ExternalSale`
Venta externa opcional de repartidor.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| driverId | uuid | Sí | Repartidor. |
| machineId | uuid | Sí | Máquina. |
| quantity | decimal string | Sí | Cantidad. |
| cardBalanceUsed | Money | Sí | Saldo administrativo usado. |
| salePrice | Money | Sí | Precio. |
| deliveryFee | Money | No | Entrega. |
| estimatedProfit | Money | Sí | Estimación con advertencia. |
| privateCustomerData | object | No | Visible según privacidad definida. |
| occurredAt | date-time | Sí | Fecha. |
| audit | AuditFields | Sí | Auditoría. |

### `IndicatorResult`
Resultado versionado de indicador.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| indicatorCode | string | Sí | Indicador. |
| formulaVersion | string | Sí | Versión. |
| scope | object | Sí | Cuenta/sucursal/máquina. |
| period | object | Sí | Periodo. |
| category | string | Sí | Resultado cualitativo. |
| numericValue | decimal string | No | Privado cuando aplica. |
| factors | array<object> | Sí | Factores explicables. |
| calculatedAt | date-time | Sí | Cálculo. |
| dataCompleteness | enum | Sí | `complete`, `partial`, `insufficient`. |

### `Notification`
Aviso accionable.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| type | string | Sí | Tipo. |
| priority | enum | Sí | `info`, `warning`, `high`, `critical`. |
| title | string | Sí | Título. |
| message | string | Sí | Mensaje. |
| recipientUserId | uuid | Sí | Destinatario. |
| relatedResource | object | No | Origen. |
| status | enum | Sí | `unread`, `read`, `acknowledged`, `in_progress`, `resolved`. |
| pinned | boolean | Sí | Crítica fijada. |
| sentChannels | array<string> | Sí | Centro, navegador, correo. |
| escalationLevel | integer | Sí | Nivel. |
| audit | AuditFields | Sí | Auditoría. |

### `Subscription`
Suscripción de cuenta.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| accountId | uuid | Sí | Cuenta. |
| provider | string | Sí | `stripe`. |
| providerCustomerId | string | Sí | Cliente externo. |
| providerSubscriptionId | string | No | Suscripción externa. |
| planCode | string | Sí | Plan único configurable. |
| price | Money | Sí | Precio vigente. |
| status | enum | Sí | `demo`, `pending_activation`, `active`, `payment_failed`, `read_only`, `cancellation_scheduled`, `cancelled`, `reactivated`. |
| currentPeriodStart | date-time | No | Inicio. |
| currentPeriodEnd | date-time | No | Fin. |
| cancelAtPeriodEnd | boolean | Sí | Cancelación. |
| audit | AuditFields | Sí | Auditoría. |

### `AuditEvent`
Evento inmutable de negocio.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| occurredAtUtc | date-time | Sí | Marca técnica. |
| localDateTime | date-time | No | Fecha local. |
| timeZone | string IANA | No | Zona. |
| actor | object | Sí | Usuario o sistema. |
| accountId | uuid | No | Contexto. |
| branchId | uuid | No | Sucursal. |
| machineId | uuid | No | Máquina. |
| entityType | string | Sí | Entidad. |
| entityId | uuid | Sí | ID. |
| action | string | Sí | Acción. |
| before | object | No | Valor anterior protegido. |
| after | object | No | Valor nuevo protegido. |
| reason | string | No | Motivo. |
| origin | string | Sí | Web, offline, worker, integración, público. |
| correlationId | uuid | Sí | Correlación. |
| result | enum | Sí | `success`, `failure`, `denied`. |

### `OfflinePackage`
Paquete de trabajo autorizado.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID. |
| userId | uuid | Sí | Usuario. |
| deviceId | string | Sí | Dispositivo registrado. |
| contextId | uuid | Sí | Contexto. |
| resourceType | enum | Sí | `work_order`, `logbook_task`, `order`. |
| resourceIds | array<uuid> | Sí | Recursos. |
| manifestVersion | integer | Sí | Versión. |
| expiresAt | date-time | Sí | Expiración. |
| status | enum | Sí | `preparing`, `available`, `downloaded`, `expired`, `revoked`. |

### `SyncBatch`
Lote de operaciones offline.

| Campo | Tipo | Obligatorio | Descripción / restricciones |
| --- | --- | --- | --- |
| id | uuid | Sí | ID cliente/servidor. |
| deviceId | string | Sí | Dispositivo. |
| contextId | uuid | Sí | Contexto. |
| packageId | uuid | Sí | Paquete. |
| operations | array<object> | Sí | Operaciones con `operationId`, tipo, recurso, baseVersion y payload. |
| submittedAt | date-time | Sí | Envío. |
| results | array<object> | No | Resultado por operación. |
| status | enum | Sí | `received`, `processing`, `completed`, `partial`, `conflict`, `failed`. |

## 9. Endpoints de sesión, identidad y autorización
## 9.1 Catálogo
La recuperación de contraseña, el cambio obligatorio y TOTP se ejecutan en el proveedor de identidad; la API de negocio conserva auditoría y asociaciones.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SES-001 | GET | `/api/v1/me` | Obtener perfil y capacidades globales. | Ninguno. | — | `200 UserProfile` | `AUTHENTICATION_REQUIRED`. |
| SES-002 | PATCH | `/api/v1/me` | Actualizar campos editables del perfil. | Header `If-Match`. | `UpdateMyProfileRequest` | `200 UserProfile` | `VERSION_CONFLICT`, `VALIDATION_ERROR`. |
| SES-003 | GET | `/api/v1/me/contexts` | Listar contextos autorizados. | `filter[status]`. | — | `200 CursorPage<AccessContext>` | `AUTHENTICATION_REQUIRED`. |
| SES-004 | POST | `/api/v1/session-contexts` | Activar un contexto de cuenta/sucursal. | — | `CreateContextRequest {accountId, branchId?}` | `201 AccessContext` | `CONTEXT_INACTIVE`, `PERMISSION_DENIED`. |
| SES-005 | GET | `/api/v1/session-contexts/current` | Consultar contexto actual. | — | — | `200 AccessContext` | `CONTEXT_REQUIRED`. |
| SES-006 | DELETE | `/api/v1/session-contexts/current` | Cerrar el contexto actual sin cerrar identidad global. | — | — | `204` | `CONTEXT_REQUIRED`. |
| SES-007 | GET | `/api/v1/me/sessions` | Listar sesiones propias conocidas. | Paginación. | — | `200 CursorPage<SessionSummary>` | `PERMISSION_DENIED`. |
| SES-008 | DELETE | `/api/v1/me/sessions/{sessionId}` | Revocar una sesión propia. | Path `sessionId`. | — | `204` | `RESOURCE_NOT_FOUND`. |
| SES-009 | POST | `/api/v1/me/sessions/revoke-all` | Revocar todas las sesiones propias. | `Idempotency-Key`. | `{reason?}` | `202 Job` o `204` | `IDEMPOTENCY_CONFLICT`. |
| SES-010 | GET | `/api/v1/roles` | Listar roles visibles. | `filter[type]`, paginación pequeña. | — | `200 Page<Role>` | `PERMISSION_DENIED`. |
| SES-011 | GET | `/api/v1/permissions` | Listar acciones y ámbitos autorizables. | `filter[module]`. | — | `200 Page<Permission>` | `PERMISSION_DENIED`. |
| SES-012 | GET | `/api/v1/users` | Listar usuarios asociados al contexto. | `filter[status]`, `filter[roleId]`, `filter[branchId]`, búsqueda, cursor. | — | `200 CursorPage<UserProfile>` | `PERMISSION_DENIED`. |
| SES-013 | POST | `/api/v1/user-invitations` | Invitar o asociar una identidad sin duplicarla. | `Idempotency-Key`. | `CreateUserInvitationRequest` | `201 UserInvitation` | `DUPLICATE_RESOURCE`, `PERMISSION_DENIED`. |
| SES-014 | GET | `/api/v1/user-invitations/{invitationId}` | Consultar invitación. | Path. | — | `200 UserInvitation` | `RESOURCE_NOT_FOUND`. |
| SES-015 | POST | `/api/v1/user-invitations/{invitationId}/resend` | Reenviar invitación. | `Idempotency-Key`. | `{}` | `202 Job` | `RATE_LIMITED`. |
| SES-016 | POST | `/api/v1/user-associations` | Crear asociación con ámbitos y roles. | `Idempotency-Key`. | `CreateUserAssociationRequest` | `201 UserAssociation` | `DUPLICATE_RESOURCE`, `PERMISSION_DENIED`. |
| SES-017 | GET | `/api/v1/user-associations/{associationId}` | Consultar asociación. | Path. | — | `200 UserAssociation` | `RESOURCE_NOT_FOUND`. |
| SES-018 | PATCH | `/api/v1/user-associations/{associationId}` | Modificar roles, ámbitos o vigencia. | Path, `If-Match`. | `UpdateUserAssociationRequest` | `200 UserAssociation` | `VERSION_CONFLICT`, `PERMISSION_DENIED`. |
| SES-019 | POST | `/api/v1/user-associations/{associationId}/suspend` | Suspender acceso en el contexto. | `Idempotency-Key`. | `StateTransitionRequest` | `200 UserAssociation` | `STATE_TRANSITION_INVALID`. |
| SES-020 | POST | `/api/v1/user-associations/{associationId}/reactivate` | Reactivar asociación. | `Idempotency-Key`. | `StateTransitionRequest` | `200 UserAssociation` | `STATE_TRANSITION_INVALID`. |
| SES-021 | POST | `/api/v1/user-associations/{associationId}/end` | Cerrar relación conservando historial. | `Idempotency-Key`. | `StateTransitionRequest` | `200 UserAssociation` | `STATE_TRANSITION_INVALID`. |
| SES-022 | GET | `/api/v1/users/{userId}/account-sessions` | Listar sesiones del usuario dentro de la cuenta. | Path, cursor. | — | `200 CursorPage<SessionSummary>` | `PERMISSION_DENIED`. |
| SES-023 | POST | `/api/v1/users/{userId}/account-sessions/revoke` | Cerrar sesiones del usuario solo en la cuenta. | `Idempotency-Key`. | `{reason}` | `202 Job` o `204` | `PERMISSION_DENIED`. |

**Ejemplo — crear asociación**
```json
{
  "userId": "0192e9f7-3e36-74de-b1d2-acde12bb9303",
  "accountId": "0192e8a8-0a3b-7f01-a30f-779c2b7aa4e1",
  "roleIds": ["0192ea0d-6fb4-7c99-81d2-77a90f5743ac"],
  "branchIds": ["0192e8e8-45ad-7b12-8d90-73db122e70e1"],
  "machineIds": [],
  "permissionOverrides": [],
  "validFrom": "2026-08-05T19:30:00-06:00"
}
```

## 10. Cuentas y sucursales
La creación de cuentas titulares principales pertenece a administración central; la API de cuenta permite operar los datos ya autorizados.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ORG-001 | GET | `/api/v1/accounts/{accountId}` | Consultar cuenta. | Path. | — | `200 Account` | `RESOURCE_NOT_FOUND`. |
| ORG-002 | PATCH | `/api/v1/accounts/{accountId}` | Actualizar datos permitidos. | Path, `If-Match`. | `UpdateAccountRequest` | `200 Account` | `VERSION_CONFLICT`, `PERMISSION_DENIED`. |
| ORG-003 | GET | `/api/v1/accounts/{accountId}/module-configuration` | Consultar módulos habilitados. | Path. | — | `200 ModuleConfiguration` | `RESOURCE_NOT_FOUND`. |
| ORG-004 | PATCH | `/api/v1/accounts/{accountId}/module-configuration` | Configurar módulos sin cambiar de plan. | Path, `If-Match`. | `UpdateModuleConfigurationRequest` | `200 ModuleConfiguration` | `PERMISSION_DENIED`. |
| ORG-005 | GET | `/api/v1/branches` | Listar sucursales del contexto. | Estado, búsqueda, cursor. | — | `200 CursorPage<Branch>` | `PERMISSION_DENIED`. |
| ORG-006 | POST | `/api/v1/branches` | Crear sucursal. | `Idempotency-Key`. | `CreateBranchRequest` | `201 Branch` | `ACCOUNT_READ_ONLY`, `VALIDATION_ERROR`. |
| ORG-007 | GET | `/api/v1/branches/{branchId}` | Consultar sucursal. | Path. | — | `200 Branch` | `RESOURCE_NOT_FOUND`. |
| ORG-008 | PATCH | `/api/v1/branches/{branchId}` | Actualizar sucursal. | Path, `If-Match`. | `UpdateBranchRequest` | `200 Branch` | `VERSION_CONFLICT`. |
| ORG-009 | POST | `/api/v1/branches/{branchId}/archive` | Archivar sin borrar historial. | `Idempotency-Key`. | `StateTransitionRequest` | `200 Branch` | `STATE_TRANSITION_INVALID`. |
| ORG-010 | POST | `/api/v1/branches/{branchId}/restore` | Restaurar sucursal archivada. | `Idempotency-Key`. | `StateTransitionRequest` | `200 Branch` | `STATE_TRANSITION_INVALID`. |
| ORG-011 | GET | `/api/v1/branches/{branchId}/machines` | Listar máquinas actuales. | Path, filtros de estado. | — | `200 CursorPage<Machine>` | `PERMISSION_DENIED`. |
| ORG-012 | GET | `/api/v1/branches/{branchId}/inventory-summary` | Resumen de almacén local. | Path. | — | `200 InventorySummary` | `PERMISSION_DENIED`. |

**Ejemplo — crear sucursal**
```json
{
  "name": "Sucursal Centro",
  "address": {
    "line1": "Av. Principal 120",
    "neighborhood": "Centro",
    "municipality": "Córdoba",
    "state": "Veracruz",
    "postalCode": "94500",
    "country": "MX",
    "coordinates": {"latitude": 18.8945, "longitude": -96.9344, "source": "manual"}
  },
  "timeZone": "America/Mexico_City",
  "publicPhone": "+52 271 000 0000",
  "ownerPhonePublic": false
}
```

## 11. Administración central ICE24
Solo roles internos con permisos explícitos acceden a estas rutas.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ADM-001 | GET | `/api/v1/admin/dashboard` | Panel global de cuentas, demos, equipos, restricciones y alertas. | Filtros de periodo. | — | `200 AdminDashboard` | `PERMISSION_DENIED`. |
| ADM-002 | GET | `/api/v1/admin/accounts` | Listar cuentas globalmente. | Estado, demo, suscripción, búsqueda, cursor. | — | `200 CursorPage<Account>` | `PERMISSION_DENIED`. |
| ADM-003 | POST | `/api/v1/admin/accounts` | Crear cuenta y propietario principal. | `Idempotency-Key`. | `CreateAccountWithOwnerRequest` | `201 Account` | `DUPLICATE_RESOURCE`. |
| ADM-004 | GET | `/api/v1/admin/accounts/{accountId}` | Consultar cuenta global. | Path. | — | `200 Account` | `RESOURCE_NOT_FOUND`. |
| ADM-005 | PATCH | `/api/v1/admin/accounts/{accountId}` | Actualizar configuración administrativa. | `If-Match`. | `AdminUpdateAccountRequest` | `200 Account` | `VERSION_CONFLICT`. |
| ADM-006 | POST | `/api/v1/admin/accounts/{accountId}/force-read-only` | Aplicar lectura por soporte/seguridad con motivo. | `Idempotency-Key`. | `StateTransitionRequest` | `200 Account` | `PERMISSION_DENIED`. |
| ADM-007 | POST | `/api/v1/admin/accounts/{accountId}/restore-access` | Restaurar acceso cuando la causa lo permita. | `Idempotency-Key`. | `StateTransitionRequest` | `200 Account` | `STATE_TRANSITION_INVALID`. |
| ADM-008 | GET | `/api/v1/admin/equipment-requests` | Cola global de solicitudes. | Estado, responsable, faltantes, cursor. | — | `200 CursorPage<EquipmentRequest>` | `PERMISSION_DENIED`. |
| ADM-009 | POST | `/api/v1/admin/equipment-requests/{requestId}/request-information` | Solicitar datos o evidencia adicional. | `Idempotency-Key`. | `{message, requiredItems[], dueAt?}` | `200 EquipmentRequest` | `STATE_TRANSITION_INVALID`. |
| ADM-010 | POST | `/api/v1/admin/equipment-requests/{requestId}/approve` | Validar, asignar plantilla y activar máquina. | `Idempotency-Key`, `If-Match`. | `ApproveEquipmentRequest` | `201 Machine` | `VALIDATION_ERROR`, `STATE_TRANSITION_INVALID`. |
| ADM-011 | POST | `/api/v1/admin/equipment-requests/{requestId}/reject` | Rechazar con motivo. | `Idempotency-Key`. | `StateTransitionRequest` | `200 EquipmentRequest` | `STATE_TRANSITION_INVALID`. |
| ADM-012 | GET | `/api/v1/admin/restrictions` | Consultar restricciones globales. | Tipo, estado, máquina, cuenta, cursor. | — | `200 CursorPage<Restriction>` | `PERMISSION_DENIED`. |
| ADM-013 | GET | `/api/v1/admin/template-impact` | Consultar máquinas afectadas por una versión. | `templateVersionId` obligatorio. | — | `200 TemplateImpact` | `RESOURCE_NOT_FOUND`. |
| ADM-014 | GET | `/api/v1/admin/integration-events` | Consultar eventos de integración. | Proveedor, estado, fecha, cursor. | — | `200 CursorPage<IntegrationEvent>` | `PERMISSION_DENIED`. |
| ADM-015 | POST | `/api/v1/admin/users/{userId}/password-reset-action` | Iniciar restablecimiento manual tras verificación externa. | `Idempotency-Key`. | `{verificationCaseId, revokeSessions:true}` | `202 Job` | `PERMISSION_DENIED`, `VALIDATION_ERROR`. |

## 12. Equipos, solicitudes, traslados y transferencias
La plantilla oficial y el código ICE24 OS solo se asignan durante aprobación por ICE24.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MAC-001 | GET | `/api/v1/equipment-requests` | Listar solicitudes de la cuenta. | Estado, cursor. | — | `200 CursorPage<EquipmentRequest>` | `PERMISSION_DENIED`. |
| MAC-002 | POST | `/api/v1/equipment-requests` | Crear solicitud en borrador. | `Idempotency-Key`. | `CreateEquipmentRequest` | `201 EquipmentRequest` | `ACCOUNT_READ_ONLY`. |
| MAC-003 | GET | `/api/v1/equipment-requests/{requestId}` | Consultar solicitud. | Path. | — | `200 EquipmentRequest` | `RESOURCE_NOT_FOUND`. |
| MAC-004 | PATCH | `/api/v1/equipment-requests/{requestId}` | Editar borrador o completar información solicitada. | `If-Match`. | `UpdateEquipmentRequest` | `200 EquipmentRequest` | `STATE_TRANSITION_INVALID`, `VERSION_CONFLICT`. |
| MAC-005 | POST | `/api/v1/equipment-requests/{requestId}/submit` | Enviar a validación ICE24. | `Idempotency-Key`. | `{confirmation:true}` | `200 EquipmentRequest` | `VALIDATION_ERROR`. |
| MAC-006 | GET | `/api/v1/machines` | Listar máquinas autorizadas. | Sucursal, estados, modelo, búsqueda, cursor. | — | `200 CursorPage<Machine>` | `PERMISSION_DENIED`. |
| MAC-007 | GET | `/api/v1/machines/{machineId}` | Consultar expediente base. | `include=systems,components,currentRestrictions`. | — | `200 Machine` | `RESOURCE_NOT_FOUND`. |
| MAC-008 | PATCH | `/api/v1/machines/{machineId}` | Actualizar datos operativos expresamente permitidos. | `If-Match`. | `UpdateMachineOperationalData` | `200 Machine` | `PERMISSION_DENIED`, `VERSION_CONFLICT`. |
| MAC-009 | POST | `/api/v1/machines/{machineId}/operational-status` | Cambiar estado operativo. | `Idempotency-Key`, `If-Match`. | `{status, reason?, expectedVersion}` | `200 Machine` | `STATE_TRANSITION_INVALID`. |
| MAC-010 | GET | `/api/v1/machines/{machineId}/status` | Obtener dimensiones de estado y causas. | Path. | — | `200 MachineStatusDetail` | `RESOURCE_NOT_FOUND`. |
| MAC-011 | GET | `/api/v1/machines/{machineId}/location-history` | Historial de ubicaciones. | Cursor, fechas. | — | `200 CursorPage<LocationPeriod>` | `PERMISSION_DENIED`. |
| MAC-012 | POST | `/api/v1/machines/{machineId}/moves` | Trasladar a otra sucursal conservando historial. | `Idempotency-Key`, `If-Match`. | `{toBranchId, effectiveAt, reason, evidenceFileIds}` | `201 LocationPeriod` | `STATE_TRANSITION_INVALID`. |
| MAC-013 | GET | `/api/v1/machines/{machineId}/ownership-history` | Historial de propiedad. | Cursor. | — | `200 CursorPage<OwnershipPeriod>` | `PERMISSION_DENIED`. |
| MAC-014 | POST | `/api/v1/machine-transfers` | Crear transferencia para revisión ICE24. | `Idempotency-Key`. | `CreateMachineTransferRequest` | `201 MachineTransfer` | `PERMISSION_DENIED`. |
| MAC-015 | GET | `/api/v1/machine-transfers/{transferId}` | Consultar transferencia. | Path. | — | `200 MachineTransfer` | `RESOURCE_NOT_FOUND`. |
| MAC-016 | PATCH | `/api/v1/machine-transfers/{transferId}` | Editar borrador. | `If-Match`. | `UpdateMachineTransferRequest` | `200 MachineTransfer` | `STATE_TRANSITION_INVALID`. |
| MAC-017 | POST | `/api/v1/admin/machine-transfers/{transferId}/approve` | Aprobar transferencia. | `Idempotency-Key`. | `{effectiveAt, commercialDataTransfer, confirmation:true}` | `200 MachineTransfer` | `VALIDATION_ERROR`. |
| MAC-018 | POST | `/api/v1/admin/machine-transfers/{transferId}/execute` | Ejecutar cambio de propiedad. | `Idempotency-Key`, `If-Match`. | `StateTransitionRequest` | `200 Machine` | `STATE_TRANSITION_INVALID`. |
| MAC-019 | POST | `/api/v1/machines/{machineId}/retire` | Retirar equipo sin borrar historial. | `Idempotency-Key`. | `StateTransitionRequest` | `200 Machine` | `STATE_TRANSITION_INVALID`. |
| MAC-020 | GET | `/api/v1/machines/{machineId}/timeline` | Línea de tiempo técnica, sanitaria y estructural. | Tipos, fechas, cursor. | — | `200 CursorPage<TimelineEvent>` | `PERMISSION_DENIED`. |

**Ejemplo — aprobar equipo**
```json
{
  "technicalModelId": "0192eb15-6faf-7ee0-a777-5cc77ea9f746",
  "templateVersionId": "0192eb27-12bc-72f6-8915-4598b7c3c1e3",
  "validationMethod": "documents",
  "validatedFileIds": ["0192eb3e-c494-7efc-a10f-b7ed6ade55ca"],
  "reviewNotes": "Serie y configuración validadas.",
  "initialOperationalStatus": "available",
  "confirmation": true
}
```

## 13. Modelos, componentes y plantillas
Solo ICE24 crea, modifica y publica plantillas oficiales.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TPL-001 | GET | `/api/v1/technical-models` | Listar modelos visibles. | Estado, tipo, página. | — | `200 Page<TechnicalModel>` | — |
| TPL-002 | POST | `/api/v1/admin/technical-models` | Crear modelo técnico. | `Idempotency-Key`. | `CreateTechnicalModelRequest` | `201 TechnicalModel` | `DUPLICATE_RESOURCE`. |
| TPL-003 | GET | `/api/v1/technical-models/{modelId}` | Consultar modelo. | Path. | — | `200 TechnicalModel` | `RESOURCE_NOT_FOUND`. |
| TPL-004 | PATCH | `/api/v1/admin/technical-models/{modelId}` | Actualizar modelo permitido. | `If-Match`. | `UpdateTechnicalModelRequest` | `200 TechnicalModel` | `VERSION_CONFLICT`. |
| TPL-005 | GET | `/api/v1/technical-models/{modelId}/template-versions` | Listar versiones. | Estado, página. | — | `200 Page<TemplateVersion>` | `RESOURCE_NOT_FOUND`. |
| TPL-006 | POST | `/api/v1/admin/technical-models/{modelId}/template-versions` | Crear borrador de versión. | `Idempotency-Key`. | `CreateTemplateVersionRequest` | `201 TemplateVersion` | `DUPLICATE_RESOURCE`. |
| TPL-007 | GET | `/api/v1/template-versions/{versionId}` | Consultar versión. | `include=systems,components,activities`. | — | `200 TemplateVersion` | `RESOURCE_NOT_FOUND`. |
| TPL-008 | PATCH | `/api/v1/admin/template-versions/{versionId}` | Editar borrador. | `If-Match`. | `UpdateTemplateVersionRequest` | `200 TemplateVersion` | `STATE_TRANSITION_INVALID`. |
| TPL-009 | GET | `/api/v1/admin/template-versions/{versionId}/impact` | Previsualizar máquinas y actividades afectadas. | Path. | — | `200 TemplateImpact` | `RESOURCE_NOT_FOUND`. |
| TPL-010 | POST | `/api/v1/admin/template-versions/{versionId}/publish` | Publicar y recalcular actividades futuras. | `Idempotency-Key`, `If-Match`. | `{effectiveFrom, changeSummary, confirmation:true}` | `202 Job` | `VALIDATION_ERROR`, `STATE_TRANSITION_INVALID`. |
| TPL-011 | POST | `/api/v1/admin/template-versions/{versionId}/supersede` | Marcar versión reemplazada cuando corresponda. | `Idempotency-Key`. | `StateTransitionRequest` | `200 TemplateVersion` | `STATE_TRANSITION_INVALID`. |
| TPL-012 | GET | `/api/v1/template-activities/{activityId}` | Consultar actividad y formulario. | Path. | — | `200 TemplateActivity` | `RESOURCE_NOT_FOUND`. |
| TPL-013 | POST | `/api/v1/admin/template-versions/{versionId}/activities` | Agregar actividad al borrador. | `Idempotency-Key`. | `CreateTemplateActivityRequest` | `201 TemplateActivity` | `STATE_TRANSITION_INVALID`. |
| TPL-014 | PATCH | `/api/v1/admin/template-activities/{activityId}` | Editar actividad de borrador. | `If-Match`. | `UpdateTemplateActivityRequest` | `200 TemplateActivity` | `STATE_TRANSITION_INVALID`. |
| TPL-015 | GET | `/api/v1/catalogs/components` | Consultar componentes catalogados. | Modelo, sistema, estado, página. | — | `200 Page<ComponentCatalogItem>` | — |
| TPL-016 | POST | `/api/v1/admin/catalogs/components` | Crear componente oficial. | `Idempotency-Key`. | `CreateComponentCatalogItem` | `201 ComponentCatalogItem` | `DUPLICATE_RESOURCE`. |
| TPL-017 | GET | `/api/v1/catalogs/units` | Consultar unidades permitidas. | Tipo. | — | `200 Page<UnitCatalogItem>` | — |
| TPL-018 | GET | `/api/v1/catalogs/analysis-parameters` | Consultar parámetros y límites visibles. | Tipo de análisis, versión. | — | `200 Page<AnalysisParameter>` | `PERMISSION_DENIED` para límites restringidos. |

## 14. Mantenimiento, tickets y órdenes de trabajo
Las órdenes previamente sincronizadas pueden continuar offline; la toma de nuevas responsabilidades y configuraciones requiere conexión.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MNT-001 | GET | `/api/v1/maintenance-tasks` | Listar calendario de mantenimiento. | Máquina, sucursal, responsable, estado, vencimiento, cursor. | — | `200 CursorPage<MaintenanceTask>` | `PERMISSION_DENIED`. |
| MNT-002 | GET | `/api/v1/maintenance-tasks/{taskId}` | Consultar tarea. | `include=template,evidence,workOrder`. | — | `200 MaintenanceTask` | `RESOURCE_NOT_FOUND`. |
| MNT-003 | POST | `/api/v1/maintenance-tasks/{taskId}/assign` | Asignar responsable. | `Idempotency-Key`, `If-Match`. | `{userId, reason?}` | `200 MaintenanceTask` | `STATE_TRANSITION_INVALID`. |
| MNT-004 | POST | `/api/v1/maintenance-tasks/{taskId}/start` | Iniciar atención. | `Idempotency-Key`. | `{deviceId?, offlinePackageRequested?}` | `200 MaintenanceTask` | `STATE_TRANSITION_INVALID`. |
| MNT-005 | GET | `/api/v1/tickets` | Listar tickets. | Máquina, prioridad, estado, técnico, cursor. | — | `200 CursorPage<Ticket>` | `PERMISSION_DENIED`. |
| MNT-006 | POST | `/api/v1/tickets` | Reportar incidencia. | `Idempotency-Key`. | `CreateTicketRequest` | `201 Ticket` | `VALIDATION_ERROR`. |
| MNT-007 | GET | `/api/v1/tickets/{ticketId}` | Consultar ticket. | Path. | — | `200 Ticket` | `RESOURCE_NOT_FOUND`. |
| MNT-008 | PATCH | `/api/v1/tickets/{ticketId}` | Actualizar campos permitidos. | `If-Match`. | `UpdateTicketRequest` | `200 Ticket` | `VERSION_CONFLICT`. |
| MNT-009 | POST | `/api/v1/tickets/{ticketId}/assign` | Asignar técnico. | `Idempotency-Key`. | `{technicianUserId}` | `200 Ticket` | `STATE_TRANSITION_INVALID`. |
| MNT-010 | POST | `/api/v1/tickets/{ticketId}/annul` | Anular con motivo. | `Idempotency-Key`. | `StateTransitionRequest` | `200 Ticket` | `STATE_TRANSITION_INVALID`. |
| MNT-011 | GET | `/api/v1/work-orders` | Listar órdenes. | Máquina, tarea, ticket, técnico, estado, cursor. | — | `200 CursorPage<WorkOrder>` | `PERMISSION_DENIED`. |
| MNT-012 | POST | `/api/v1/work-orders` | Crear orden desde tarea o ticket. | `Idempotency-Key`. | `CreateWorkOrderRequest` | `201 WorkOrder` | `VALIDATION_ERROR`. |
| MNT-013 | GET | `/api/v1/work-orders/{workOrderId}` | Consultar orden completa. | `include=template,parts,evidence,history`. | — | `200 WorkOrder` | `RESOURCE_NOT_FOUND`. |
| MNT-014 | PATCH | `/api/v1/work-orders/{workOrderId}` | Guardar diagnóstico, checklist y borrador. | `If-Match`. | `UpdateWorkOrderDraft` | `200 WorkOrder` | `VERSION_CONFLICT`, `VALIDATION_ERROR`. |
| MNT-015 | POST | `/api/v1/work-orders/{workOrderId}/start` | Iniciar orden. | `Idempotency-Key`. | `{startedAt?, deviceId?}` | `200 WorkOrder` | `STATE_TRANSITION_INVALID`. |
| MNT-016 | POST | `/api/v1/work-orders/{workOrderId}/parts` | Registrar piezas consumidas/instaladas/retiradas. | `Idempotency-Key`. | `AddWorkOrderPartRequest` | `201 WorkOrderPart` | `INSUFFICIENT_STOCK`, `VALIDATION_ERROR`. |
| MNT-017 | POST | `/api/v1/work-orders/{workOrderId}/complete` | Cerrar con datos y evidencias requeridos. | `Idempotency-Key`, `If-Match`. | `CompleteWorkOrderRequest` | `200 WorkOrder` | `WORK_ORDER_EVIDENCE_REQUIRED`, `STATE_TRANSITION_INVALID`. |
| MNT-018 | POST | `/api/v1/work-orders/{workOrderId}/complete-with-observations` | Cerrar con seguimiento. | `Idempotency-Key`. | `CompleteWorkOrderWithObservationsRequest` | `200 WorkOrder` | `VALIDATION_ERROR`. |
| MNT-019 | POST | `/api/v1/work-orders/{workOrderId}/mark-non-conforming` | Registrar resultado no conforme. | `Idempotency-Key`. | `{reason, evidenceFileIds, createTicket:true}` | `200 WorkOrder` | `VALIDATION_ERROR`. |
| MNT-020 | POST | `/api/v1/work-orders/{workOrderId}/correct` | Crear corrección versionada. | `Idempotency-Key`, `If-Match`. | `CorrectWorkOrderRequest` | `200 WorkOrder` | `STATE_TRANSITION_INVALID`. |
| MNT-021 | POST | `/api/v1/work-orders/{workOrderId}/annul` | Anular sin eliminar. | `Idempotency-Key`. | `StateTransitionRequest` | `200 WorkOrder` | `STATE_TRANSITION_INVALID`. |
| MNT-022 | GET | `/api/v1/machines/{machineId}/maintenance-summary` | Resumen técnico y próximos vencimientos. | Path, periodo. | — | `200 MaintenanceSummary` | `PERMISSION_DENIED`. |

**Ejemplo — completar orden**
```json
{
  "diagnosis": "Filtro de sedimentos saturado.",
  "activitiesPerformed": [
    {"activityCode": "FILTER_REPLACE", "completed": true, "notes": "Se reemplazó por lote F-2026-08."}
  ],
  "parts": [
    {"inventoryMovementId": "0192ec4a-10db-7f22-bfa6-f84055cfa511", "action": "installed"}
  ],
  "testResults": [
    {"name": "pressure", "value": "42.5", "unit": "psi", "result": "conforming"}
  ],
  "recommendation": "Revisar presión en 30 días.",
  "evidenceFileIds": ["0192ec61-9bbc-77f8-893b-c808518b4f20"],
  "confirmation": true,
  "expectedVersion": 7
}
```

## 15. Control sanitario, laboratorio y restricciones
Un resultado no conforme nunca se publica automáticamente; genera alerta, seguimiento y, según regla, ticket/acción/restricción.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SAN-001 | GET | `/api/v1/sanitary-tasks` | Listar bitácoras y controles pendientes. | Sucursal, máquina, tipo, estado, vencimiento, cursor. | — | `200 CursorPage<MaintenanceTask>` | `PERMISSION_DENIED`. |
| SAN-002 | GET | `/api/v1/logbook-templates/{activityId}` | Obtener formulario dinámico vigente. | Path. | — | `200 TemplateActivity` | `RESOURCE_NOT_FOUND`. |
| SAN-003 | POST | `/api/v1/logbook-entries` | Capturar bitácora. | `Idempotency-Key`. | `CreateLogbookEntryRequest` | `201 LogbookEntry` | `VALIDATION_ERROR`. |
| SAN-004 | GET | `/api/v1/logbook-entries/{entryId}` | Consultar entrada y versión. | `include=history,evidence`. | — | `200 LogbookEntry` | `RESOURCE_NOT_FOUND`. |
| SAN-005 | POST | `/api/v1/logbook-entries/{entryId}/correct` | Corregir conservando original. | `Idempotency-Key`, `If-Match`. | `{reason, values, evidenceFileIds?}` | `200 LogbookEntry` | `VERSION_CONFLICT`. |
| SAN-006 | POST | `/api/v1/logbook-entries/{entryId}/annul` | Anular con motivo. | `Idempotency-Key`. | `StateTransitionRequest` | `200 LogbookEntry` | `STATE_TRANSITION_INVALID`. |
| SAN-007 | GET | `/api/v1/laboratory-analyses` | Listar análisis. | Máquina, tipo, resultado, vigencia, cursor. | — | `200 CursorPage<LaboratoryAnalysis>` | `PERMISSION_DENIED`. |
| SAN-008 | POST | `/api/v1/laboratory-analyses` | Crear análisis y vincular documento original. | `Idempotency-Key`. | `CreateLaboratoryAnalysisRequest` | `201 LaboratoryAnalysis` | `VALIDATION_ERROR`. |
| SAN-009 | GET | `/api/v1/laboratory-analyses/{analysisId}` | Consultar análisis. | `include=document,nonConformity,correctiveActions`. | — | `200 LaboratoryAnalysis` | `RESOURCE_NOT_FOUND`. |
| SAN-010 | PATCH | `/api/v1/laboratory-analyses/{analysisId}` | Editar borrador. | `If-Match`. | `UpdateLaboratoryAnalysisDraft` | `200 LaboratoryAnalysis` | `STATE_TRANSITION_INVALID`. |
| SAN-011 | POST | `/api/v1/laboratory-analyses/{analysisId}/submit` | Enviar resultados a evaluación. | `Idempotency-Key`. | `{confirmation:true}` | `202 Job` o `200 LaboratoryAnalysis` | `VALIDATION_ERROR`. |
| SAN-012 | POST | `/api/v1/laboratory-analyses/{analysisId}/correct` | Crear corrección versionada. | `Idempotency-Key`, `If-Match`. | `CorrectLaboratoryAnalysisRequest` | `200 LaboratoryAnalysis` | `VERSION_CONFLICT`. |
| SAN-013 | GET | `/api/v1/non-conformities` | Listar no conformidades. | Riesgo, estado, origen, máquina, cursor. | — | `200 CursorPage<NonConformity>` | `PERMISSION_DENIED`. |
| SAN-014 | GET | `/api/v1/non-conformities/{id}` | Consultar evento. | Incluye acciones/restricción según permiso. | — | `200 NonConformity` | `RESOURCE_NOT_FOUND`. |
| SAN-015 | POST | `/api/v1/non-conformities/{id}/acknowledge` | Marcar enterado sin resolver. | `Idempotency-Key`. | `{acknowledgedAt?}` | `200 NonConformity` | `STATE_TRANSITION_INVALID`. |
| SAN-016 | POST | `/api/v1/corrective-actions` | Crear acción correctiva. | `Idempotency-Key`. | `CreateCorrectiveActionRequest` | `201 CorrectiveAction` | `VALIDATION_ERROR`. |
| SAN-017 | PATCH | `/api/v1/corrective-actions/{id}` | Actualizar plan en estado permitido. | `If-Match`. | `UpdateCorrectiveActionRequest` | `200 CorrectiveAction` | `VERSION_CONFLICT`. |
| SAN-018 | POST | `/api/v1/corrective-actions/{id}/complete` | Registrar ejecución y evidencia. | `Idempotency-Key`. | `{performedAt, verification, evidenceFileIds, confirmation:true}` | `200 CorrectiveAction` | `EVIDENCE_REQUIRED`. |
| SAN-019 | POST | `/api/v1/corrective-actions/{id}/verify` | Verificar y cerrar. | `Idempotency-Key`. | `{result, notes, followUpAnalysisId?}` | `200 CorrectiveAction` | `STATE_TRANSITION_INVALID`. |
| SAN-020 | POST | `/api/v1/admin/restrictions` | Aplicar restricción técnica/sanitaria. | `Idempotency-Key`. | `CreateRestrictionRequest` | `201 Restriction` | `PERMISSION_DENIED`, `VALIDATION_ERROR`. |
| SAN-021 | GET | `/api/v1/restrictions/{restrictionId}` | Consultar restricción. | Path. | — | `200 Restriction` | `RESOURCE_NOT_FOUND`. |
| SAN-022 | POST | `/api/v1/restrictions/{restrictionId}/reactivation-request` | Solicitar reactivación con aceptación. | `Idempotency-Key`. | `CreateReactivationRequest` | `201 ReactivationRequest` | `VALIDATION_ERROR`. |
| SAN-023 | POST | `/api/v1/admin/restrictions/{restrictionId}/lift` | Levantar restricción. | `Idempotency-Key`, `If-Match`. | `StateTransitionRequest` | `200 Restriction` | `STATE_TRANSITION_INVALID`. |
| SAN-024 | POST | `/api/v1/admin/restrictions/{restrictionId}/reapply` | Volver a restringir tras revisión. | `Idempotency-Key`. | `StateTransitionRequest` | `200 Restriction` | `STATE_TRANSITION_INVALID`. |
| SAN-025 | GET | `/api/v1/machines/{machineId}/sanitary-summary` | Resumen sanitario con factores. | Periodo. | — | `200 SanitarySummary` | `PERMISSION_DENIED`. |

**Ejemplo — análisis de laboratorio**
```json
{
  "machineId": "0192ebbd-6c94-7d56-9005-6164459297f9",
  "productType": "finished_ice",
  "samplingPoint": "dispensing_outlet",
  "laboratoryName": "Laboratorio Ejemplo",
  "laboratoryFolio": "LAB-2026-1042",
  "analysisType": "microbiological",
  "sampledAt": "2026-08-01T09:15:00-06:00",
  "resultedAt": "2026-08-04T16:20:00-06:00",
  "parameters": [
    {
      "parameterId": "0192ed00-7479-7fb0-b99d-02aad6ef204f",
      "name": "Coliformes totales",
      "unit": "NMP/100mL",
      "value": "0",
      "upperLimit": "0",
      "criterion": "NOM-201-SSA1-2015/v1",
      "result": "conforming"
    }
  ],
  "originalDocumentId": "0192ed14-8b86-7d7a-9d12-45df41082593"
}
```

## 16. Inventario, refacciones y consumibles
Los movimientos afectan existencias de forma transaccional y nunca se modifican; los errores se corrigen mediante movimientos compensatorios auditados.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| INV-001 | GET | `/api/v1/inventory-items` | Listar refacciones/consumibles. | Categoría, compatibilidad, estado, cursor. | — | `200 CursorPage<InventoryItem>` | `PERMISSION_DENIED`. |
| INV-002 | POST | `/api/v1/inventory-items` | Crear artículo de cuenta. | `Idempotency-Key`. | `CreateInventoryItemRequest` | `201 InventoryItem` | `DUPLICATE_RESOURCE`. |
| INV-003 | GET | `/api/v1/inventory-items/{itemId}` | Consultar artículo. | Path. | — | `200 InventoryItem` | `RESOURCE_NOT_FOUND`. |
| INV-004 | PATCH | `/api/v1/inventory-items/{itemId}` | Actualizar artículo/costos según permiso. | `If-Match`. | `UpdateInventoryItemRequest` | `200 InventoryItem` | `PERMISSION_DENIED`. |
| INV-005 | GET | `/api/v1/suppliers` | Listar proveedores. | Búsqueda, estado, cursor. | — | `200 CursorPage<Supplier>` | `PERMISSION_DENIED`. |
| INV-006 | POST | `/api/v1/suppliers` | Crear proveedor. | `Idempotency-Key`. | `CreateSupplierRequest` | `201 Supplier` | `PERMISSION_DENIED`. |
| INV-007 | GET | `/api/v1/warehouses` | Listar ubicaciones. | Tipo, sucursal, estado. | — | `200 Page<Warehouse>` | `PERMISSION_DENIED`. |
| INV-008 | POST | `/api/v1/warehouses` | Crear almacén. | `Idempotency-Key`. | `CreateWarehouseRequest` | `201 Warehouse` | `VALIDATION_ERROR`. |
| INV-009 | GET | `/api/v1/inventory-balances` | Consultar existencias. | Artículo, almacén, lote, bajo mínimo, cursor. | — | `200 CursorPage<InventoryBalance>` | `PERMISSION_DENIED`. |
| INV-010 | GET | `/api/v1/inventory-lots` | Listar lotes/caducidades. | Artículo, proveedor, caducidad. | — | `200 CursorPage<InventoryLot>` | `PERMISSION_DENIED`. |
| INV-011 | POST | `/api/v1/inventory-movements/purchases` | Registrar entrada/compra. | `Idempotency-Key`. | `CreatePurchaseMovementRequest` | `201 InventoryMovement` | `PERMISSION_DENIED`. |
| INV-012 | POST | `/api/v1/inventory-movements/consumptions` | Registrar consumo ligado o no a orden. | `Idempotency-Key`. | `CreateConsumptionMovementRequest` | `201 InventoryMovement` | `INSUFFICIENT_STOCK`. |
| INV-013 | POST | `/api/v1/inventory-movements/transfers` | Transferir entre almacenes. | `Idempotency-Key`. | `CreateInventoryTransferRequest` | `201 InventoryMovement[]` | `PERMISSION_DENIED`. |
| INV-014 | POST | `/api/v1/inventory-movements/adjustments` | Ajustar con motivo y auditoría. | `Idempotency-Key`. | `CreateInventoryAdjustmentRequest` | `201 InventoryMovement` | `PERMISSION_DENIED`. |
| INV-015 | POST | `/api/v1/inventory-movements/installations` | Instalar pieza en máquina. | `Idempotency-Key`. | `CreateInstallationMovementRequest` | `201 InventoryMovement` | `VALIDATION_ERROR`. |
| INV-016 | POST | `/api/v1/inventory-movements/removals` | Retirar pieza conservando condición/disposición. | `Idempotency-Key`. | `CreateRemovalMovementRequest` | `201 InventoryMovement` | `VALIDATION_ERROR`. |
| INV-017 | GET | `/api/v1/inventory-movements` | Listar movimientos. | Tipo, artículo, almacén, máquina, orden, fechas, cursor. | — | `200 CursorPage<InventoryMovement>` | `PERMISSION_DENIED`. |
| INV-018 | POST | `/api/v1/part-requests` | Crear solicitud de refacciones. | `Idempotency-Key`. | `CreatePartRequest` | `201 PartRequest` | `VALIDATION_ERROR`. |
| INV-019 | GET | `/api/v1/part-requests/{id}` | Consultar solicitud y folio. | Path. | — | `200 PartRequest` | `RESOURCE_NOT_FOUND`. |
| INV-020 | POST | `/api/v1/part-requests/{id}/whatsapp-message` | Generar mensaje prellenado, sin enviarlo automáticamente. | `Idempotency-Key`. | `{phone?, locale:"es-MX"}` | `200 {url,message}` | `VALIDATION_ERROR`. |

## 17. Archivos, documentos, versiones y publicación
Los binarios se cargan directamente al almacenamiento de objetos mediante sesiones temporales; no atraviesan la memoria de la API.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FIL-001 | POST | `/api/v1/files/upload-sessions` | Crear carga directa protegida. | `Idempotency-Key`. | `CreateUploadSessionRequest` | `201 UploadSession` | `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`. |
| FIL-002 | POST | `/api/v1/files/{fileId}/complete-upload` | Confirmar carga y comenzar validación/procesamiento. | `Idempotency-Key`. | `{uploadToken, sha256?}` | `202 Job` | `FILE_UPLOAD_MISMATCH`. |
| FIL-003 | GET | `/api/v1/files/{fileId}` | Consultar metadatos. | Path. | — | `200 FileObject` | `RESOURCE_NOT_FOUND`. |
| FIL-004 | POST | `/api/v1/files/{fileId}/download-sessions` | Autorizar descarga temporal. | `Idempotency-Key`. | `{version:"original\|optimized\|public", purpose}` | `201 {url,expiresAt}` | `PERMISSION_DENIED`, `FILE_NOT_AVAILABLE`. |
| FIL-005 | POST | `/api/v1/files/{fileId}/abort` | Abortar carga pendiente. | `Idempotency-Key`. | `{reason?}` | `204` | `STATE_TRANSITION_INVALID`. |
| DOC-001 | GET | `/api/v1/documents` | Listar documentos. | Tipo, máquina, sucursal, estado, visibilidad, vigencia, cursor. | — | `200 CursorPage<Document>` | `PERMISSION_DENIED`. |
| DOC-002 | POST | `/api/v1/documents` | Crear documento con primera versión. | `Idempotency-Key`. | `CreateDocumentRequest` | `201 Document` | `VALIDATION_ERROR`. |
| DOC-003 | GET | `/api/v1/documents/{documentId}` | Consultar documento. | `include=versions,publications`. | — | `200 Document` | `RESOURCE_NOT_FOUND`. |
| DOC-004 | PATCH | `/api/v1/documents/{documentId}` | Actualizar metadatos editables. | `If-Match`. | `UpdateDocumentRequest` | `200 Document` | `VERSION_CONFLICT`. |
| DOC-005 | POST | `/api/v1/documents/{documentId}/versions` | Agregar versión corregida/sustituta. | `Idempotency-Key`. | `CreateDocumentVersionRequest` | `201 DocumentVersion` | `VALIDATION_ERROR`. |
| DOC-006 | POST | `/api/v1/documents/{documentId}/submit-review` | Enviar a revisión. | `Idempotency-Key`. | `{confirmation:true}` | `200 Document` | `STATE_TRANSITION_INVALID`. |
| DOC-007 | POST | `/api/v1/documents/{documentId}/mark-non-conforming` | Marcar no conforme sin publicar. | `Idempotency-Key`. | `StateTransitionRequest` | `200 Document` | `PERMISSION_DENIED`. |
| DOC-008 | POST | `/api/v1/documents/{documentId}/correct` | Crear corrección y conservar anterior. | `Idempotency-Key`, `If-Match`. | `{reason,newFileId,metadataChanges?}` | `201 DocumentVersion` | `VERSION_CONFLICT`. |
| DOC-009 | POST | `/api/v1/documents/{documentId}/annul` | Anular documento. | `Idempotency-Key`. | `StateTransitionRequest` | `200 Document` | `STATE_TRANSITION_INVALID`. |
| DOC-010 | POST | `/api/v1/documents/{documentId}/public-preview` | Generar/consultar versión protegida antes de publicar. | `Idempotency-Key`. | `{redactionProfile, watermark:true}` | `202 Job` | `VALIDATION_ERROR`. |
| DOC-011 | POST | `/api/v1/documents/{documentId}/publish` | Publicar versión autorizada. | `Idempotency-Key`, `If-Match`. | `{versionId, publicSections, confirmation:true}` | `200 Document` | `PUBLIC_VERSION_REQUIRED`, `NON_CONFORMING_CANNOT_AUTO_PUBLISH`. |
| DOC-012 | POST | `/api/v1/documents/{documentId}/withdraw` | Retirar del portal sin eliminar. | `Idempotency-Key`. | `StateTransitionRequest` | `200 Document` | `STATE_TRANSITION_INVALID`. |
| DOC-013 | GET | `/api/v1/documents/{documentId}/download-history` | Consultar descargas autorizadas. | Fecha, público/privado, cursor. | — | `200 CursorPage<DownloadEvent>` | `PERMISSION_DENIED`. |

**Ejemplo — crear sesión de carga**
```json
{
  "fileName": "analisis_microbiologico_agosto_2026.pdf",
  "mediaType": "application/pdf",
  "sizeBytes": 1839204,
  "purpose": "laboratory_analysis_original",
  "relatedResource": {
    "type": "machine",
    "id": "0192ebbd-6c94-7d56-9005-6164459297f9"
  }
}
```

**Respuesta**
```json
{
  "fileId": "0192ed14-8b86-7d7a-9d12-45df41082593",
  "uploadUrl": "https://storage.example/temporary-signed-url",
  "method": "PUT",
  "requiredHeaders": {"Content-Type": "application/pdf"},
  "expiresAt": "2026-08-06T02:10:00Z",
  "maximumSizeBytes": 26214400
}
```

## 18. Reportes, programaciones, exportaciones y trabajos
La vista previa y el PDF deben usar la misma plantilla y configuración congelada.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RPT-001 | GET | `/api/v1/report-types` | Listar tipos y secciones autorizadas. | Módulo, privacidad. | — | `200 Page<ReportType>` | `PERMISSION_DENIED`. |
| RPT-002 | POST | `/api/v1/reports` | Solicitar generación. | `Idempotency-Key`. | `ReportRequest` | `202 Job` | `VALIDATION_ERROR`, `ACCOUNT_READ_ONLY`. |
| RPT-003 | GET | `/api/v1/reports` | Listar reportes generados. | Tipo, estado, periodo, máquina, cursor. | — | `200 CursorPage<Report>` | `PERMISSION_DENIED`. |
| RPT-004 | GET | `/api/v1/reports/{reportId}` | Consultar reporte. | Path. | — | `200 Report` | `RESOURCE_NOT_FOUND`. |
| RPT-005 | GET | `/api/v1/reports/{reportId}/preview` | Obtener vista previa protegida. | Path. | — | `200 HTML link metadata` | `REPORT_NOT_READY`. |
| RPT-006 | POST | `/api/v1/reports/{reportId}/download-sessions` | Autorizar PDF. | `Idempotency-Key`. | `{purpose}` | `201 {url,expiresAt}` | `PERMISSION_DENIED`. |
| RPT-007 | POST | `/api/v1/reports/{reportId}/retry` | Reintentar generación fallida. | `Idempotency-Key`. | `{reason?}` | `202 Job` | `STATE_TRANSITION_INVALID`. |
| RPT-008 | GET | `/api/v1/report-schedules` | Listar programaciones. | Tipo, estado, cursor. | — | `200 CursorPage<ReportSchedule>` | `PERMISSION_DENIED`. |
| RPT-009 | POST | `/api/v1/report-schedules` | Programar reporte. | `Idempotency-Key`. | `CreateReportScheduleRequest` | `201 ReportSchedule` | `VALIDATION_ERROR`. |
| RPT-010 | PATCH | `/api/v1/report-schedules/{id}` | Actualizar programación. | `If-Match`. | `UpdateReportScheduleRequest` | `200 ReportSchedule` | `VERSION_CONFLICT`. |
| RPT-011 | POST | `/api/v1/report-schedules/{id}/pause` | Pausar. | `Idempotency-Key`. | `StateTransitionRequest` | `200 ReportSchedule` | `STATE_TRANSITION_INVALID`. |
| RPT-012 | POST | `/api/v1/report-schedules/{id}/resume` | Reanudar. | `Idempotency-Key`. | `StateTransitionRequest` | `200 ReportSchedule` | `STATE_TRANSITION_INVALID`. |
| RPT-013 | POST | `/api/v1/exports` | Solicitar exportación completa. | `Idempotency-Key`. | `{scope:"full_account", includeAudit:true, confirmation:true}` | `202 Job` | `PERMISSION_DENIED`. |
| RPT-014 | GET | `/api/v1/exports/{exportId}` | Consultar estado/expiración. | Path. | — | `200 Export` | `RESOURCE_NOT_FOUND`. |
| RPT-015 | POST | `/api/v1/exports/{exportId}/download-sessions` | Descargar paquete disponible por siete días. | `Idempotency-Key`. | `{}` | `201 {url,expiresAt}` | `EXPORT_EXPIRED`. |
| JOB-001 | GET | `/api/v1/jobs/{jobId}` | Consultar progreso de cualquier trabajo visible. | Path. | — | `200 Job` | `RESOURCE_NOT_FOUND`. |
| JOB-002 | POST | `/api/v1/jobs/{jobId}/cancel` | Cancelar trabajo cancelable. | `Idempotency-Key`. | `{reason}` | `200 Job` | `STATE_TRANSITION_INVALID`. |

**Ejemplo — solicitar reporte**
```json
{
  "reportType": "machine_compliance",
  "period": {"from": "2026-01-01", "to": "2026-08-05"},
  "accountId": "0192e8a8-0a3b-7f01-a30f-779c2b7aa4e1",
  "machineIds": ["0192ebbd-6c94-7d56-9005-6164459297f9"],
  "sections": ["machine_identity", "maintenance", "sanitary_control", "laboratory"],
  "includeAttachments": true,
  "includePhotos": true,
  "privacyLevel": "private",
  "watermark": "optional",
  "financialData": "exclude",
  "locale": "es-MX"
}
```

## 19. Ventas e importación de Excel
No se incorporan filas hasta que exista vista previa y confirmación explícita.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SAL-001 | POST | `/api/v1/sales-imports` | Crear importación desde Excel disponible. | `Idempotency-Key`. | `{machineId, sourceFileId}` | `202 Job` | `UNRECOGNIZED_EXCEL_FORMAT`. |
| SAL-002 | GET | `/api/v1/sales-imports` | Listar importaciones. | Máquina, estado, periodo, cursor. | — | `200 CursorPage<SalesImport>` | `PERMISSION_DENIED`. |
| SAL-003 | GET | `/api/v1/sales-imports/{importId}` | Consultar resumen. | Path. | — | `200 SalesImport` | `RESOURCE_NOT_FOUND`. |
| SAL-004 | GET | `/api/v1/sales-imports/{importId}/preview` | Consultar filas nuevas, duplicadas y con error. | Tipo de fila, cursor. | — | `200 CursorPage<SalesImportPreviewRow>` | `IMPORT_PREVIEW_NOT_READY`. |
| SAL-005 | POST | `/api/v1/sales-imports/{importId}/confirm` | Confirmar importación. | `Idempotency-Key`, `If-Match`. | `{confirmation:true}` | `202 Job` | `STATE_TRANSITION_INVALID`. |
| SAL-006 | POST | `/api/v1/sales-imports/{importId}/annul` | Retirar datos de paneles conservando historial. | `Idempotency-Key`. | `StateTransitionRequest` | `202 Job` | `STATE_TRANSITION_INVALID`. |
| SAL-007 | GET | `/api/v1/sales` | Consultar ventas activas. | Máquina, sucursal, fechas, producto, pago, cursor. | — | `200 CursorPage<Sale>` | `PERMISSION_DENIED`. |
| SAL-008 | GET | `/api/v1/sales/summary` | Agregados por periodo. | Dimensión enumerada, periodo, máquina/sucursal. | — | `200 SalesSummary` | `VALIDATION_ERROR`. |
| SAL-009 | GET | `/api/v1/sales/comparisons` | Comparar periodos/sucursales. | Dos periodos, dimensión. | — | `200 SalesComparison` | `VALIDATION_ERROR`. |
| SAL-010 | GET | `/api/v1/admin/sales-import-adapters` | Listar formatos configurados. | Modelo, estado. | — | `200 Page<SalesImportAdapter>` | `PERMISSION_DENIED`. |
| SAL-011 | POST | `/api/v1/admin/sales-import-adapters` | Crear adaptador de formato sin cambiar resto del sistema. | `Idempotency-Key`. | `CreateSalesImportAdapterRequest` | `201 SalesImportAdapter` | `VALIDATION_ERROR`. |

## 20. Tarjetas, recargas y control administrativo
La API nunca denomina este valor “saldo real”; representa exclusivamente movimientos capturados.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CRD-001 | GET | `/api/v1/cards` | Listar tarjetas. | Máquina, titular, estado, cursor. | — | `200 CursorPage<Card>` | `PERMISSION_DENIED`. |
| CRD-002 | POST | `/api/v1/cards` | Registrar tarjeta física para una máquina. | `Idempotency-Key`. | `{folio,machineId}` | `201 Card` | `DUPLICATE_RESOURCE`. |
| CRD-003 | GET | `/api/v1/cards/{cardId}` | Consultar saldo administrativo e historial autorizado. | `include=currentAssignment`. | — | `200 Card` | `RESOURCE_NOT_FOUND`. |
| CRD-004 | POST | `/api/v1/cards/{cardId}/assignments` | Asignar titular. | `Idempotency-Key`. | `CreateCardAssignmentRequest` | `201 CardAssignment` | `CARD_MACHINE_MISMATCH`. |
| CRD-005 | POST | `/api/v1/cards/{cardId}/reassign` | Cerrar asignación y abrir nueva sin mover historia. | `Idempotency-Key`. | `{newHolderType,newHolderId,effectiveAt,reason}` | `201 CardAssignment` | `STATE_TRANSITION_INVALID`. |
| CRD-006 | POST | `/api/v1/cards/{cardId}/deactivate` | Desactivar tarjeta. | `Idempotency-Key`. | `StateTransitionRequest` | `200 Card` | `STATE_TRANSITION_INVALID`. |
| CRD-007 | GET | `/api/v1/card-movements` | Listar movimientos. | Tarjeta, tipo, máquina, titular, fechas, cursor. | — | `200 CursorPage<CardMovement>` | `PERMISSION_DENIED`. |
| CRD-008 | POST | `/api/v1/cards/{cardId}/recharges` | Registrar recarga/bonificación. | `Idempotency-Key`. | `CreateCardRechargeRequest` | `201 CardMovement` | `NEGATIVE_BALANCE_NOT_ALLOWED`. |
| CRD-009 | POST | `/api/v1/cards/{cardId}/withdrawals` | Registrar retiro. | `Idempotency-Key`. | `CreateCardWithdrawalRequest` | `201 CardMovement` | `NEGATIVE_BALANCE_NOT_ALLOWED`. |
| CRD-010 | POST | `/api/v1/card-transfers` | Transferir entre tarjetas de la misma máquina. | `Idempotency-Key`. | `CreateSameMachineCardTransfer` | `201 {outMovement,inMovement}` | `CARD_MACHINE_MISMATCH`. |
| CRD-011 | POST | `/api/v1/cross-machine-card-movements` | Documentar retiro y recarga entre máquinas. | `Idempotency-Key`. | `CreateCrossMachineCardMovement` | `201 {withdrawal,recharge}` | `VALIDATION_ERROR`. |
| CRD-012 | GET | `/api/v1/cards/{cardId}/administrative-balance` | Obtener total con advertencia. | Path. | — | `200 {balance,warning}` | `RESOURCE_NOT_FOUND`. |

**Ejemplo — recarga**
```json
{
  "moneyReceived": {"amountMinor": 50000, "currency": "MXN", "kind": "actual"},
  "balanceAmount": {"amountMinor": 60000, "currency": "MXN", "kind": "administrative_balance"},
  "bonusAmount": {"amountMinor": 10000, "currency": "MXN", "kind": "administrative_balance"},
  "occurredAt": "2026-08-05T18:45:00-06:00",
  "evidenceFileIds": [],
  "confirmation": true
}
```

## 21. Negocios, restaurantes y datos fiscales
La privacidad entre propietarios se aplica a cada respuesta; un propietario no recibe precios, pedidos o repartidores de otros.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BUS-001 | GET | `/api/v1/consumer-businesses` | Listar negocios relacionados con la cuenta. | Estado, búsqueda, cursor. | — | `200 CursorPage<ConsumerBusiness>` | `PERMISSION_DENIED`. |
| BUS-002 | POST | `/api/v1/consumer-businesses` | Crear negocio consumidor; no disponible para repartidor. | `Idempotency-Key`. | `CreateConsumerBusinessRequest` | `201 ConsumerBusiness` | `PERMISSION_DENIED`. |
| BUS-003 | GET | `/api/v1/consumer-businesses/{businessId}` | Consultar relación visible. | Path. | — | `200 ConsumerBusiness` | `RESOURCE_NOT_FOUND`. |
| BUS-004 | PATCH | `/api/v1/consumer-businesses/{businessId}` | Actualizar datos permitidos. | `If-Match`. | `UpdateConsumerBusinessRequest` | `200 ConsumerBusiness` | `VERSION_CONFLICT`. |
| BUS-005 | GET | `/api/v1/consumer-businesses/{businessId}/branches` | Listar sucursales consumidoras. | Estado, cursor. | — | `200 CursorPage<ConsumerBranch>` | `PERMISSION_DENIED`. |
| BUS-006 | POST | `/api/v1/consumer-businesses/{businessId}/branches` | Crear sucursal consumidora. | `Idempotency-Key`. | `CreateConsumerBranchRequest` | `201 ConsumerBranch` | `VALIDATION_ERROR`. |
| BUS-007 | PATCH | `/api/v1/consumer-branches/{branchId}` | Actualizar sucursal. | `If-Match`. | `UpdateConsumerBranchRequest` | `200 ConsumerBranch` | `VERSION_CONFLICT`. |
| BUS-008 | POST | `/api/v1/consumer-businesses/{businessId}/users` | Invitar usuario interno del negocio. | `Idempotency-Key`. | `CreateBusinessUserInvitation` | `201 UserInvitation` | `DUPLICATE_RESOURCE`. |
| BUS-009 | GET | `/api/v1/consumer-businesses/{businessId}/machine-associations` | Listar asociaciones visibles para este propietario. | Estado, cursor. | — | `200 CursorPage<BusinessMachineAssociation>` | `PERMISSION_DENIED`. |
| BUS-010 | POST | `/api/v1/consumer-businesses/{businessId}/machine-association-requests` | Solicitar asociación a máquina autorizada. | `Idempotency-Key`. | `{machineId, consumerBranchIds}` | `201 BusinessMachineAssociation` | `PERMISSION_DENIED`. |
| BUS-011 | POST | `/api/v1/business-machine-associations/{id}/approve` | Aprobar asociación por propietario. | `Idempotency-Key`. | `{approvedBranchIds}` | `200 BusinessMachineAssociation` | `STATE_TRANSITION_INVALID`. |
| BUS-012 | POST | `/api/v1/business-machine-associations/{id}/revoke` | Revocar relación futura sin borrar pedidos históricos. | `Idempotency-Key`. | `StateTransitionRequest` | `200 BusinessMachineAssociation` | `STATE_TRANSITION_INVALID`. |
| BUS-013 | GET | `/api/v1/consumer-businesses/{businessId}/tax-profile` | Consultar datos fiscales según permiso. | Path. | — | `200 TaxProfile` | `PERMISSION_DENIED`. |
| BUS-014 | PUT | `/api/v1/consumer-businesses/{businessId}/tax-profile` | Crear/reemplazar versión fiscal. | `If-Match` cuando exista. | `TaxProfile` | `200 TaxProfile` | `VALIDATION_ERROR`. |
| BUS-015 | POST | `/api/v1/invoice-requests` | Registrar solicitud de factura; no timbra CFDI. | `Idempotency-Key`. | `CreateInvoiceRequest` | `201 InvoiceRequest` | `VALIDATION_ERROR`. |

## 22. Productos, precios, disponibilidad y tarifas
Los productos de entrega se limitan a bolsas de hielo. La disponibilidad es manual/aproximada porque ICE24 OS no conoce inventario de hielo en tiempo real.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAT-001 | GET | `/api/v1/machines/{machineId}/products` | Listar productos de hielo. | Estado/availability. | — | `200 Page<MachineProduct>` | `PERMISSION_DENIED`. |
| CAT-002 | POST | `/api/v1/machines/{machineId}/products` | Crear oferta de bolsa de hielo. | `Idempotency-Key`. | `CreateMachineProductRequest` | `201 MachineProduct` | `WATER_DELIVERY_OUT_OF_SCOPE`. |
| CAT-003 | GET | `/api/v1/machine-products/{productId}` | Consultar producto. | Path. | — | `200 MachineProduct` | `RESOURCE_NOT_FOUND`. |
| CAT-004 | PATCH | `/api/v1/machine-products/{productId}` | Actualizar precio, límites o disponibilidad. | `If-Match`. | `UpdateMachineProductRequest` | `200 MachineProduct` | `VERSION_CONFLICT`. |
| CAT-005 | POST | `/api/v1/machine-products/{productId}/activate` | Activar. | `Idempotency-Key`. | `StateTransitionRequest` | `200 MachineProduct` | `STATE_TRANSITION_INVALID`. |
| CAT-006 | POST | `/api/v1/machine-products/{productId}/deactivate` | Desactivar. | `Idempotency-Key`. | `StateTransitionRequest` | `200 MachineProduct` | `STATE_TRANSITION_INVALID`. |
| CAT-007 | GET | `/api/v1/machine-products/{productId}/special-prices` | Listar precios especiales. | Negocio, estado. | — | `200 Page<SpecialPrice>` | `PERMISSION_DENIED`. |
| CAT-008 | POST | `/api/v1/machine-products/{productId}/special-prices` | Crear precio por cliente. | `Idempotency-Key`. | `{businessId, price, validFrom, validTo?}` | `201 SpecialPrice` | `DUPLICATE_RESOURCE`. |
| CAT-009 | PATCH | `/api/v1/special-prices/{id}` | Actualizar vigencia/precio. | `If-Match`. | `UpdateSpecialPriceRequest` | `200 SpecialPrice` | `VERSION_CONFLICT`. |
| CAT-010 | GET | `/api/v1/machines/{machineId}/delivery-zones` | Listar zonas/tarifas. | Estado. | — | `200 Page<DeliveryZone>` | `PERMISSION_DENIED`. |
| CAT-011 | POST | `/api/v1/machines/{machineId}/delivery-zones` | Crear zona/tarifa. | `Idempotency-Key`. | `CreateDeliveryZoneRequest` | `201 DeliveryZone` | `VALIDATION_ERROR`. |
| CAT-012 | PATCH | `/api/v1/delivery-zones/{zoneId}` | Actualizar zona. | `If-Match`. | `UpdateDeliveryZoneRequest` | `200 DeliveryZone` | `VERSION_CONFLICT`. |
| CAT-013 | POST | `/api/v1/delivery-zones/{zoneId}/deactivate` | Desactivar. | `Idempotency-Key`. | `StateTransitionRequest` | `200 DeliveryZone` | `STATE_TRANSITION_INVALID`. |

## 23. Pedidos de hielo
La toma debe ser atómica. Después de tomar, el repartidor puede ejecutar hitos offline; la sincronización usa las mismas reglas de transición.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ORD-001 | GET | `/api/v1/consumer-branches/{branchId}/machine-recommendations` | Ordenar máquinas ya asociadas. | Producto, cantidad, destino. | — | `200 MachineRecommendation[]` | `NO_ASSOCIATED_MACHINE`. |
| ORD-002 | POST | `/api/v1/orders` | Crear pedido si se cumplen elegibilidad y disponibilidad. | `Idempotency-Key`. | `CreateOrderRequest` | `201 Order` | `NO_ELIGIBLE_DRIVER`, `MACHINE_RESTRICTED`, `PRODUCT_UNAVAILABLE`. |
| ORD-003 | GET | `/api/v1/orders` | Listar pedidos visibles. | Rol, máquina, negocio, repartidor, estado, fechas, cursor. | — | `200 CursorPage<Order>` | `PERMISSION_DENIED`. |
| ORD-004 | GET | `/api/v1/orders/{orderId}` | Consultar pedido con campos filtrados por rol. | `include=history,incidents`. | — | `200 Order` | `RESOURCE_NOT_FOUND`. |
| ORD-005 | POST | `/api/v1/orders/{orderId}/take` | Tomar atómicamente. Requiere conexión. | `Idempotency-Key`, `If-Match`. | `{driverId, location}` | `200 Order` | `ORDER_ALREADY_TAKEN`, `DRIVER_NOT_ELIGIBLE`. |
| ORD-006 | POST | `/api/v1/orders/{orderId}/release` | Liberar antes de compra según regla. | `Idempotency-Key`. | `StateTransitionRequest` | `200 Order` | `STATE_TRANSITION_INVALID`. |
| ORD-007 | POST | `/api/v1/orders/{orderId}/start-collection` | Iniciar recolección. | `Idempotency-Key`. | `{occurredAt, location?}` | `200 Order` | `STATE_TRANSITION_INVALID`. |
| ORD-008 | POST | `/api/v1/orders/{orderId}/mark-collected` | Confirmar producto recogido, cantidad e importe de tarjeta. | `Idempotency-Key`. | `MarkOrderCollectedRequest` | `200 Order` | `CARD_MACHINE_MISMATCH`. |
| ORD-009 | POST | `/api/v1/orders/{orderId}/start-route` | Marcar en ruta. | `Idempotency-Key`. | `{occurredAt, location}` | `200 Order` | `STATE_TRANSITION_INVALID`. |
| ORD-010 | POST | `/api/v1/orders/{orderId}/deliver` | Completar entrega con código y evidencia. | `Idempotency-Key`. | `DeliverOrderRequest` | `200 Order` | `INVALID_DELIVERY_CODE`, `EVIDENCE_REQUIRED`. |
| ORD-011 | POST | `/api/v1/orders/{orderId}/partial-delivery` | Registrar parcial con aceptación. | `Idempotency-Key`. | `PartialDeliveryRequest` | `200 Order` | `VALIDATION_ERROR`. |
| ORD-012 | POST | `/api/v1/orders/{orderId}/cancel` | Cancelar antes de producto recogido. | `Idempotency-Key`. | `{reason, requestedBy}` | `200 Order` | `CANCELLATION_REQUIRES_AUTHORIZATION`. |
| ORD-013 | POST | `/api/v1/orders/{orderId}/authorized-cancellation` | Autorizar cancelación posterior o registrar resolución. | `Idempotency-Key`. | `{decision, reason, resolution}` | `200 Order` | `PERMISSION_DENIED`. |
| ORD-014 | POST | `/api/v1/orders/{orderId}/incidents` | Registrar incidencia. | `Idempotency-Key`. | `CreateOrderIncidentRequest` | `201 OrderIncident` | `VALIDATION_ERROR`. |
| ORD-015 | GET | `/api/v1/orders/{orderId}/history` | Historial de transiciones. | Cursor. | — | `200 CursorPage<OrderStatusEvent>` | `PERMISSION_DENIED`. |
| ORD-016 | POST | `/api/v1/orders/{orderId}/close` | Cerrar después de entrega/incidencia resuelta. | `Idempotency-Key`. | `{confirmation:true}` | `200 Order` | `STATE_TRANSITION_INVALID`. |

**Ejemplo — crear pedido**
```json
{
  "consumerBranchId": "0192ee20-3f97-7e1b-aea6-6d347be38df7",
  "machineId": "0192ebbd-6c94-7d56-9005-6164459297f9",
  "lines": [
    {"machineProductId": "0192ee39-cc00-70fe-8d40-24e1bf789f1a", "quantity": "8"}
  ],
  "deliveryAddress": {
    "line1": "Calle Restaurante 88",
    "municipality": "Córdoba",
    "state": "Veracruz",
    "postalCode": "94500",
    "country": "MX",
    "coordinates": {"latitude": 18.9001, "longitude": -96.9410, "source": "gps"}
  },
  "selectedDeliveryZoneId": "0192ee4a-8ea4-7c55-88a6-d08a586dcb2d",
  "confirmation": true
}
```

## 24. Repartidores, ubicación y ventas externas
La ubicación se usa durante pedido activo y para elegibilidad cuando el repartidor está disponible, conforme a permisos y privacidad.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DRV-001 | GET | `/api/v1/driver-profile` | Consultar perfil del repartidor autenticado. | — | — | `200 DriverProfile` | `PERMISSION_DENIED`. |
| DRV-002 | PATCH | `/api/v1/driver-profile/status` | Cambiar disponibilidad. | `If-Match`. | `{status, until?}` | `200 DriverProfile` | `STATE_TRANSITION_INVALID`. |
| DRV-003 | POST | `/api/v1/driver-profile/location` | Actualizar ubicación cuando la política lo permite. | `Idempotency-Key`. | `GeoPoint` | `204` | `LOCATION_PERMISSION_REQUIRED`. |
| DRV-004 | GET | `/api/v1/driver-machine-associations` | Listar relaciones. | Estado, propietario, máquina, cursor. | — | `200 CursorPage<DriverMachineAssociation>` | `PERMISSION_DENIED`. |
| DRV-005 | POST | `/api/v1/driver-machine-associations` | Crear/solicitar relación con tarjeta de máquina. | `Idempotency-Key`. | `CreateDriverMachineAssociation` | `201 DriverMachineAssociation` | `CARD_MACHINE_MISMATCH`. |
| DRV-006 | POST | `/api/v1/driver-machine-associations/{id}/activate` | Activar relación. | `Idempotency-Key`. | `StateTransitionRequest` | `200 DriverMachineAssociation` | `PERMISSION_DENIED`. |
| DRV-007 | POST | `/api/v1/driver-machine-associations/{id}/deactivate` | Desactivar. | `Idempotency-Key`. | `StateTransitionRequest` | `200 DriverMachineAssociation` | `STATE_TRANSITION_INVALID`. |
| DRV-008 | GET | `/api/v1/driver/eligible-orders` | Listar pedidos disponibles para tomar. | Zona, máquina, distancia, cursor. | — | `200 CursorPage<Order>` | `LOCATION_REQUIRED` cuando se configuró zona. |
| DRV-009 | POST | `/api/v1/external-sales` | Registrar venta externa opcional. | `Idempotency-Key`. | `CreateExternalSaleRequest` | `201 ExternalSale` | `VALIDATION_ERROR`. |
| DRV-010 | GET | `/api/v1/external-sales` | Listar ventas propias o autorizadas. | Máquina, fechas, cursor. | — | `200 CursorPage<ExternalSale>` | `PERMISSION_DENIED`. |
| DRV-011 | GET | `/api/v1/driver/estimated-earnings` | Calcular estimación con advertencia. | Periodo, máquina. | — | `200 EstimatedEarnings` | `INSUFFICIENT_DATA`. |

## 25. Analítica e indicadores
Cada resultado expone factores, versión de fórmula y suficiencia de datos. Un evento crítico no queda oculto por promedios favorables.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ANA-001 | GET | `/api/v1/dashboards/operational` | Panel operativo. | Ámbito, periodo. | — | `200 OperationalDashboard` | `PERMISSION_DENIED`. |
| ANA-002 | GET | `/api/v1/dashboards/technical` | Indicadores técnicos. | Ámbito, periodo. | — | `200 IndicatorResult[]` | `PERMISSION_DENIED`. |
| ANA-003 | GET | `/api/v1/dashboards/sanitary` | Indicadores sanitarios. | Ámbito, periodo. | — | `200 IndicatorResult[]` | `PERMISSION_DENIED`. |
| ANA-004 | GET | `/api/v1/dashboards/commercial` | Ventas, pedidos y reparto. | Ámbito, periodo. | — | `200 CommercialDashboard` | `PERMISSION_DENIED`. |
| ANA-005 | GET | `/api/v1/indicators/{indicatorCode}/results` | Serie histórica versionada. | Ámbito, periodo, cursor. | — | `200 CursorPage<IndicatorResult>` | `RESOURCE_NOT_FOUND`. |
| ANA-006 | GET | `/api/v1/analytics/heatmap` | Datos georreferenciados agregados. | Métrica enumerada, periodo, granularidad. | — | `200 HeatmapDataset` | `INSUFFICIENT_DATA`. |
| ANA-007 | GET | `/api/v1/analytics/demand-forecast` | Pronóstico solo si el historial es suficiente. | Máquina/zona, horizonte permitido. | — | `200 DemandForecast` | `INSUFFICIENT_DATA`, `FEATURE_NOT_ENABLED`. |
| ANA-008 | GET | `/api/v1/admin/indicator-definitions` | Listar fórmulas/ponderaciones. | Estado, página. | — | `200 Page<IndicatorDefinition>` | `PERMISSION_DENIED`. |
| ANA-009 | POST | `/api/v1/admin/indicator-definitions` | Crear versión de fórmula. | `Idempotency-Key`. | `CreateIndicatorDefinitionRequest` | `201 IndicatorDefinition` | `VALIDATION_ERROR`. |
| ANA-010 | POST | `/api/v1/admin/indicator-definitions/{id}/publish` | Publicar versión. | `Idempotency-Key`. | `{effectiveFrom, confirmation:true}` | `202 Job` | `STATE_TRANSITION_INVALID`. |

## 26. Notificaciones, alertas y escalamiento
Las alertas críticas permanecen fijadas hasta “Enterado”; resolver requiere cerrar el proceso relacionado.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NOT-001 | GET | `/api/v1/notifications` | Listar avisos del usuario. | Estado, prioridad, tipo, cursor. | — | `200 CursorPage<Notification>` | `AUTHENTICATION_REQUIRED`. |
| NOT-002 | GET | `/api/v1/notifications/{id}` | Consultar aviso. | Path. | — | `200 Notification` | `RESOURCE_NOT_FOUND`. |
| NOT-003 | POST | `/api/v1/notifications/{id}/read` | Marcar leído. | `Idempotency-Key`. | `{readAt?}` | `200 Notification` | `STATE_TRANSITION_INVALID`. |
| NOT-004 | POST | `/api/v1/notifications/{id}/acknowledge` | Marcar enterado; no resuelve. | `Idempotency-Key`. | `{acknowledgedAt?}` | `200 Notification` | `STATE_TRANSITION_INVALID`. |
| NOT-005 | POST | `/api/v1/notifications/{id}/start-attention` | Vincular atención. | `Idempotency-Key`. | `{relatedResource}` | `200 Notification` | `VALIDATION_ERROR`. |
| NOT-006 | POST | `/api/v1/notifications/{id}/resolve` | Marcar resuelta solo con condición vinculada cerrada. | `Idempotency-Key`. | `{resolutionResource}` | `200 Notification` | `RELATED_CONDITION_NOT_RESOLVED`. |
| NOT-007 | POST | `/api/v1/browser-push-subscriptions` | Registrar suscripción del navegador. | `Idempotency-Key`. | `CreatePushSubscriptionRequest` | `201 PushSubscription` | `VALIDATION_ERROR`. |
| NOT-008 | DELETE | `/api/v1/browser-push-subscriptions/{id}` | Eliminar suscripción propia. | Path. | — | `204` | `RESOURCE_NOT_FOUND`. |
| NOT-009 | GET | `/api/v1/notification-rules` | Listar reglas obligatorias y adicionales. | Tipo, origen, estado. | — | `200 Page<NotificationRule>` | `PERMISSION_DENIED`. |
| NOT-010 | POST | `/api/v1/notification-rules` | Añadir aviso de cuenta sin eliminar mínimos ICE24. | `Idempotency-Key`. | `CreateNotificationRuleRequest` | `201 NotificationRule` | `CANNOT_OVERRIDE_MANDATORY_ESCALATION`. |

## 27. Suscripción, Stripe y demo
Los estados finales se reconcilian con Stripe como fuente de verdad. La API no permite establecer directamente `active` o `payment_failed`.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SUB-001 | GET | `/api/v1/subscription` | Consultar estado, periodo y acceso. | — | — | `200 Subscription` | `RESOURCE_NOT_FOUND`. |
| SUB-002 | POST | `/api/v1/subscription/checkout-sessions` | Iniciar activación/reactivación. | `Idempotency-Key`. | `{returnUrl,cancelUrl}` | `201 {url,expiresAt}` | `DEPENDENCY_UNAVAILABLE`. |
| SUB-003 | POST | `/api/v1/subscription/billing-portal-sessions` | Crear portal de Stripe. | `Idempotency-Key`. | `{returnUrl}` | `201 {url,expiresAt}` | `DEPENDENCY_UNAVAILABLE`. |
| SUB-004 | POST | `/api/v1/subscription/cancellation-request` | Programar cancelación al final del periodo. | `Idempotency-Key`. | `{reason?, confirmation:true}` | `202 Job` | `STATE_TRANSITION_INVALID`. |
| SUB-005 | POST | `/api/v1/subscription/cancellation-reversal` | Revertir cancelación si Stripe lo permite. | `Idempotency-Key`. | `{confirmation:true}` | `202 Job` | `STATE_TRANSITION_INVALID`. |
| SUB-006 | GET | `/api/v1/admin/demos` | Listar demos. | Estado, expiración, cursor. | — | `200 CursorPage<Demo>` | `PERMISSION_DENIED`. |
| SUB-007 | POST | `/api/v1/admin/demos` | Crear demo desde plantilla maestra. | `Idempotency-Key`. | `CreateDemoRequest` | `202 Job` | `VALIDATION_ERROR`. |
| SUB-008 | POST | `/api/v1/admin/demos/{demoId}/extend` | Extender vigencia. | `Idempotency-Key`. | `{newExpiresAt, reason}` | `200 Demo` | `STATE_TRANSITION_INVALID`. |
| SUB-009 | POST | `/api/v1/admin/demos/{demoId}/create-production-account` | Crear cuenta productiva limpia. | `Idempotency-Key`. | `{owner, account, confirmation:true}` | `202 Job` | `DUPLICATE_RESOURCE`. |

## 28. Auditoría
No existen endpoints de creación, actualización o eliminación para consumidores. La auditoría se genera dentro de las transacciones de negocio.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-001 | GET | `/api/v1/audit-events` | Consultar auditoría del ámbito permitido. | Usuario, cuenta, sucursal, máquina, entidad, acción, resultado, fechas, cursor. | — | `200 CursorPage<AuditEvent>` | `PERMISSION_DENIED`. |
| AUD-002 | GET | `/api/v1/audit-events/{eventId}` | Consultar evento y cambios protegidos. | Path. | — | `200 AuditEvent` | `RESOURCE_NOT_FOUND`. |
| AUD-003 | GET | `/api/v1/admin/audit-events` | Auditoría global ICE24. | Filtros amplios, cursor. | — | `200 CursorPage<AuditEvent>` | `PERMISSION_DENIED`. |

## 29. PWA, paquetes offline y sincronización
Solo órdenes tomadas, tareas de mantenimiento y bitácoras previamente sincronizadas admiten continuidad sin conexión.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OFF-001 | POST | `/api/v1/offline-packages` | Solicitar paquete para tareas autorizadas. | `Idempotency-Key`. | `{deviceId, resourceType, resourceIds}` | `202 Job` | `OFFLINE_OPERATION_NOT_ALLOWED`. |
| OFF-002 | GET | `/api/v1/offline-packages/{packageId}` | Consultar manifiesto/estado. | Path. | — | `200 OfflinePackage` | `RESOURCE_NOT_FOUND`. |
| OFF-003 | POST | `/api/v1/offline-packages/{packageId}/download-session` | Obtener paquete cifrado temporal. | `Idempotency-Key`. | `{deviceId}` | `201 {url,expiresAt,manifestHash}` | `DEVICE_MISMATCH`. |
| OFF-004 | POST | `/api/v1/sync-batches` | Enviar lote idempotente de cambios locales. | `Idempotency-Key`. | `SyncBatch` | `202 Job` o `200 SyncBatch` | `SYNC_CONFLICT`, `CONTEXT_INACTIVE`. |
| OFF-005 | GET | `/api/v1/sync-batches/{batchId}` | Consultar resultados por operación. | Path. | — | `200 SyncBatch` | `RESOURCE_NOT_FOUND`. |
| OFF-006 | GET | `/api/v1/sync-conflicts` | Listar conflictos que requieren revisión. | Recurso, estado, usuario, cursor. | — | `200 CursorPage<SyncConflict>` | `PERMISSION_DENIED`. |
| OFF-007 | GET | `/api/v1/sync-conflicts/{conflictId}` | Consultar versiones servidor/local. | Path. | — | `200 SyncConflict` | `RESOURCE_NOT_FOUND`. |
| OFF-008 | POST | `/api/v1/sync-conflicts/{conflictId}/resolve` | Resolver explícitamente. | `Idempotency-Key`, `If-Match`. | `{resolution:"server\|local\|merged", mergedPayload?, reason}` | `200 SyncConflict` | `VERSION_CONFLICT`. |
| OFF-009 | POST | `/api/v1/devices/{deviceId}/revoke-offline-data` | Revocar paquetes y señalar eliminación local. | `Idempotency-Key`. | `{reason}` | `202 Job` | `PERMISSION_DENIED`. |

**Ejemplo — lote de sincronización**
```json
{
  "id": "470133fc-72f6-4db6-85ae-4791f83bbf98",
  "deviceId": "device-5d04e391",
  "contextId": "0192e9df-f5ef-7803-b41b-9aa7df7635a4",
  "packageId": "0192ef30-4043-74a8-82c6-6e5c860fb5fb",
  "submittedAt": "2026-08-06T01:35:00Z",
  "operations": [
    {
      "operationId": "3be57910-08c9-44c0-b84e-13d784c603db",
      "type": "work_order_update",
      "resourceId": "0192ec10-54fe-72c5-a31e-c7d7229ef5ce",
      "baseVersion": 6,
      "payload": {
        "diagnosis": "Filtro saturado",
        "evidenceFileIds": ["0192ec61-9bbc-77f8-893b-c808518b4f20"]
      }
    }
  ]
}
```

## 30. Portal público, QR y autenticidad
No acepta IDs internos como mecanismo de autorización. Solo devuelve proyecciones publicadas, protegidas y sin datos sensibles.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PUB-001 | GET | `/public/v1/machines/{publicCode}` | Obtener proyección pública unificada. | Código opaco/ICE24 público. | — | `200 PublicMachineProjection` | `PUBLIC_RESOURCE_NOT_FOUND`. |
| PUB-002 | GET | `/public/v1/machines/{publicCode}/technical-summary` | Resumen técnico publicado últimos 24 meses. | Periodo permitido, cursor. | — | `200 PublicTechnicalSummary` | `PUBLIC_RESOURCE_NOT_FOUND`. |
| PUB-003 | GET | `/public/v1/machines/{publicCode}/sanitary-summary` | Resumen sanitario publicado. | Periodo permitido. | — | `200 PublicSanitarySummary` | `PUBLIC_RESOURCE_NOT_FOUND`. |
| PUB-004 | GET | `/public/v1/machines/{publicCode}/documents` | Listar versiones públicas. | Tipo, fecha, cursor. | — | `200 CursorPage<PublicDocument>` | `PUBLIC_RESOURCE_NOT_FOUND`. |
| PUB-005 | POST | `/public/v1/documents/{publicDocumentId}/download-sessions` | Crear descarga pública protegida. | Rate limit; identificador público. | `{purpose:"public_consultation"}` | `201 {url,expiresAt,folio,version}` | `PUBLIC_RESOURCE_NOT_FOUND`, `RATE_LIMITED`. |
| PUB-006 | GET | `/public/v1/authenticity/{folio}` | Verificar folio/versión/hash público. | Folio, opcional `hash`. | — | `200 AuthenticityResult` | `PUBLIC_RESOURCE_NOT_FOUND`. |
| PUB-007 | POST | `/public/v1/qr-events` | Registrar escaneo/entrada de QR con minimización. | Rate limit. | `CreateQrEventRequest` | `202` | `VALIDATION_ERROR`. |
| PUB-008 | POST | `/public/v1/contact-links` | Generar WhatsApp prellenado con código. | Rate limit. | `{publicCode, topic}` | `200 {url,message}` | `PUBLIC_RESOURCE_NOT_FOUND`. |

**Ejemplo — proyección pública**
```json
{
  "machineCode": "ICE24-VER-000184",
  "generalModel": "ICE24 450 kg",
  "commercialBrand": "Hielo Centro",
  "updatedAt": "2026-08-05T23:11:00Z",
  "visibleStatus": "available",
  "technical": {
    "category": "up_to_date",
    "lastPublishedMaintenanceAt": "2026-07-28T15:00:00Z"
  },
  "sanitary": {
    "category": "up_to_date",
    "laboratoryName": "Laboratorio Ejemplo",
    "lastPublishedAnalysisAt": "2026-08-04T22:20:00Z"
  },
  "contacts": {"branchPhone": "+52 271 000 0000", "whatsAppAvailable": true},
  "disclaimer": "ICE24 OS es una plataforma de gestión; esta información no constituye certificación ni dictamen de autoridad."
}
```

## 31. Integraciones y operación interna
Los endpoints internos no se exponen al navegador. Los webhooks conservan el ID original, firma, fecha y payload protegido.

| ID | Método | Ruta | Propósito | Parámetros | Body | Respuesta exitosa | Errores específicos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| INT-001 | POST | `/integrations/v1/stripe/webhooks` | Recibir evento firmado. | Headers de firma Stripe; body crudo. | Evento Stripe original. | `200 {received:true}` | `INVALID_WEBHOOK_SIGNATURE`, `IDEMPOTENCY_CONFLICT`. |
| INT-002 | POST | `/internal/v1/stripe/reconciliations` | Reconciliar estados con Stripe. | Autenticación servicio, `Idempotency-Key`. | `{accountId?, providerSubscriptionId?}` | `202 Job` | `DEPENDENCY_UNAVAILABLE`. |
| INT-003 | POST | `/internal/v1/outbox/publish` | Publicar lote outbox pendiente. | Autenticación servicio. | `{limit}` | `200 PublishSummary` | `INTERNAL_ERROR`. |
| INT-004 | POST | `/internal/v1/jobs/{jobId}/retry` | Reintentar trabajo desde soporte técnico. | Autenticación interna, `Idempotency-Key`. | `{reason}` | `202 Job` | `STATE_TRANSITION_INVALID`. |
| INT-005 | GET | `/internal/v1/health/live` | Liveness. | Red interna. | — | `200 {status:"ok"}` | `503`. |
| INT-006 | GET | `/internal/v1/health/ready` | Readiness de dependencias críticas. | Red interna. | — | `200/503 HealthStatus` | `503`. |
| INT-007 | GET | `/internal/v1/metrics` | Métricas para plataforma autorizada. | Red interna. | — | Formato del backend de observabilidad | `403`. |

## 32. Matriz de operaciones que exigen idempotencia
| Operación | Header requerido | Ámbito de unicidad recomendado | Respuesta repetida |
| --- | --- | --- | --- |
| Tomar pedido | `Idempotency-Key` | Repartidor + pedido + comando | Misma respuesta si el payload coincide. |
| Transiciones offline | `Idempotency-Key` y `operationId` | Dispositivo + operación | Resultado original por operación. |
| Confirmar importación | `Idempotency-Key` | Importación + comando | Mismo `Job`. |
| Crear exportación/reporte | `Idempotency-Key` | Cuenta + configuración normalizada | Mismo `Job` o recurso. |
| Suscripción/cancelación | `Idempotency-Key` | Cuenta + comando | Mismo resultado reconciliado. |
| Recarga/retiro/transferencia | `Idempotency-Key` | Cuenta + movimiento lógico | Mismos movimientos. |
| Publicar/retirar | `Idempotency-Key` | Documento + versión + comando | Mismo estado. |
| Aplicar/levantar restricción | `Idempotency-Key` | Máquina + restricción + comando | Mismo recurso. |
| Webhooks | ID del proveedor + almacenamiento idempotente | Proveedor + event ID | `200` sin duplicar efecto. |

## 33. Reglas de concurrencia

- Los recursos con `version` devuelven ETag, por ejemplo `W/"7"`.
- `PATCH` y comandos sensibles envían `If-Match` o `expectedVersion`.
- Ante discrepancia se devuelve `412 VERSION_CONFLICT` con la versión actual, sin sobrescribir.
- La toma de pedido usa una operación atómica en servidor y no depende solo de ETag.
- Los saldos administrativos e inventarios se modifican dentro de transacciones y con claves idempotentes.
- Los conflictos offline no se resuelven con “última escritura gana”; se conserva la versión local y la del servidor.

## 34. Validaciones y errores por dominio
| Código | HTTP | Dominio | Condición |
| --- | --- | --- | --- |
| `MACHINE_RESTRICTED` | 422 | Equipos/pedidos | Existe restricción técnica o sanitaria que bloquea pedidos. |
| `TEMPLATE_ASSIGNMENT_REQUIRED` | 422 | Alta de equipo | No existe plantilla oficial válida. |
| `WORK_ORDER_EVIDENCE_REQUIRED` | 422 | Mantenimiento | Falta evidencia definida por plantilla. |
| `INSUFFICIENT_STOCK` | 422 | Inventario | Existencia menor al consumo/transferencia. |
| `NON_CONFORMING_CANNOT_AUTO_PUBLISH` | 422 | Sanidad/publicación | Intento de publicar automáticamente un resultado no conforme. |
| `PUBLIC_VERSION_REQUIRED` | 422 | Documentos | No existe derivado público protegido. |
| `UNRECOGNIZED_EXCEL_FORMAT` | 422 | Ventas | No hay adaptador compatible. |
| `IMPORT_PREVIEW_NOT_READY` | 409 | Ventas | La validación no terminó. |
| `CARD_MACHINE_MISMATCH` | 422 | Tarjetas/reparto | La tarjeta no pertenece a la máquina requerida. |
| `NEGATIVE_BALANCE_NOT_ALLOWED` | 422 | Tarjetas | El movimiento produciría saldo administrativo negativo. |
| `NO_ELIGIBLE_DRIVER` | 422 | Pedidos | No existe repartidor activo, en zona y con tarjeta válida. |
| `ORDER_ALREADY_TAKEN` | 409 | Pedidos | Otro repartidor tomó el pedido. |
| `DRIVER_NOT_ELIGIBLE` | 422 | Pedidos | La relación o ubicación no cumple. |
| `PRODUCT_UNAVAILABLE` | 422 | Pedidos | Producto inactivo/no disponible. |
| `INVALID_DELIVERY_CODE` | 422 | Entrega | Código incorrecto. |
| `CANCELLATION_REQUIRES_AUTHORIZATION` | 409 | Pedidos | El producto ya fue recogido. |
| `RELATED_CONDITION_NOT_RESOLVED` | 409 | Notificaciones | La alerta no puede resolverse antes de su causa. |
| `EXPORT_EXPIRED` | 410 | Exportaciones | Paquete expirado. |
| `FILE_NOT_AVAILABLE` | 409 | Archivos | Archivo aún no pasó validación. |
| `FILE_UPLOAD_MISMATCH` | 422 | Archivos | Tamaño, hash o tipo no coincide. |
| `LOCATION_REQUIRED` | 422 | Reparto | Se configuró elegibilidad por zona y no existe ubicación. |
| `LOCATION_PERMISSION_REQUIRED` | 422 | Reparto | El navegador no autorizó ubicación necesaria. |
| `INSUFFICIENT_DATA` | 422 | Analítica | No existe historial suficiente. |
| `OFFLINE_OPERATION_NOT_ALLOWED` | 422 | Offline | La operación requiere conexión. |
| `SYNC_CONFLICT` | 409 | Offline | Versión base cambió. |
| `DEVICE_MISMATCH` | 403 | Offline | Paquete vinculado a otro dispositivo. |
| `WATER_DELIVERY_OUT_OF_SCOPE` | 422 | Catálogo | Se intentó crear producto de agua para entrega. |

## 35. Ejemplos adicionales de respuestas
**201 Created — pedido**
```json
{
  "id": "0192ee70-ecad-72fc-a5b0-d96ce2e86844",
  "folio": "PED-2026-000184",
  "ownerAccountId": "0192e8a8-0a3b-7f01-a30f-779c2b7aa4e1",
  "machineId": "0192ebbd-6c94-7d56-9005-6164459297f9",
  "consumerBranchId": "0192ee20-3f97-7e1b-aea6-6d347be38df7",
  "driverId": null,
  "status": "available",
  "lines": [
    {
      "machineProductId": "0192ee39-cc00-70fe-8d40-24e1bf789f1a",
      "quantity": "8",
      "unitPrice": {"amountMinor": 4500, "currency": "MXN", "kind": "actual"},
      "subtotal": {"amountMinor": 36000, "currency": "MXN", "kind": "actual"}
    }
  ],
  "deliveryFee": {"amountMinor": 8000, "currency": "MXN", "kind": "actual"},
  "total": {"amountMinor": 44000, "currency": "MXN", "kind": "actual"},
  "version": 1,
  "createdAt": "2026-08-06T01:42:00Z"
}
```

**202 Accepted — trabajo**
```json
{
  "id": "0192ef78-a627-7623-b833-2d617d7b8447",
  "type": "report_generation",
  "status": "queued",
  "progressPercent": 0,
  "resourceType": "report",
  "resourceId": "0192ef75-a67b-76c0-a3a7-e0c715e605fa",
  "createdAt": "2026-08-06T01:45:00Z",
  "links": {
    "self": "/api/v1/jobs/0192ef78-a627-7623-b833-2d617d7b8447",
    "result": "/api/v1/reports/0192ef75-a67b-76c0-a3a7-e0c715e605fa"
  }
}
```

**412 Precondition Failed**
```json
{
  "type": "https://api.ice24.mx/problems/version-conflict",
  "title": "El recurso cambió",
  "status": 412,
  "detail": "La versión enviada fue 6 y la versión vigente es 8.",
  "instance": "/api/v1/work-orders/0192ec10-54fe-72c5-a31e-c7d7229ef5ce",
  "code": "VERSION_CONFLICT",
  "correlationId": "b2ba6ad5-8b5f-4d7a-aeab-18db75f2650e",
  "retryable": false,
  "meta": {"expectedVersion": 6, "currentVersion": 8}
}
```

## 36. Requisitos de seguridad de la API
| Control | Requisito |
| --- | --- |
| Transporte | HTTPS obligatorio; HSTS en superficies públicas. |
| OIDC | Validar firma, emisor, audiencia, expiración y sesión. |
| BFF | Cookies `HttpOnly`, `Secure`, `SameSite`; protección CSRF en mutaciones. |
| Autorización por objeto | Validar cada ID contra el contexto; un ID conocido no otorga acceso. |
| Rate limiting | Por IP, sesión, usuario y ruta sensible; límites especiales en login, descargas y portal público. |
| Archivos | URLs temporales, verificación de tipo/tamaño/hash, cuarentena y análisis de seguridad. |
| Webhooks | Firma, timestamp, idempotencia y conservación del evento original. |
| Datos sensibles | Redacción de respuestas y logs; no devolver firmas, comentarios internos o costos sin permiso. |
| Errores | Mensajes genéricos para fallos internos; `correlationId` para soporte. |
| Auditoría | Eventos sensibles dentro de la misma transacción que la mutación. |

## 37. Rendimiento y límites iniciales propuestos
| Operación | Objetivo / límite inicial |
| --- | --- |
| Lectura transaccional común | p95 ≤ 500 ms sin red del usuario. |
| Escritura común | p95 ≤ 800 ms, excluyendo efectos asíncronos. |
| Listas | 25 por defecto, 100 máximo propuesto. |
| Fotografía | 10 MB por imagen; 15 por actividad de forma predeterminada. |
| PDF | 25 MB. |
| Excel de ventas | 20 MB. |
| Video | No admitido en primera versión. |
| Tareas pesadas | `202 Accepted`; no mantener request HTTP abierto. |
| Descargas privadas | URL temporal de corta duración, valor exacto configurable. |
| Exportación completa | Disponibilidad durante siete días según PRD. |

## 38. Compatibilidad y versionado

- La versión mayor recomendada se incluye en la ruta: `/v1`.
- Cambios aditivos compatibles no cambian versión mayor.
- Renombrar/eliminar campos, cambiar semántica o endurecer una validación incompatible exige versión mayor o periodo de deprecación.
- OpenAPI es la fuente de contrato; frontend, BFF, workers y pruebas de contrato deben validarse contra ella.
- Los consumidores deben ignorar campos desconocidos y no depender del orden de propiedades JSON.
- Los estados y códigos de error son contratos versionados.
- Los eventos asíncronos tienen versión independiente del endpoint HTTP.

## 39. Decisiones abiertas de API
| ID | Pregunta | Impacto |
| --- | --- | --- |
| API-OA-001 | ¿Se confirma `/v1` en ruta o se utilizará negociación por header? | URLs y gateway. |
| API-OA-002 | ¿La “sesión cerrada por propietario” revoca solo el contexto de su cuenta o toda la identidad? | Endpoints SES-022/023 y UX. |
| API-OA-003 | ¿Qué campos exactos puede modificar cada rol base e individual? | Esquemas de `PATCH` y redacción de respuestas. |
| API-OA-004 | ¿Qué tipos y filtros definitivos tendrá cada reporte? | `ReportType` y validaciones. |
| API-OA-005 | ¿Qué formatos reales de Excel existen y cuál es su llave de deduplicación? | Sales Import. |
| API-OA-006 | ¿Cuál es el catálogo final de bitácoras, análisis, unidades y límites? | Payloads dinámicos y validación. |
| API-OA-007 | ¿Cuál es el mecanismo definitivo de autenticidad pública: folio, hash, firma digital o combinación? | PUB-006. |
| API-OA-008 | ¿Qué duración tendrán URLs firmadas y sesiones de carga? | Archivos y seguridad. |
| API-OA-009 | ¿Qué datos exactos puede ver el repartidor antes y después de tomar un pedido? | Redacción de `Order` por rol. |
| API-OA-010 | ¿Cuándo puede un repartidor liberar un pedido y qué penalizaciones existen? | ORD-006. |
| API-OA-011 | ¿Cuál es el flujo exacto de verificación manual de identidad? | ADM-015. |
| API-OA-012 | ¿Se permitirá al cliente pausar o reanudar reportes programados sin aprobación adicional? | RPT-011/012. |
| API-OA-013 | ¿Qué retención y detalle se permite en analítica QR (dispositivo, navegador, ubicación aproximada)? | PUB-007 y privacidad. |
| API-OA-014 | ¿Qué RPO/RTO, SLA y máximos de latencia se adoptarán formalmente? | Operación y pruebas. |
| API-OA-015 | ¿Cuáles son los límites finales de tasa por superficie y rol? | Gateway y seguridad. |

## 40. Criterios de aceptación de la especificación

- Cada endpoint privado exige identidad y contexto cuando corresponda.
- Las pruebas de autorización demuestran aislamiento entre cuentas incluso manipulando IDs.
- Las mutaciones sensibles generan auditoría y correlación.
- Las operaciones críticas son idempotentes y no duplican efectos.
- Los estados solo cambian mediante transiciones válidas.
- Las tareas pesadas responden con `Job` y permiten consultar fallos.
- Los errores cumplen el esquema `ProblemDetails` y no filtran secretos.
- Las cargas y descargas usan URLs temporales protegidas.
- La API pública no devuelve datos privados ni resultados no publicados.
- El modo lectura bloquea mutaciones, pero respeta las consultas/descargas permitidas por el PRD.
- Los contratos OpenAPI, pruebas de contrato y documentación se actualizan en cada cambio.
- Los flujos offline conservan idempotencia, versiones y resolución explícita de conflictos.

## 41. Trazabilidad con PRD y TRD
| Área del PRD/TRD | Secciones de API |
| --- | --- |
| Identidad, autenticación y permisos | 5, 9, 11. |
| Cuentas, sucursales y asociaciones | 10, 21. |
| Equipos, plantillas y transferencias | 12, 13. |
| Mantenimiento, sanidad y laboratorio | 14, 15. |
| Inventario y documentos | 16, 17. |
| Reportes, PDF, exportaciones y portal | 18, 30. |
| Ventas y tarjetas | 19, 20. |
| Productos, pedidos y reparto | 22, 23, 24. |
| Analítica y alertas | 25, 26. |
| Suscripción y demo | 27, 31. |
| Auditoría, logs y offline | 28, 29, 31. |
| Convenciones REST, errores, seguridad y rendimiento | 3–7, 32–38. |

---

**Fin de la especificación de API — ICE24 OS v1.0**
