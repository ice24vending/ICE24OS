# P13 — Auditoría de regiones vivas del producto

Candidato posterior al rebase sobre main `cba6e15`. Estado humano: **pendiente – responsable QA / UX**. La primera corrección P13 cubría la vista de referencia F6 y su historia, pero dejó fuera `/summary`. Esta revisión corrige el producto; no atribuye a la pasada anterior cobertura que no tenía.

## Patrón y alcance

`packages/ui/src/components/base/live-region.tsx`: `LiveRegion` permanece montado antes de la acción, con `role=status`, `aria-live=polite`, `aria-atomic=true`. Para errores que bloquean la acción acepta `role=alert` (assertive implícito, sin repetir `aria-live` para evitar anuncios redundantes en VoiceOver). El contenido vacío usa `ids-visually-hidden`, nunca `display:none`. No gestiona foco; transmite el ref para mantener el foco de error que ya tenía el flujo. No se anida otra región viva dentro del mismo mensaje.

| Pantalla / componente                              | Región corregida                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/summary`                                         | Confirmación de «Marcar enterado», antes vacía; después título de alerta y cambio auditado.                                                            |
| `/notifications`                                   | Resumen y confirmación; error de transición de la tarjeta permanece montado mediante `TransitionFeedbackBanner`.                                       |
| Selector de contexto                               | Un solo contenedor de error para ambos modos del diálogo; conserva foco y valores.                                                                     |
| `/maintenance/work-orders` y creación/asignación   | Error del formulario persistente con el ref existente.                                                                                                 |
| Ejecución / revisión / cierre                      | Resultado de guardar/revisar/cerrar y avisos de consulta persistentes; no cambia validación ni permisos.                                               |
| Tickets                                            | Error de envío y aviso de órdenes vinculadas.                                                                                                          |
| Descarga por orden / ruta                          | Progreso, resultado, versión desactualizada y ruta lista; `LiveRegion` precede la acción.                                                              |
| Lista descargada                                   | Disponibilidad y mensajes del almacenamiento local.                                                                                                    |
| Centro de sincronización                           | Error de actualización/resolución, consulta y pérdida de red.                                                                                          |
| Editor de campo offline                            | Foto local, guardado, cierre sincronizado y descarga vencida; `OfflineStatus` anuncia el mensaje una sola vez, sin duplicarlo en el chip `SyncStatus`. |
| Liberar descarga                                   | Mensaje persistente usando el mismo componente.                                                                                                        |
| Expediente de máquina                              | Mensajes persistentes y error de configuración.                                                                                                        |
| Archivos / fotos                                   | Progreso de carga, resultado, preparación de foto y error.                                                                                             |
| Auditoría / centro de trabajos / cuenta            | Validación de filtros, cola no disponible y suspensión: contenedor persistente, sin cambios de permisos.                                               |
| Revocación/vigencia offline                        | Borrado local anunciado en un nodo que ya existe antes de recibir el evento.                                                                           |
| Suscripción                                        | Estado de conexión con Stripe y error bloqueante.                                                                                                      |
| Referencias F6 panel / detalle / campo / asistente | Confirmaciones persistentes; asistente conserva región al cambiar a resultado. Historia Dashboard usa `LiveRegion`, sin implementación paralela.       |
| Tabla / alertas / trabajos / asistente compartidos | Carga persistente; selección sigue montada cuando la tabla permite seleccionar; feedback de error y validación de pasos persistentes.                  |

## Inventario restante y criterios

Se buscó `role=status`, `role=alert` y `aria-live` en `apps/private-web` y `packages/ui`, incluyendo componentes compartidos. Toast, ReadOnlyIndicator, PendingBanner, copy-link, estado de configuración, calendario y otros contadores ya mantienen su región durante la interacción. La condición de permiso o tipo de pantalla que determina si una función existe no se elimina: la región debe preceder a **su acción**, no aparecer en módulos sin acceso.

Los mensajes iniciales de páginas de acceso/recuperación se entregan como documento del servidor; su prueba exige lectura del encabezado, error y foco tras navegación, no presume que una región prellenada se anuncie sola. `SystemState` de carga/vacío/denegación se inspecciona al entrar en el documento; los errores bloqueantes usan alerta. Ninguna de estas observaciones acredita un lector real. Los diálogos mantienen su contrato de foco; la prueba espera que el disparador termine de hidratarse antes de pulsar Enter.

## Demo y evidencia

Nuevo escenario del panel Demo: **Alerta crítica: probar anuncio**, cuenta activa y Dueño. En `/summary` permite reconocer una alerta de máquina con el contrato real y `authorize()` existente; valida pertenencia, versión y clave. La respuesta es ficticia, sin persistencia ni auditoría productiva. Al recargar se restablece el ejemplo, como en las acciones de referencia F6. No cambian permisos/roles ni endpoints productivos. La galería incluye «Confirmación de alerta en el producto» en las cuatro resoluciones, además de la historia F6 compartida.

Pruebas de `LiveRegion`: nodo vacío antes del clic, identidad después, contenido, atomicidad, visibilidad accesible y foco no alterado. Preflight de producto: Resumen real y referencia, descarga, borrador, cierre, revisión, error de ticket y sincronización; suite offline: identidad de región durante guardado. [Resultados vigentes](evidence/20261111-p13-live-regions.json). [Guion humano](screen-reader-script.md).

Los anuncios audibles, contrastes indeterminados, UX, pruebas físicas, firmas y gate siguen **pendientes – responsables en [gate-f7](gate-f7.md)**.

## Incidencia del doble HTTP de asignación

La primera corrida integral falló en la asignación móvil: la respuesta ficticia no alcanzó el mensaje de éxito. La interceptación se elevó de `page.route` a `page.context().route`, que también cubre peticiones asociadas al worker; no se bloquean service workers. Una espera `offline=1` añadida durante el diagnóstico no correspondía al recorrido de asignación (no descarga) y se retiró tras contrastarla con el registro real. La suite focal terminó 8/8, sin reintentos; la suite offline conserva su comprobación explícita del worker. [Contrato de Playwright](https://playwright.dev/docs/service-workers).
