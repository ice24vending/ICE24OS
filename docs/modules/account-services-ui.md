# Interfaz de servicios de cuenta (F5-15)

Ownership: web privada. Fuente de requisitos: TASK-F5-15; PRD RF-SUB-001 a RF-SUB-013, RF-AUD-005/006/014, RF-DOC-009/013, RF-ADM-009; UI/UX 13.4, 13.7, 15.11, 16, 17, 18, 21, 23, 25, 26 y 28. Las fases de diseño (Fase 6) definirán tokens, shell y navegación definitivos; esta entrega usa los tokens existentes de `@ice24/ui` y no adelanta ese alcance.

## Shell de cuenta

Las pantallas que trabajan dentro de un contexto viven en el grupo de rutas `apps/private-web/src/app/(account)` (las URL no cambian): `/workspace`, `/subscription`, `/files`, `/audit`, `/jobs`, `/notifications` y `/profile`. Su layout:

1. Lee la sesión (sin sesión → inicio; sin contexto → selector).
2. Consulta una vez por página `GET session-contexts/current` (modo efectivo calculado por `subscriptions.effective_access`, roles y ámbito), y sondea `audit-events?limit=1` y `admin/jobs?limit=1` para mostrar solo los enlaces que la persona puede abrir (UI/UX 23.1). Solo en modo lectura consulta además `GET subscription` para explicar el motivo.
3. Renderiza la navegación «Servicios de cuenta» (con `aria-current`), la campana de alertas, el **banner global de modo lectura** y el banner sin conexión, y entrega el modo a `AccessProvider`.

Un fallo de estas consultas nunca bloquea la página: cada servicio aplica y explica sus propios permisos, y la API sigue siendo la autoridad.

### Modo lectura

- Banner persistente (UI/UX 13.7) en todas las pantallas del shell: consecuencia («puedes consultar y descargar… pero no crear ni modificar»), motivo según el estado de la suscripción (pago rechazado, activación pendiente, cancelación, demo vencida o restricción de la cuenta) y qué hacer según el permiso (propietaria: regularizar en Suscripción; resto: pedirlo a la propietaria). La región viva se monta siempre, así que un cambio posterior a la carga se anuncia.
- `useAccountAccess()` expone `canWrite`, `blockedText`, `online` y `markReadOnly()`. Los controles de escritura se deshabilitan **antes** de iniciar el flujo con el texto visible al lado (UI/UX 25.2): carga de archivos, reintento de trabajos, acciones del workspace de equipos. Las descargas, las consultas y la facturación (excepción de F5-03) siguen disponibles; las transiciones de alertas también, porque F5-11 las declara operaciones propias permitidas en solo lectura.
- No depende solo de la UI: el `AccountWriteGuard` (F5-03) responde 403 `ACCOUNT_READ_ONLY`; el BFF conserva el código y la pantalla llama `markReadOnly()` para actualizar el banner sin recargar.
- `SUSPENDED` muestra un banner de alerta propio; la facturación queda oculta.

## Estados compartidos

`ServiceState` (`features/account-shell/service-state.tsx`) es el único panel de estado: carga, vacío, error, sin permiso, sin conexión, conflicto de versión, modo lectura, sesión expirada y no encontrado. Los fallos usan `role="alert"` y los estados neutros `role="status"`. `features/account-shell/failure.ts` clasifica respuestas: red caída → sin conexión; 401 → sesión; `ACCOUNT_READ_ONLY` → modo lectura; 403 → sin permiso; 404 → no encontrado; 412 o `PRECONDITION_FAILED`, `STATE_TRANSITION_INVALID`, `IDEMPOTENCY_CONFLICT`, `CONFLICT`, `CONTEXT_CHANGED` → conflicto; un 409 con otro código (p. ej. `RELATED_CONDITION_NOT_RESOLVED`) es una regla de negocio, no un conflicto.

Los BFF responden `{message, code?}`: el mensaje es siempre propio y el código, uno de API.md (o `CONTEXT_CHANGED` del propio BFF). Las ayudas comunes viven en `src/server/bff/responses.ts` (sesión, contexto de pestaña, CSRF, `Idempotency-Key`, `If-Match`).

