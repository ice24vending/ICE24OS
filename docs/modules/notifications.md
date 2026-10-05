# Centro de notificaciones y alertas persistentes

Ownership: plataforma. Fuente de requisitos: TASK-F5-11; PRD RF-ALT-001, RF-ALT-005 a RF-ALT-007, RF-ALT-011 y RF-ALT-012; Database `notification_events`, `notification_recipients` y `notification_delivery_attempts`; API `Notification` y NOT-001 a NOT-006; UI/UX 14.17, 21.6 y 26. Operación en el [runbook de notificaciones](../runbooks/notifications.md).

## Flujo

```mermaid
sequenceDiagram
  participant P as Productor (p. ej. subscriptions.events)
  participant O as infra.outbox_events
  participant Q as Cola domain_events
  participant W as Worker notification-center
  participant D as notifications.*
  participant A as API NOT-001..006
  participant U as /notifications y campana
  P->>O: evento de dominio en la misma transacción
  O->>Q: infra.publish_outbox
  W->>Q: processDomainEvents (reclamo idempotente)
  W->>D: notifications.ingest_event(mensaje v1)
  D->>D: regla → evento → destinatarios por permiso y ámbito → entrega IN_APP → auditoría
  U->>A: lista, resumen, leer, enterado, atender, resolver
  A->>D: notifications.transition (máquina de estados, historial, auditoría)
```

1. **Reglas.** `notifications.event_rules` (espejo de `NOTIFICATION_EVENT_RULES` en `@ice24/contracts`) define qué eventos de dominio crean alertas, su tipo estable, prioridad, texto fijo y seguro (nunca se copia el payload), permiso de audiencia, condición vinculada y enlace de acción.

   | Evento de dominio         | Tipo                          | Prioridad | Audiencia                       | Condición             |
   | ------------------------- | ----------------------------- | --------- | ------------------------------- | --------------------- |
   | `PaymentFailed`           | `subscription.payment_failed` | CRITICAL  | `notifications.billing-alerts`  | Pago pendiente        |
   | `EnterReadOnly`           | `subscription.read_only`      | CRITICAL  | `notifications.billing-alerts`  | Pago pendiente        |
   | `FileSecurityAlertRaised` | `files.security_alert`        | HIGH      | `notifications.security-alerts` | Bytes aún no purgados |

2. **Ingesta (worker).** El consumidor `notification-center` (registrado en `apps/worker/src/consumers/index.ts`) llama `notifications.ingest_event` dentro de la transacción de reclamo de F5-06. La función es idempotente por evento de origen (`origin_event_id` único): una entrega repetida no duplica alertas.
3. **Destinatarios.** Usuarios activos con membresía activa en la cuenta, permiso de audiencia efectivo (ALLOW por rol o excepción y ningún DENY vigente) y ámbito que cubra el evento: los eventos de cuenta requieren ámbito de cuenta; los de sucursal o máquina (alertas de archivo heredan el vínculo del archivo) también llegan a usuarios con ese ámbito. Cada destinatario recibe su propio estado y un intento `IN_APP` `DELIVERED`. Se audita `NotificationCreated` (actor `SYSTEM`, origen `WORKER`) con el número de destinatarios, incluso si es cero.
4. **Estados por destinatario.**

   ```mermaid
   stateDiagram-v2
     [*] --> UNREAD
     UNREAD --> READ: leer
     UNREAD --> ACKNOWLEDGED: enterado
     READ --> ACKNOWLEDGED: enterado
     UNREAD --> IN_PROGRESS: atender
     READ --> IN_PROGRESS: atender
     ACKNOWLEDGED --> IN_PROGRESS: atender
     ACKNOWLEDGED --> RESOLVED: resolver (condición cerrada)
     IN_PROGRESS --> RESOLVED: resolver (condición cerrada)
   ```

   - Leer nunca marca enterado; las críticas siguen fijadas (`pinned`) hasta «Enterado» (RF-ALT-006).
   - Enterado nunca resuelve (RF-ALT-007). Atender implica enterado y exige vincular un recurso de la misma cuenta.
   - Resolver exige estado enterado o en atención, un `resolutionResource` de la misma cuenta y la condición vinculada cerrada; si sigue abierta responde 409 `RELATED_CONDITION_NOT_RESOLVED` (RF-ALT-012).
   - Repetir «leer» o «enterado» sobre un estado ya alcanzado no registra nada; la misma `Idempotency-Key` devuelve el mismo resultado y reutilizarla para otra acción responde 409 `IDEMPOTENCY_CONFLICT`.
   - Cada cambio queda en `notifications.recipient_transitions` (acción, estados, actor, contexto, recurso, clave, correlación) y en `audit.events` (`NotificationRead`, `NotificationAcknowledged`, `NotificationAttentionStarted`, `NotificationResolved`) (RF-ALT-011).

