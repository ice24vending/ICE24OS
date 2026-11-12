# Guion de lector de pantalla — EXC-F6-01 / D-02

Estado: **pendiente – responsable: Calixto Isaac Galeana Medrano (Tech Lead / QA)**. Ningún resultado se prellena como aprobado. Las comprobaciones axe y Playwright son preparación técnica; no acreditan los anuncios de un lector real. La excepción vence antes de la primera UI privada productiva y, como máximo, en este gate F7; este documento no amplía esa fecha.

## Preparación y registro

Usar la misma revisión del pulido que apruebe Dirección, una cuenta de prueba y datos ficticios. Anotar commit, URL, fecha/hora/zona, nombre del ejecutor, dispositivo/modelo, OS, navegador y versión, lector y versión, zoom, orientación, evidencia y defecto. Ejecutar escritorio con NVDA + Chrome en Windows; móvil con VoiceOver + Safari en iPhone; tableta con VoiceOver + Safari en iPad. Los tamaños 375/768/1280 son referencias de diseño: emularlos no acredita un dispositivo físico. Si no hay iPad disponible, dejar las tres filas de tableta pendientes.

NVDA: Tab/Mayús+Tab para controles, H/Mayús+H para encabezados, D para regiones, Enter/Espacio para activar, Alt+flecha para select; alternar modo foco con NVDA+Espacio cuando corresponda. VoiceOver: deslizar derecha/izquierda, rotor Encabezados/Controles, doble toque para activar y gesto de escape de dos dedos para cerrar. No exigir texto literal del navegador: registrar nombre, rol, estado y contexto equivalentes. Capturar audio/video con consentimiento y sin credenciales.

## A — Autenticación (SR-01/02/03)

1. Abrir `/` sin sesión. Recorrer H1 «ICE24 OS», H2 «Inicia sesión» y campos. Deben anunciarse «Correo», campo de correo obligatorio, y «Contraseña», campo protegido obligatorio; no leer su contenido.
2. Llegar a «Continuar» usando solo teclado/gestos y enviar vacío. El foco debe localizar el primer campo inválido y anunciar la validación del navegador; completar correo y repetir para contraseña. No avanzar al sistema con formulario inválido.
3. Con datos ficticios inválidos, provocar rechazo. Debe anunciarse «No fue posible iniciar sesión…» sin revelar existencia de cuentas; localizar el mensaje y regresar a corregir datos. Registrar dónde queda el foco.
4. Revisar `/?recovery=sent`: anuncio de estado «Si la cuenta existe…», sin bloquear la navegación.
5. Entrar con cuenta de prueba válida (la demo solo acredita navegación ficticia, no el proveedor de identidad). Debe identificarse el nuevo encabezado/contexto y alcanzarse «Ir al contenido». Registrar foco y ausencia de trampas.

## B — Contexto (SR-04/05/06)

1. Entrar como Dueño en cuenta de prueba/demo. Localizar el botón con cuenta, rol, sucursal, máquina y «Cambiar contexto». Activarlo. Debe anunciarse diálogo «Contexto de trabajo» y su explicación.
2. Recorrer opciones y selects «Sucursal» y «Máquina». Deben anunciar nombre, valor y disponibilidad. Seleccionar una sucursal y una máquina perteneciente a ella; confirmar que no permanecen opciones ajenas.
3. Tab/Mayús+Tab o gestos deben permanecer dentro del diálogo. Escape/gesto equivalente lo cierra y devuelve el foco al botón que lo abrió.
4. Reabrir, seleccionar y activar «Aplicar sucursal y máquina». Durante espera debe anunciarse «Aplicando…»/estado ocupado; al finalizar deben identificarse cuenta, sucursal y máquina nuevas. No leer datos anteriores como vigentes.
5. Repetir con fallo temporal de red: anunciar «No se cambió el contexto», conservar selección/contexto anterior y permitir reintento. Registrar foco, sin pérdida de controles ni cambio silencioso.
6. Con cambios sin guardar, intentar cambio: anunciar diálogo de alerta y consecuencias; «Seguir editando» conserva datos y foco; confirmar descarte solo sobre datos de prueba.

## C — Resumen vacío (SR-07/08/09)

