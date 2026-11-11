# Recorridos con lector de pantalla

EXC-F6-01 vigente. En P13 (08/11/2026), el usuario confirmó que aún no ejecuta los recorridos. Ningún recorrido se declara ejecutado. Preparación: NVDA en Windows (Tab/Shift+Tab, encabezados H, activar Enter); VoiceOver en iPhone (deslizar y doble toque); TalkBack en Android (deslizar y doble toque). Verificar nombre, rol, estado, orden de foco, anuncios de error y ausencia de trampas. Registrar dispositivo, lector, versión, fecha, responsable y defectos junto al resultado. Viewport no sustituye un dispositivo real.

| ID    | Flujo / pasos                                                                                                                                                                               | Tamaño y lector                                | Resultado / evidencia | Revisor / fecha |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------- | --------------- |
| SR-01 | Autenticación: abrir /, recorrer campos, enviar vacío, escuchar error, entrar con cuenta de prueba y comprobar foco.                                                                        | Móvil 375: VoiceOver/iPhone o TalkBack/Android | Pendiente             | —               |
| SR-02 | Autenticación: abrir /, recorrer campos, enviar vacío, escuchar error, entrar con cuenta de prueba y comprobar foco.                                                                        | Tableta 768: TalkBack/Android o VoiceOver/iPad | Pendiente             | —               |
| SR-03 | Autenticación: abrir /, recorrer campos, enviar vacío, escuchar error, entrar con cuenta de prueba y comprobar foco.                                                                        | Escritorio 1280: NVDA/Windows                  | Pendiente             | —               |
| SR-04 | Contexto: entrar en demo, abrir selector, elegir sucursal y máquina, aplicar, comprobar anuncio y contexto.                                                                                 | Móvil 375: VoiceOver/iPhone o TalkBack/Android | Pendiente             | —               |
| SR-05 | Contexto: entrar en demo, abrir selector, elegir sucursal y máquina, aplicar, comprobar anuncio y contexto.                                                                                 | Tableta 768: TalkBack/Android o VoiceOver/iPad | Pendiente             | —               |
| SR-06 | Contexto: entrar en demo, abrir selector, elegir sucursal y máquina, aplicar, comprobar anuncio y contexto.                                                                                 | Escritorio 1280: NVDA/Windows                  | Pendiente             | —               |
| SR-07 | Resumen vacío: seleccionar cuenta vacía, abrir /summary, recorrer encabezados y KPI, escuchar estado vacío sin ceros engañosos.                                                             | Móvil 375: VoiceOver/iPhone o TalkBack/Android | Pendiente             | —               |
| SR-08 | Resumen vacío: seleccionar cuenta vacía, abrir /summary, recorrer encabezados y KPI, escuchar estado vacío sin ceros engañosos.                                                             | Tableta 768: TalkBack/Android o VoiceOver/iPad | Pendiente             | —               |
| SR-09 | Resumen vacío: seleccionar cuenta vacía, abrir /summary, recorrer encabezados y KPI, escuchar estado vacío sin ceros engañosos.                                                             | Escritorio 1280: NVDA/Windows                  | Pendiente             | —               |
| SR-10 | Navegación: cambiar Dueño → Administrador → Técnico → Solo lectura → ICE24; recorrer menú, abrir destino permitido y URL denegada; comprobar nombre, foco y ausencia de acciones indebidas. | Móvil 375: VoiceOver/iPhone o TalkBack/Android | Pendiente             | —               |
| SR-11 | Navegación: cambiar Dueño → Administrador → Técnico → Solo lectura → ICE24; recorrer menú, abrir destino permitido y URL denegada; comprobar nombre, foco y ausencia de acciones indebidas. | Tableta 768: TalkBack/Android o VoiceOver/iPad | Pendiente             | —               |
| SR-12 | Navegación: cambiar Dueño → Administrador → Técnico → Solo lectura → ICE24; recorrer menú, abrir destino permitido y URL denegada; comprobar nombre, foco y ausencia de acciones indebidas. | Escritorio 1280: NVDA/Windows                  | Pendiente             | —               |