## Datos

| Tabla                                          | Contenido                                                                                                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notifications.event_rules`                    | Catálogo de reglas (arriba).                                                                                                                                                 |
| `notifications.notification_events`            | Database `notification_events` más `origin_event_id`/`origin_event_type`, `condition_kind` y correlación. Inmutable.                                                         |
| `notifications.notification_recipients`        | Database `notification_recipients` más cuenta, recursos de atención y resolución, `updated_by` y `row_version`. Trigger de avance único; restricciones atan estado y fechas. |
| `notifications.recipient_transitions`          | Historial append-only por destinatario, único por (`recipient_id`, `idempotency_key`).                                                                                       |
| `notifications.notification_delivery_attempts` | Database `notification_delivery_attempts` por canal. F5-11 registra `IN_APP`; F5-12 agrega `EMAIL` (ver abajo); navegador queda pendiente.                                   |

Recursos vinculables (`relatedResource`, `resolutionResource`): `subscription`, `file`, `job`, `branch` y `machine`, siempre validados contra la cuenta activa. Órdenes, tickets y acciones correctivas se agregarán al enum cuando existan sus módulos.

## API y permisos

| Ruta                                              | Permiso                | Respuesta y errores                                                                                                       |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/notifications`                       | `notifications.read`   | 200 `CursorPage<Notification>`. Filtros `status`, `priority`, `type`, `pinned`, `unacknowledged`, `cursor`, `limit`. 400. |
| `GET /api/v1/notifications/summary`               | `notifications.read`   | 200 `{badge, unread, pinned, acknowledged, inProgress, resolved}` (aditivo).                                              |
| `GET /api/v1/notifications/{id}`                  | `notifications.read`   | 200 `Notification` (no marca leída). 404 si no es propia o de otra cuenta.                                                |
| `POST /api/v1/notifications/{id}/read`            | `notifications.attend` | 200. 409 `IDEMPOTENCY_CONFLICT`.                                                                                          |
| `POST /api/v1/notifications/{id}/acknowledge`     | `notifications.attend` | 200. 409 `STATE_TRANSITION_INVALID`.                                                                                      |
| `POST /api/v1/notifications/{id}/start-attention` | `notifications.attend` | 200 con `{relatedResource}`. 400 recurso inválido o ajeno. 409.                                                           |
| `POST /api/v1/notifications/{id}/resolve`         | `notifications.attend` | 200 con `{resolutionResource}`. 409 `RELATED_CONDITION_NOT_RESOLVED` o `STATE_TRANSITION_INVALID`.                        |

- El destinatario siempre es el usuario autenticado y la cuenta, la del contexto activo; nunca vienen del cliente. Lo ajeno responde 404.
- Todas las transiciones exigen `Idempotency-Key`.
- `notifications.read` y `notifications.attend`: IA, IO, OW, TC, OP, SA y AU. Audiencias: `notifications.billing-alerts` y `notifications.security-alerts` para IA y OW; se amplían o restringen por excepción de membresía.
- **Modo solo lectura.** Las transiciones cambian sólo el estado propio del aviso, no registros de la cuenta: se autorizan como operación `READ` del permiso `notifications.attend` y se permiten con `AllowReadOnlyOperation("notification-attention")`. Así la alerta «Cuenta en modo solo lectura» puede marcarse enterado. En cuentas suspendidas se rechazan.
- `Notification` agrega (aditivo a API.md) `action`, `occurredAt`, fechas de cada estado, `attentionResource`, `resolutionResource` y `conditionOpen`. `audit.createdBy` usa la identidad técnica `SYSTEM_ACTOR_ID`; `escalationLevel` es 0 hasta F8-14.

## Interfaz