| Pantalla    | Carga                             | Vacío                                                | Error       | Sin permiso                 | Sin conexión                     | Conflicto                                   |
| ----------- | --------------------------------- | ---------------------------------------------------- | ----------- | --------------------------- | -------------------------------- | ------------------------------------------- |
| Suscripción | `loading.tsx`                     | Sin suscripción (404)                                | Sí          | 403 (sin acciones)          | Botones de Stripe deshabilitados | 409 al abrir Stripe → «Actualizar estado»   |
| Auditoría   | `loading.tsx` y filtros           | Sin eventos (con filtros activos y «Quitar filtros») | Reintentar  | Sin filtros ni datos        | Filtros deshabilitados           | Contexto cambiado → recargar                |
| Archivos    | `loading.tsx` y progreso de carga | Sin archivos / sin recursos                          | Por archivo | Archivo ajeno o sin permiso | Carga y descargas deshabilitadas | Estado cambiado al descargar → se actualiza |
| Alertas     | `loading.tsx`                     | Sin alertas / sin coincidencias                      | Reintentar  | Sin lista                   | Acciones deshabilitadas          | 412 → «La información cambió» y recarga     |
| Trabajos    | `loading.tsx`                     | Sin trabajos                                         | Reintentar  | Sin datos                   | Reintento deshabilitado          | 412 → detalle actualizado, sin reenviar     |

## Pantallas

- **Suscripción:** plan ($399 MXN, ilimitado), chip de estado (los ocho de RF-SUB-007) y chip de acceso (completo, solo lectura, suspendida), explicación del estado y periodo, demo con «Datos ficticios» y días restantes. Acciones por estado y permiso (`billingOptions`): propietaria con alcance de cuenta → Contratar (demo, pendiente, cancelada) y/o Gestionar en Stripe con su propósito; resto → explicación sin botones; suspendida → nada. La redirección es a Checkout/Portal hospedados de Stripe validados por el BFF: ICE24 OS no recibe datos de tarjeta.
- **Auditoría:** filtros por fechas UTC, tipo de evento (acción), actor, resultado, tipo e ID de entidad, correlación, sucursal y máquina (y ámbito global/cuenta para ICE24), validados con errores junto al campo y resumen enfocable; paginación por cursor; detalle con valores anterior/nuevo y «Ver todos los eventos de esta correlación». Los filtros se pueden abrir desde un enlace (`/audit?correlationId=…`). Solo lectura: no existe acción de edición.
- **Archivos:** carga directa con progreso, estado (FIL-003) y veredicto antimalware con texto (En cuarentena, Aprobado, Rechazado, Pendiente, Sin archivo), metadatos sin ubicación de almacenamiento, **versiones de FIL-004** (original privado; optimizada y pública «no disponibles» hasta que existan) y descarga que pide una URL temporal nueva cada vez, se la entrega al navegador y no la renderiza ni la conserva. `/files?fileId=…` abre un archivo concreto.
- **Alertas:** centro de F5-11 con las críticas fijadas hasta «Enterado», estado de correo de F5-12 en el detalle y versión esperada en cada transición.
- **Trabajos:** Centro de F5-07 con **diagnóstico** por correlación: enlace a la auditoría filtrada y llamadas a integraciones de F5-14 (`/api/integration-logs`, solo correlación, redactadas, cargadas a demanda); reintento con motivo y versión esperada; tras el éxito el foco pasa a la confirmación.

## Concurrencia y auditoría

Las transiciones que expone la UI envían la versión esperada: reintento INT-004 (`rowVersion`) y NOT-003..006 (`audit.version`), como `If-Match`. La API compara la versión dentro de la misma transacción que escribe (`*_expected`, migraciones `20261006000200` y `20261006000300`) y conserva la idempotencia: la clave ya registrada responde antes de comparar. Las acciones sensibles quedan auditadas por sus productores existentes: `JobRetryRequested` (con motivo y actor), `NotificationRead/Acknowledged/AttentionStarted/Resolved`, `FileReadAuthorized` por cada URL temporal y los cambios de suscripción proyectados desde `subscriptions.events`. Abrir Checkout o Portal no cambia estado y no se audita; el cambio que confirma Stripe sí.

## Accesibilidad y responsive

HTML semántico, `main#main-content` con enlace de salto, nombres accesibles en todos los controles, foco gestionado en detalles y confirmaciones, errores de formulario junto al campo y en resumen, estados con texto además de color, regiones vivas para cambios de estado, objetivos táctiles de 44 px, `prefers-reduced-motion` y reflujo sin desplazamiento horizontal a 375 px. No hay axe configurado en el repositorio: el E2E comprueba nombres accesibles, `lang`, el enlace de salto como primer foco y el reflujo.

## Pruebas

- Componentes (`*.test.tsx`, render en servidor con `react-dom/server`, sin dependencias nuevas): estados del shell, banner de modo lectura, clasificación de fallos, suscripción por estado y permiso, archivos por veredicto y modo, auditoría, alertas y trabajos.
- BFF: códigos conservados, versión obligatoria, logs de integración solo por correlación.
- E2E `tests/integration/ui-services.test.ts`: API completa (`AppModule`) con tokens OIDC firmados y verificados contra un JWKS local, identidad y roles reales en PostgreSQL, worker real, doble de Storage, web y Chromium.
