# Componentes de dominio del ICE24 Design System

Estado: implementados el 17/10/2026 ([TASK-F6-04](../../tasks/task-f6-04.md)). Código en `packages/ui/src/components/domain`, estilos en `domain.css` (solo tokens semánticos), historias en Storybook › **Dominio** y capturas `componentes-triada`, `-alerta-critica`, `-comparador`, `-sincronizacion`, `-modo-lectura` y `-trabajos` en la galería de `pnpm ux:snapshots`. Se construyen con los [componentes base](base.md) (`StatusTag`, `Button`, `Banner`, `Icon`).

```tsx
import { CriticalAlert, JobStatus, MachineTriad, ReadOnlyBanner } from "@ice24/ui";
```

## Reglas comunes

- **Presentacionales.** Reciben datos por props y no llaman a la API. `@ice24/ui` no depende de `@ice24/contracts`: los tipos de estado repiten los enums de API.md/Database.md y son compatibles con los de contratos.
- **Transiciones como callbacks.** «Marcar enterado», «Atender», «Marcar resuelta» y «Reintentar trabajo» reciben la **versión esperada** (`expectedVersion`), que la pantalla envía como `If-Match`. «Reintentar» de sincronización recibe el **identificador de operación**, que la pantalla reenvía como `Idempotency-Key`.
- **No duplicar efectos.** Mientras la transición está en curso (`pending`, `retrying`), el botón muestra progreso y sigue enfocable pero ignora clics (`aria-disabled`); las demás acciones de la tarjeta quedan bloqueadas con su motivo. Un reintento tras un error ambiguo se envía con la misma versión y la misma clave, así que la API repite la respuesta en vez de aplicar dos veces.
- **412 recuperable.** `feedback: { kind: "conflict" | "error", message, title? }` dibuja `TransitionFeedbackBanner` dentro del registro: un conflicto («La información cambió») ofrece **Actualizar** (vuelve a leer, nunca reenvía); un error ofrece **Reintentar**. `role="alert"`.
- **Estados completos.** Carga (`loading` con esqueleto y `aria-busy`), vacío («Sin datos», «No hay campos que comparar»), error y conflicto (`feedback`), permiso denegado (sin callback → sin botón) y modo lectura/sin conexión (`actionsDisabledReason`/`retryDisabledReason` → botón enfocable con motivo).
- **Nunca solo color.** Cada estado lleva texto e icono; la dimensión («Operación», «Prioridad», «Sincronización», «Trabajo») se lee antes del estado.

## MachineTriad

Tres estados independientes de la máquina (RF-EQP-012, RF-SAN-010, UI_UX §6.4 y §13.7), como tres chips; nunca se fusionan en una calificación.

| Prop                                   | Tipo                                                               | Uso                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `operational`, `technical`, `sanitary` | enums de API.md (`available`…, `optimal`…, `up_to_date`…) o `null` | `null` = «Sin datos» (no se oculta)                                                           |
| `machine`                              | `string`                                                           | Nombra la lista: «Estado de ICE24-000145»                                                     |
| `display`                              | `labeled` · `chips`                                                | `labeled` escribe «Operación: Disponible»; `chips` solo el estado (encabezado del expediente) |
| `layout`                               | `row` · `stack`                                                    | Fila que se ajusta o columna en tarjetas angostas                                             |
| `loading`                              | `boolean`                                                          | Esqueleto por dimensión                                                                       |

| Dimensión | Icono     | Estados (tono)                                                                                                                           |
| --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Operación | `machine` | Disponible (éxito) · Apagada (sin datos) · En mantenimiento (información) · Fuera de servicio, Suspendida (error) · Retirada (sin datos) |
| Técnico   | `tool`    | Óptimo (éxito) · Atención preventiva, Atención requerida (advertencia) · Crítico (error)                                                 |
| Sanitario | `shield`  | Al día (éxito) · Próximo a vencer, Atención requerida (advertencia) · Acción correctiva, Restringido (error)                             |

**Prioridad visual** (`dominantDimension()`): un estado sanitario en error domina; si no, el técnico crítico; si no, una parada operativa. El dominante se dibuja **sólido** (`data-dominant`); los otros siguen visibles en tono suave.

## CriticalAlert

Tarjeta de alerta (UI_UX §13.7 «Tarjeta de alerta crítica», §26; F5-11). La usa el Centro de alertas.