1. En Demo seleccionar escenario Vacío y abrir la vista F6 `/plantillas/panel`; recorrer el estado «Sin datos disponibles todavía.» y su explicación; cuando un KPI esté presente sin fuente, debe decir «Sin datos». No interpretar ausencia como cero. Después seleccionar mantenimiento Sin actividades y abrir `/summary` para comprobar también la tarjeta nueva F7. En cuenta real de prueba sin registros, repetir el resumen completo.
2. Recorrer encabezados y regiones: Resumen, indicadores, Tareas por atender y máquinas. Deben tener nombres comprensibles y orden lógico.
3. Escuchar «No hay tareas por atender» y explicación del contexto, y el estado vacío de máquinas. No confundir cero real, información no disponible y módulo deshabilitado.
4. Recorrer enlaces «Ver todas» y volver. Debe identificarse destino y foco tras navegación; no quedarse en un elemento desmontado. Verificar zoom y recorrido sin scroll horizontal que oculte contenido.
5. Comparar módulo deshabilitado y fallo de consulta: deben anunciarse causas diferentes; nunca anunciar vacío cuando la consulta falló.

## D — Navegación por rol (SR-10/11/12)

1. Repetir con Dueño, Administrador de sucursal, Técnico, Solo lectura, Operador ICE24 y Administrador ICE24; registrar cada persona. «Ir al contenido» debe ser el primer control y saltar al contenido.
2. Recorrer navegación. En móvil/tableta abrir «Abrir menú»; anunciar diálogo «Menú», mantener foco dentro y devolverlo al cerrar. En escritorio recorrer grupos y nombres de enlaces.
3. Abrir un destino permitido por el menú usando teclado/gestos. Comprobar encabezado, breadcrumb, enlace activo y foco en el contenido nuevo.
4. Escribir una URL no autorizada para esa persona. Debe anunciarse denegación, sin datos privados ni acciones de mutación. En listado de órdenes denegado, «Ir al resumen» debe salir de la denegación; no debe ofrecer «Volver a intentar» para un 403.
5. Como Solo lectura, abrir revisión de una ejecución: se consulta el registro sin formulario de corrección. Como Técnico, comprobar ejecución de su orden, sin administración no autorizada. No modificar roles ni permisos para completar el guion.

## Registro individual (12 recorridos)

| ID    | Flujo              | Dispositivo / lector                      | Resultado                   | Observación / defecto | Evidencia | Firmante / fecha |
| ----- | ------------------ | ----------------------------------------- | --------------------------- | --------------------- | --------- | ---------------- |
| SR-01 | Autenticación      | iPhone · VoiceOver/Safari; versiones: ___ | Pendiente – responsable: QA | ___                   | ___       | ___              |
| SR-02 | Autenticación      | iPad · VoiceOver/Safari; versiones: ___   | Pendiente – responsable: QA | ___                   | ___       | ___              |
| SR-03 | Autenticación      | Windows · NVDA/Chrome; versiones: ___     | Pendiente – responsable: QA | ___                   | ___       | ___              |
| SR-04 | Contexto           | iPhone · VoiceOver/Safari; versiones: ___ | Pendiente – responsable: QA | ___                   | ___       | ___              |
| SR-05 | Contexto           | iPad · VoiceOver/Safari; versiones: ___   | Pendiente – responsable: QA | ___                   | ___       | ___              |
| SR-06 | Contexto           | Windows · NVDA/Chrome; versiones: ___     | Pendiente – responsable: QA | ___                   | ___       | ___              |
| SR-07 | Resumen vacío      | iPhone · VoiceOver/Safari; versiones: ___ | Pendiente – responsable: QA | ___                   | ___       | ___              |
| SR-08 | Resumen vacío      | iPad · VoiceOver/Safari; versiones: ___   | Pendiente – responsable: QA | ___                   | ___       | ___              |
| SR-09 | Resumen vacío      | Windows · NVDA/Chrome; versiones: ___     | Pendiente – responsable: QA | ___                   | ___       | ___              |
| SR-10 | Navegación por rol | iPhone · VoiceOver/Safari; versiones: ___ | Pendiente – responsable: QA | ___                   | ___       | ___              |
| SR-11 | Navegación por rol | iPad · VoiceOver/Safari; versiones: ___   | Pendiente – responsable: QA | ___                   | ___       | ___              |
| SR-12 | Navegación por rol | Windows · NVDA/Chrome; versiones: ___     | Pendiente – responsable: QA | ___                   | ___       | ___              |

Aceptación: los 12 recorridos completos sin bloqueo de navegación, nombres ambiguos, pérdida de foco o anuncios ausentes. Ante fallo, registrar severidad, pasos y evidencia; corregir y repetir el recorrido afectado. Tech Lead / QA solo retira EXC-F6-01 en el registro original después de recibir los 12 resultados humanos y cerrar defectos. Dirección firma el gate por separado.

## Revisión de producto tras #68 — anuncios esperados por recorrido