## Pantallas F7 adicionales

Con cada lector: abrir calendario y lista, cambiar filtro de estado, comprobar que etiquetas Próximo/Vencido/Crítico se anuncien sin depender del color; recorrer las vistas funcionales de ticket, orden y centro de sincronización. Ejecución humana pendiente. P4/P9 ya implementan captura, firma y cierre offline; P10 comparación y motivo. Seguir los pasos específicos siguientes, sin sustituirlos por maquetas.

## P4/P5 — Ejecución, cierre y revisión

Pendiente de ejecución humana (no equivale a una firma de accesibilidad):

1. Técnico, orden en atención, `/execute`: llegar por teclado a cada paso, lectura con unidad/rango, lote y nombre de firma. Confirmar sin dibujar; verificar anuncio textual. Preparar una foto, revisar vista previa, subir y consultar verificación.
2. Guardar borrador y comprobar anuncio de éxito. Simular fallo: datos conservados y foco en mensaje; intentar salir para comprobar guardia de cambios.
3. `/close`: recorrer lista de requisitos faltantes, activar enlace y localizar campo exacto; confirmar que el cierre incompleto queda bloqueado. Leer resultado y seguimiento.
4. Dueño/Administrador del ámbito, `/review`: seleccionar versión, leer autor/fecha y diferencias del Comparator, registrar motivo y corrección. Verificar que la versión original continúa disponible.
5. Revisar SyncStatus en «Almacenamiento lleno» y «Almacenamiento no disponible»: no anuncia éxito ni pérdida inexistente; explica cómo continuar. Pruebas en móvil 375 px y escritorio, zoom y lector.

## P7–P9 — Trabajo local (pendiente de ejecución humana)

1. Como Técnico, descargar una orden asignada; escuchar el avance y la confirmación de disponibilidad. Abrir la descarga y retirar la conexión.
2. Recorrer checklist, diagnóstico, piezas, lectura/unidad, lote y firma mediante teclado/lector. Capturar fotos y confirmar el anuncio de guardado local, sin confundirlo con verificación servidor.
3. Recargar sin red: revisar persistencia y foco. Abrir revisión de cierre, volver a editar y confirmar. Anunciar pendientes sin interrumpir la entrada de texto.
4. Reconectar: distinguir Pendiente, Sincronizando, Error y Cierre sincronizado. Un conflicto exige revisión y no permite sobrescritura.
5. Como administrador, revisar dispositivo/vigencia y liberar con motivo. Probar almacenamiento lleno, vencimiento y sesión cambiada: la pantalla debe explicar cómo continuar sin atribuir un guardado inexistente.

## P10–P12 — Comparación y pérdida de acceso (pendiente humano)

1. Técnico, `/maintenance/synchronization`: recorrer operaciones, estado, intentos y archivos. Abrir conflicto y comprobar lectura de servidor/dispositivo; no ofrecer resolución sin permiso.
2. Administrador: recorrer todos los campos del Comparator, abrir originales, elegir estrategia y completar motivo. Confirmar que el diálogo recibe foco, anuncia la consecuencia y devuelve foco al cerrar. Para combinación, cada campo exige origen explícito.
3. Revocar/desactivar con borrador offline y reconectar: anunciar eliminación y número de operaciones locales perdidas; no dejar foco en controles de la orden eliminada. No confundir una caída temporal del servicio con revocación.
4. Cerrar sesión con pendientes: leer advertencia y probar «Volver y sincronizar» antes de confirmar borrado. Comprobar foco visible, zoom y ausencia de desplazamiento horizontal a 375 px.

Registrar lector/dispositivo, persona, fecha, resultado y defecto. Las pruebas Axe no sustituyen este recorrido; EXC-F6-01 continúa vigente.

Guion detallado y registro para ejecución humana: [screen-reader-script.md](screen-reader-script.md). Pendiente – responsable: Calixto Isaac Galeana Medrano (QA), con los roles indicados por escenario. No se sustituye por automatización.