| Prop                                                                       | Uso                                                                                                                           |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `title`, `message`, `source`, `responsible`, `escalation`                  | Condición, máquina/sucursal, responsable y próximo nivel de escalamiento                                                      |
| `priority` (`critical` · `high` · `warning` · `info`)                      | Chip «Prioridad: Crítica» (sólido si es crítica) y franja lateral                                                             |
| `status` (`unread` · `read` · `acknowledged` · `in_progress` · `resolved`) | Chip «Estado: …»                                                                                                              |
| `pinned`                                                                   | Fondo y borde de error, «Fijada» con icono y la nota «Fijada hasta que marques «Enterado». Leerla no la quita de esta lista.» |
| `version`                                                                  | `audit.version`; se pasa a cada transición                                                                                    |
| `elapsed`, `occurredAt`                                                    | «hace 7 h» con `<time dateTime>`                                                                                              |
| `onAcknowledge`, `onAttend`, `onResolve`                                   | `(expectedVersion) => void`. Solo se dibujan desde los estados que F5-11 permite; sin callback, sin botón                     |
| `resolveBlockedReason`                                                     | «Marcar resuelta» enfocable con el motivo (condición vinculada abierta)                                                       |
| `pending`                                                                  | Acción en curso: su botón dice «Registrando…» y las demás se bloquean                                                         |
| `actionsDisabledReason`                                                    | Sin conexión u otra acción de la pantalla en curso                                                                            |
| `feedback`, `onRefresh`, `onRetryFeedback`                                 | 412 o error dentro de la tarjeta                                                                                              |
| `onToggleDetail`, `detailOpen`, `detail`                                   | «Ver detalle» con `aria-expanded`/`aria-controls`. Abrirla marca «Leída», nunca «Enterado» (lo hace la pantalla)              |
| `action`                                                                   | Enlace a la fuente («Ver suscripción»)                                                                                        |
| `as`, `titleAs`                                                            | `li` dentro de listas; `article` por defecto, nombrado por su título                                                          |

**Jerarquía de acciones:** en una alerta sin «Enterado», «Marcar enterado» es la acción principal (es la primera obligación, RF-ALT-006) y «Atender» la secundaria; una vez enterada, «Atender» pasa a principal.

Las transiciones de alertas siguen disponibles en modo lectura (F5-11 las declara operación propia permitida): no se pasa `actionsDisabledReason` por el modo.

## Comparator

Comparación lado a lado (UI_UX §13.7 «Comparador de versiones», §14.18): anterior/propuesto, servidor/dispositivo o esperado/real.

| Prop              | Uso                                                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `before`, `after` | `{ label, meta }`: «Versión del servidor» + «Actualizada 19:14 por Luis» (autor, fecha y motivo ya formateados)                                                                           |
| `fields`          | `{ id, label, before, after, changed?, beforeText?, afterText?, note?, noteTone? }`. Texto y números se comparan solos; un nodo (enlace a evidencia) declara `changed` y su texto hablado |
| `showUnchanged`   | Por defecto (`false`) solo lista los cambios y ofrece «Mostrar N campos sin cambios» (`aria-expanded`); `true` abre con todos                                                             |
| `loading`         | Esqueleto y `aria-busy`                                                                                                                                                                   |
| `children`        | Evidencia relacionada o el formulario de resolución (opciones + motivo obligatorio)                                                                                                       |

Lectura por lector de pantalla: primero el resumen («2 diferencias: concentración, evidencia.», asociado a la tabla con `aria-describedby`); luego una tabla con encabezados de fila y columna y una columna **Diferencia** que dice «Cambió de 150 ppm a 140 ppm» o «Sin cambio». Las filas con cambios tienen fondo de advertencia **y** la insignia escrita «Cambió». Por debajo de 768 px cada campo es una tarjeta «etiqueta: valor» con roles ARIA explícitos. No elige ganador (UI_UX §20.6).

## SyncStatus

Indicador de sincronización (UI_UX §13.7, §20.1, §20.5).

| Estado              | Texto                        | Tono        | Icono          |
| ------------------- | ---------------------------- | ----------- | -------------- |
| `synced`            | Sincronizado                 | éxito       | `check-circle` |
| `syncing`           | Sincronizando…               | información | `sync` (fijo)  |
| `pending`           | Pendiente de sincronizar     | offline     | `clock`        |
| `saved_locally`     | Guardado en este dispositivo | offline     | `device`       |
| `available_offline` | Disponible sin conexión      | offline     | `download`     |
| `error`             | Error al sincronizar         | error       | `danger`       |
| `conflict`          | Conflicto                    | error       | `conflict`     |
| `offline`           | Sin conexión                 | offline     | `offline`      |

`variant="chip"` (encabezado; `role="status"`, con «· 3» y «3 cambios sin sincronizar» para lectores) o `panel` (elemento de la cola: `entity`, explicación, pendientes, `lastSynced`, intento y operación). `onRetry(operationId)` solo en `error`; `onResolve()` solo en `conflict` (abre el Comparator). `retrying` bloquea el botón mientras dura. «Sincronizando…» no gira: UI_UX §8.8 pide no animar información de estado de forma continua.

## Modo lectura

Diferencia **D3 resuelta**: un solo tratamiento —**advertencia + candado + consecuencia escrita**— en la barra global, el banner `readonly` y el indicador local. El modo lectura es una restricción con salida (regularizar la suscripción), no ausencia de datos; el tono neutro de la galería se descartó porque se confunde con «Sin datos/archivado».