- `/notifications` (UI-ALT-01 «Centro de alertas»): resumen «N críticas sin enterado · N en atención · N resueltas», sección fija «Críticas sin enterado», filtros Todas, Críticas, No enteradas, En atención y Resueltas, tarjetas con prioridad y estado escritos (no sólo color), tiempo transcurrido, «Ver detalle» (marca leída, nunca enterado), «Marcar enterado», «Atender», «Marcar resuelta» (deshabilitada con explicación mientras la causa siga abierta) y enlace de acción. Explica la diferencia entre «Enterado» y «Resuelta».
- Campana en el espacio de trabajo: el badge cuenta alertas relevantes (no leídas más críticas fijadas), no el historial.
- Indicadores en vivo: el resumen y las listas se actualizan cada 30 s mientras la pestaña está visible y al volver a ella. Push del navegador y SSE quedan fuera de F5-11.
- BFF `/api/notifications` (lista o `view=summary`) y `/api/notifications/{id}/{read|acknowledge|start-attention|resolve}` con sesión, contexto de pestaña, CSRF e `Idempotency-Key`; mensajes en español por código, sin eco del upstream.

## Agregar una regla

Migración que inserte en `notifications.event_rules` (con su permiso de audiencia y, si aplica, un `condition_kind` implementado en `notifications.condition_open`), la entrada en `NOTIFICATION_EVENT_RULES` y la actualización de pgTAP y de esta tabla en el mismo cambio. El consumidor se suscribe automáticamente a las claves del catálogo.

## Correo transaccional (F5-12)

Fuente: TASK-F5-12; PRD RF-INT-002, RF-ALT-003, RF-ALT-008, RF-RPT-004 y SUP-07; TRD 17 (cola, proveedor intercambiable, plantillas versionadas, estado de entrega, reintentos y exclusión de información sensible) y 30 (la operación continúa y se muestra envío pendiente o fallido); Architecture 45–47 (puerto de proveedor); ADR-019 (proveedor en revisión). Operación en el [runbook de correo](../runbooks/email.md); reporte en [F5-12](../tasks/task-f5-12.md).

```mermaid
sequenceDiagram
  participant O as Outbox / domain_events
  participant N as notification-center
  participant E as email-alerts
  participant DB as email.*
  participant Q as Cola email_deliveries
  participant W as processEmailDeliveries
  participant P as Adaptador de proveedor
  participant A as API /webhooks/email
  O->>N: alerta y destinatarios (F5-11)
  O->>E: mismo evento, después de N
  E->>DB: email.enqueue_alert → email.request por destinatario (CRITICAL)
  DB->>Q: mensaje + trabajo EMAIL + auditoría EmailQueued (misma transacción)
  W->>DB: email.delivery_start (revalida destinatario, lee dirección)
  W->>P: render de plantilla versionada + clave de idempotencia = id del mensaje
  W->>DB: email.delivery_record_sent (SENT, hash de dirección, auditoría)
  P->>A: entrega o rebote firmado
  A->>DB: email.record_provider_event (idempotente) → DELIVERED / BOUNCED
```

**Qué envía.** Tipos `CRITICAL_ALERT` y `SCHEDULED_REPORT` (`emailMessageTypeSchema`).

- Alertas críticas: toda alerta con prioridad `CRITICAL` (hoy `subscription.payment_failed` y `subscription.read_only`, el caso «pagos rechazados» de RF-ALT-008) envía un correo a cada destinatario de la alerta. Las alertas `HIGH` (por ejemplo `files.security_alert`) no envían correo. Restricciones, no conformidades, mantenimientos vencidos y escalamientos se suman al crear sus reglas `CRITICAL` en sus fases.
- Reportes programados: la plantilla `report.scheduled@1` y `email.request` quedan listas para F10-09, que será el productor. El correo enlaza al reporte dentro de la aplicación (requiere sesión); el adjunto PDF depende de DEC-012 (PRD pregunta 51).
- Recuperación de acceso: **no** pasa por este módulo. Supabase Auth genera y envía el enlace de un solo uso (ADR-017, F3). Llevarla a este canal es una decisión abierta (DEC-024).

**Plantillas.** Catálogo versionado `EMAIL_TEMPLATES` en `@ice24/contracts` con un esquema estricto de variables por versión (sin claves extra, textos acotados de una línea sin caracteres de control, enlaces sólo como rutas internas de la aplicación y nunca `//host`), espejado en `email.templates.variables` y validado dos veces: SQL al solicitar y el worker al renderizar. El render es del lado del servidor (`apps/worker/src/processors/notifications/email/templates.ts`): escapa HTML, construye enlaces sobre `PRIVATE_WEB_URL` y formatea fechas en la zona del destinatario. Una versión publicada no se edita; un cambio agrega versión y los mensajes existentes renderizan la suya. El correo no lleva payloads, identificadores de origen, URLs firmadas, tokens ni datos de otros destinatarios.