Pendiente – responsable: Calixto Isaac Galeana Medrano (QA / Tech Lead). La prueba anterior de anuncios verificaba el Dashboard de referencia F6; no acreditaba el Resumen operativo. Ahora ambos usan `LiveRegion`. Antes de probar el anuncio operativo, en el panel Demo seleccionar **Alerta crítica: probar anuncio**, Dueño, cuenta activa, y abrir `/summary`. La acción devuelve un resultado ficticio sin persistencia: recargar restablece la alerta y no crea auditoría productiva. No modificar permisos para probarlo.

| Recorrido | Plataforma                  | Anuncio / comprobación esperada                                                                                                                                                                                                    | Estado         |
| --------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| SR-01     | VoiceOver + Safari / iPhone | Campo obligatorio al enviar vacío; rechazo de acceso al usar credenciales inválidas; «Si la cuenta existe…» en recuperación.                                                                                                       | Pendiente – QA |
| SR-02     | VoiceOver + Safari / iPad   | Los mismos nombres, obligatoriedad y mensaje de recuperación de SR-01.                                                                                                                                                             | Pendiente – QA |
| SR-03     | NVDA + Chrome / Windows     | Los mismos nombres, obligatoriedad y mensaje de recuperación de SR-01.                                                                                                                                                             | Pendiente – QA |
| SR-04     | VoiceOver + Safari / iPhone | «Contexto de trabajo», nombre/valor de selects; «No se cambió el contexto» ante error; nuevo contexto tras éxito y foco devuelto al disparador al cancelar.                                                                        | Pendiente – QA |
| SR-05     | VoiceOver + Safari / iPad   | Diálogo y cambios/error de contexto como SR-04, sin escapar del modal con gestos.                                                                                                                                                  | Pendiente – QA |
| SR-06     | NVDA + Chrome / Windows     | Diálogo y cambios/error de contexto como SR-04, sin escapar del modal con gestos.                                                                                                                                                  | Pendiente – QA |
| SR-07     | VoiceOver + Safari / iPhone | Vacío distinto de cero/deshabilitado. En `/summary`, tras «Marcar enterado»: «[título de la alerta]: el cambio quedó auditado». En referencia F6: «Alerta marcada como enterada. Folio…». Una sola confirmación, sin foco forzado. | Pendiente – QA |
| SR-08     | VoiceOver + Safari / iPad   | Estados y confirmación del Resumen real como SR-07; no basta revisar Storybook.                                                                                                                                                    | Pendiente – QA |
| SR-09     | NVDA + Chrome / Windows     | Estados y confirmación del Resumen real como SR-07; no basta revisar Storybook.                                                                                                                                                    | Pendiente – QA |
| SR-10     | VoiceOver + Safari / iPhone | Nombre del nuevo módulo y encabezado tras navegación, estado del menú y «Sin permiso» ante acceso denegado; sin anunciar éxito de una acción bloqueada.                                                                            | Pendiente – QA |
| SR-11     | VoiceOver + Safari / iPad   | Nombres de módulo, estado del menú y denegación como SR-10; foco al disparador al cerrar el menú.                                                                                                                                  | Pendiente – QA |
| SR-12     | NVDA + Chrome / Windows     | Nombres de módulo, estado del menú y denegación como SR-10; foco al disparador al cerrar el menú.                                                                                                                                  | Pendiente – QA |

Los IDs conservan la matriz histórica: móvil 375, tableta 768, escritorio 1280 en automatización; al registrar evidencia humana usar la plataforma efectiva del dispositivo, sin equiparar emulación con lector. Las filas de firma originales siguen vacías.

### Extensión operativa F7 (anotar junto al recorrido de cada plataforma)

- Descargar una orden como Técnico: «Verificando espacio y descargando…», después «Disponible sin conexión…». La región debe existir antes del clic; no mover el foco.
- Ejecutar → guardar borrador: «Borrador guardado en el servidor». Revisar/cerrar/corregir: «Operación registrada. El historial anterior se conserva»; conservar el foco previsto por el flujo en errores.
- Crear ticket o asignar orden con fallo controlado: anunciar el error bloqueante una vez, conservar valores y permitir corregir. No confundir una región vacía con un error.
- Centro de sincronización: anunciar consulta, pérdida de conexión y error de actualización; no afirmar que se sincronizó cuando falla.
- Editor offline: anunciar «Guardando en este dispositivo…» y luego «Guardado en este dispositivo» una vez; si falla almacenamiento, anunciar que no se guardó y mantener la advertencia. El chip visual no debe repetir la confirmación.
- Carga de fotos: anunciar preparación/carga y su resultado; cualquier error bloqueante conserva la captura y no anuncia éxito.

La automatización comprueba DOM, cambios de texto, roles y foco; **el anuncio audible exacto, contraste indeterminado, uso físico y firmas siguen pendientes**.