- `ReadOnlyBanner`: `active`, `title` («Cuenta en modo lectura»), `reason` (motivo de F5-03), `action` (qué hacer según el permiso), `subscriptionHref` (`/subscription`; `null` lo oculta) y `subscriptionLabel`. La región `aria-live="polite"` siempre está montada, así que un `ACCOUNT_READ_ONLY` tardío se anuncia. No se puede cerrar. La suspensión conserva su propio banner de error en la web privada.
- `ReadOnlyIndicator`: chip con candado junto a un título, formulario o sección. `scope="account"` («Modo lectura») o `permission` («Solo consulta», por rol) y `reason`. Sirve para avisar antes de iniciar un flujo (UI_UX §25.2); la acción concreta se bloquea con `Button disabledReason`.

## JobStatus

Estado de trabajo asíncrono (UI_UX §13.7, §19.4; F5-07, JOB-001).

| Estado             | Texto                | Tono        | Icono          |
| ------------------ | -------------------- | ----------- | -------------- |
| `QUEUED`           | En cola              | información | `clock`        |
| `RUNNING`          | Procesando           | información | `play`         |
| `SUCCEEDED`        | Completado           | éxito       | `check-circle` |
| `RETRY_WAIT`       | Reintento programado | advertencia | `refresh`      |
| `FAILED`           | Fallido              | error       | `danger`       |
| `DEAD_LETTER`      | Requiere revisión    | error       | `inbox`        |
| `queued` (JOB-001) | Solicitada           | información | `clock`        |
| `processing`       | Procesando           | información | `play`         |
| `completed`        | Disponible           | éxito       | `check-circle` |
| `failed`           | Error reintentable   | error       | `danger`       |

`variant="tag"` (tablas e historial) o `detail` (intentos «5 de 5», manuales, próximo intento en `RETRY_WAIT`, código de error en monoespaciada, explicación de DLQ, `children` para el motivo obligatorio y **Reintentar trabajo**). El reintento solo aparece en `FAILED`, `DEAD_LETTER` y `failed`, con `onRetry(expectedVersion)` y `version` (`rowVersion`). `jobStatusLabel()` y `JOB_STATES` dan los textos a filtros y mensajes.

## Decisiones de negocio (17/10/2026)

Preguntas abiertas de F6-04 resueltas por el responsable del proyecto con el criterio «lo más profesional para el sistema»; se pueden revisar en la firma de P10.

| Pregunta                   | Decisión                                                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prioridad de la tríada     | El estado sanitario en error domina siempre, también sobre un técnico «Crítico» (UI_UX §6.4: inocuidad primero)                                                                  |
| «En mantenimiento»         | Información (azul): actividad planificada; reservar ámbar para riesgos evita fatiga de alertas                                                                                   |
| «Suspendida»               | Error (rojo), igual que «Fuera de servicio»: la máquina no puede operar                                                                                                          |
| Iconos de la tríada        | Por dimensión (máquina, herramienta, escudo), como pide UI_UX §6.4; la gravedad la dan texto, color y relleno. Escudo para sanitario (la gota se reserva para agua y mediciones) |
| Acción principal de alerta | «Marcar enterado» mientras no esté enterada; después, «Atender»                                                                                                                  |
| Alerta fijada              | Fondo rojo suave + borde + «Fijada» con icono                                                                                                                                    |
| Textos de trabajos         | «Requiere revisión» en lugar de «En DLQ» (el detalle explica la DLQ); se mantienen «Procesando» y «Reintento programado» (más precisos que «En curso» y «Reintentando»)          |
| Modo lectura               | Ámbar + candado confirmado; «Solo consulta» para roles sin edición                                                                                                               |
| Sincronización             | «Disponible sin conexión» (sin anglicismo); el encabezado muestra el número de pendientes                                                                                        |
| Comparador                 | Solo los cambios por defecto, con «Mostrar N campos sin cambios»                                                                                                                 |

## Uso en la web privada (F5-15)

| Pantalla                | Antes                                    | Ahora                                                                                                                                                                               |
| ----------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell de cuenta (todas) | `Banner tone="readonly"` armado a mano   | `ReadOnlyBanner` con el motivo y la acción de F5-03; «Ver suscripción» como botón-enlace                                                                                            |
| Centro de alertas       | Tarjeta propia (`alert-card`, chips CSS) | `CriticalAlert`; el 412 y los errores de una transición se explican en la tarjeta afectada (si la tarjeta salió de la vista, en la página) y «Reintentar» reutiliza versión y clave |
| Centro de trabajos      | `StatusBadge` con clases `job-status--*` | `JobStatus` en tabla, detalle e historial; el 412 del reintento usa `TransitionFeedbackBanner`. El formulario de reintento (motivo, CSRF, clave) no cambia                          |

No se tocaron: `MachineTriad` y `Comparator` (no hay pantallas de máquinas ni de conflictos en F5-15; llegan con Fases 7–9), `SyncStatus` (no hay PWA offline todavía; la web privada solo tiene el banner sin conexión de F5-15) y el estado de integraciones del diagnóstico de trabajos (no es un `JobStatus`).