**Destinatarios y aislamiento.** Siempre usuarios registrados de la cuenta: `email.recipient_allowed` exige usuario activo, membresía activa y vigente en esa cuenta y el permiso efectivo (ALLOW sin DENY) indicado por el productor. Se verifica al solicitar (`IC403` si no) y otra vez antes de cada envío; si se perdió el acceso el mensaje termina `FAILED` con `RECIPIENT_NOT_AUTHORIZED` sin enviarse. La dirección se lee de `identity.users` en ese momento y no se guarda: sólo su SHA-256.

**Idempotencia.** `email.messages.idempotency_key` es única (`alert:{alerta}:{usuario}` para alertas); el consumidor `email-alerts` está reclamado por evento (F5-06); `email.delivery_start` devuelve `DONE` si el mensaje ya se envió; el proveedor recibe el id del mensaje como clave de idempotencia, que cubre un envío aceptado cuyo registro se perdió.

**Reintentos y DLQ.** Política de `email_deliveries` (5 intentos, backoff exponencial con tope de 15 min). Fallos transitorios del proveedor se reintentan; rechazos permanentes y plantillas inválidas van directo a `email_deliveries_dlq`. El mensaje queda `FAILED` y el trabajo `EMAIL` en `DEAD_LETTER` hasta el reintento auditado de INT-004, que lo devuelve a `QUEUED`.

**Seguimiento técnico.** `POST /api/v1/webhooks/email` (aditivo a API.md §31, mismo patrón que INT-001): sin sesión, firma verificada por el adaptador del proveedor; sólo eventos de entrega y rebote (no aperturas ni clics). Cada evento se guarda antes de aplicarse y es idempotente por proveedor + id; un id reutilizado con otro contenido responde 409; uno llegado antes del envío queda `PENDING` y se aplica al registrar `SENT`; uno desordenado (entregado después de rebotado) queda `IGNORED`. Sin proveedor aprobado responde 503. El adaptador local usa HMAC-SHA256 sobre `timestamp.cuerpo` en `x-ice24-email-signature` con ventana de 5 min.

**Estados.** `QUEUED → SENT → DELIVERED → BOUNCED`, `SENT → BOUNCED` y `QUEUED → FAILED → QUEUED` (reintento manual). Trigger de avance, hechos inmutables, sin borrado. Historial `email.message_events` (append-only) y auditoría `EmailQueued`, `EmailSent`, `EmailDeliveryAttemptFailed`, `EmailFailed`, `EmailRequeued`, `EmailRecipientRejected`, `EmailDelivered` y `EmailBounced` (actor `SYSTEM`, origen `WORKER` o `WEBHOOK`). Las alertas además registran cada estado como intento `EMAIL` en `notification_delivery_attempts`.

| Tabla                   | Contenido                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `email.templates`       | Catálogo de versiones y variables (espejo del contrato).                                                                                            |
| `email.messages`        | Registro de envíos: clave de idempotencia, plantilla y versión, cuenta, destinatario, permiso, evento de origen, intentos, último error, proveedor. |
| `email.message_events`  | Historial append-only de estados e intentos.                                                                                                        |
| `email.provider_events` | Eventos de seguimiento recibidos, idempotentes por proveedor + id.                                                                                  |

**API e interfaz.** `Notification.emailDelivery` (aditivo): `{status: queued|sent|delivered|bounced|failed, updatedAt}` del correo más reciente del destinatario, o `null`. `sentChannels` incluye `email` cuando el correo fue enviado o entregado. El detalle del aviso en `/notifications` muestra «Correo: En cola / Enviado / Entregado / Rebotado / Fallido».

**Proveedor.** Puerto `EmailProvider` (`send` con clave de idempotencia y errores normalizados `PROVIDER_UNAVAILABLE`, `PROVIDER_TIMEOUT`, `PROVIDER_RATE_LIMITED`, `PROVIDER_REJECTED`) y `EmailWebhookVerifier`. Sólo existe el doble local, rechazado fuera de desarrollo y pruebas; el adaptador productivo llega con la aprobación de ADR-019 (DEC-025).
