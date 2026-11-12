# Guion humano: ocho recorridos con lector — EXC-F6-01 / D-02

**Pendiente – responsable: Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador).** Cuatro flujos A–D en Windows NVDA+Chrome y Android TalkBack+Chrome. Automatización, capturas y revisión UX no acreditan estos resultados. No se extiende el plazo: antes de operación productiva y como máximo en el gate F7.

Registrar modelo, OS, lector/versión, navegador/versión, commit y fecha. Usar datos ficticios, sin exponer claves. Calixto puede ejecutar todas las personas demo; no requiere otros miembros del equipo ni modificar permisos reales.

## Manejo del lector

Windows: NVDA encendido, Chrome; Tab/Shift+Tab para controles, Enter/Espacio para activar, H/Shift+H para encabezados en modo exploración, Escape para cerrar diálogos. Escuchar antes de continuar; registrar texto realmente anunciado y foco.

Android: activar TalkBack. Deslizar un dedo derecha/izquierda avanza/retrocede; doble toque activa. Para controles de lectura, deslizar tres dedos arriba/abajo (si el equipo lo admite), o arriba-abajo en un solo gesto; elegir Encabezados y deslizar un dedo arriba/abajo para recorrerlos. Menú TalkBack: toque de tres dedos, o abajo-derecha en un solo gesto; comprobar ajustes de gestos del dispositivo. Desplazar la página con dos dedos. Fuentes: [Chrome con TalkBack](https://support.google.com/accessibility/android/answer/2633135?hl=es), [menú y controles](https://support.google.com/accessibility/android/answer/6007066?hl=es). Registrar cambios de configuración, no asumir gestos iguales en todas las versiones.

**Riesgo aceptado por instrucción del usuario (11/11/2026): iOS/iPadOS con VoiceOver no probado**, porque no hay dispositivos Apple. Puede haber diferencias de anuncios/gestos. Condición de cierre: probar cuando haya un dispositivo Apple; no prometer compatibilidad validada. Este riesgo no equivale a aprobar los ocho recorridos disponibles.

## A — Autenticación

1. Abrir `/` sin sesión. Recorrer H1 «ICE24 OS», H2 «Inicia sesión» y campos. Deben anunciarse «Correo», campo de correo obligatorio, y «Contraseña», campo protegido obligatorio; no leer su contenido.
2. Llegar a «Continuar» usando solo teclado/gestos y enviar vacío. El foco debe localizar el primer campo inválido y anunciar la validación del navegador; completar correo y repetir para contraseña. No avanzar al sistema con formulario inválido.
3. Con datos ficticios inválidos, provocar rechazo. Debe anunciarse «No fue posible iniciar sesión…» sin revelar existencia de cuentas; localizar el mensaje y regresar a corregir datos. Registrar dónde queda el foco.
4. Revisar `/?recovery=sent`: anuncio de estado «Si la cuenta existe…», sin bloquear la navegación.
5. Entrar con cuenta de prueba válida (la demo solo acredita navegación ficticia, no el proveedor de identidad). Debe identificarse el nuevo encabezado/contexto y alcanzarse «Ir al contenido». Registrar foco y ausencia de trampas.

## B — Contexto

1. Entrar como Dueño en cuenta de prueba/demo. Localizar el botón con cuenta, rol, sucursal, máquina y «Cambiar contexto». Activarlo. Debe anunciarse diálogo «Contexto de trabajo» y su explicación.
2. Recorrer opciones y selects «Sucursal» y «Máquina». Deben anunciar nombre, valor y disponibilidad. Seleccionar una sucursal y una máquina perteneciente a ella; confirmar que no permanecen opciones ajenas.
3. Tab/Mayús+Tab o gestos deben permanecer dentro del diálogo. Escape/gesto equivalente lo cierra y devuelve el foco al botón que lo abrió.
4. Reabrir, seleccionar y activar «Aplicar sucursal y máquina». Durante espera debe anunciarse «Aplicando…»/estado ocupado; al finalizar deben identificarse cuenta, sucursal y máquina nuevas. No leer datos anteriores como vigentes.
5. Repetir con fallo temporal de red: anunciar «No se cambió el contexto», conservar selección/contexto anterior y permitir reintento. Registrar foco, sin pérdida de controles ni cambio silencioso.
6. Con cambios sin guardar, intentar cambio: anunciar diálogo de alerta y consecuencias; «Seguir editando» conserva datos y foco; confirmar descarte solo sobre datos de prueba.

## C — Resumen vacío

1. En Demo seleccionar escenario Vacío y abrir la vista F6 `/plantillas/panel`; recorrer el estado «Sin datos disponibles todavía.» y su explicación; cuando un KPI esté presente sin fuente, debe decir «Sin datos». No interpretar ausencia como cero. Después seleccionar mantenimiento Sin actividades y abrir `/summary` para comprobar también la tarjeta nueva F7. En cuenta real de prueba sin registros, repetir el resumen completo.
2. Recorrer encabezados y regiones: Resumen, indicadores, Tareas por atender y máquinas. Deben tener nombres comprensibles y orden lógico.
3. Escuchar «No hay tareas por atender» y explicación del contexto, y el estado vacío de máquinas. No confundir cero real, información no disponible y módulo deshabilitado.
4. Recorrer enlaces «Ver todas» y volver. Debe identificarse destino y foco tras navegación; no quedarse en un elemento desmontado. Verificar zoom y recorrido sin scroll horizontal que oculte contenido.
5. Comparar módulo deshabilitado y fallo de consulta: deben anunciarse causas diferentes; nunca anunciar vacío cuando la consulta falló.

## D — Navegación por rol

1. Repetir con Dueño, Administrador de sucursal, Técnico, Solo lectura, Operador ICE24 y Administrador ICE24; registrar cada persona. «Ir al contenido» debe ser el primer control y saltar al contenido.
2. Recorrer navegación. En móvil/tableta abrir «Abrir menú»; anunciar diálogo «Menú», mantener foco dentro y devolverlo al cerrar. En escritorio recorrer grupos y nombres de enlaces.
3. Abrir un destino permitido por el menú usando teclado/gestos. Comprobar encabezado, breadcrumb, enlace activo y foco en el contenido nuevo.
4. Escribir una URL no autorizada para esa persona. Debe anunciarse denegación, sin datos privados ni acciones de mutación. En listado de órdenes denegado, «Ir al resumen» debe salir de la denegación; no debe ofrecer «Volver a intentar» para un 403.
5. Como Solo lectura, abrir revisión de una ejecución: se consulta el registro sin formulario de corrección. Como Técnico, comprobar ejecución de su orden, sin administración no autorizada. No modificar roles ni permisos para completar el guion.

## Registro de los ocho recorridos

| ID    | Flujo                     | Dispositivo / lector                        | Resultado           | Observación / anuncio real | Evidencia | Ejecutor / fecha / mensaje |
| ----- | ------------------------- | ------------------------------------------- | ------------------- | -------------------------- | --------- | -------------------------- |
| SR-01 | A: Autenticación          | Windows · NVDA + Chrome; versiones: ___     | Pendiente – Calixto | ___                        | ___       | ___                        |
| SR-02 | A: Autenticación          | Android · TalkBack + Chrome; versiones: ___ | Pendiente – Calixto | ___                        | ___       | ___                        |
| SR-03 | B: Contexto               | Windows · NVDA + Chrome; versiones: ___     | Pendiente – Calixto | ___                        | ___       | ___                        |
| SR-04 | B: Contexto               | Android · TalkBack + Chrome; versiones: ___ | Pendiente – Calixto | ___                        | ___       | ___                        |
| SR-05 | C: Resumen vacío y alerta | Windows · NVDA + Chrome; versiones: ___     | Pendiente – Calixto | ___                        | ___       | ___                        |
| SR-06 | C: Resumen vacío y alerta | Android · TalkBack + Chrome; versiones: ___ | Pendiente – Calixto | ___                        | ___       | ___                        |
| SR-07 | D: Navegación por rol     | Windows · NVDA + Chrome; versiones: ___     | Pendiente – Calixto | ___                        | ___       | ___                        |
| SR-08 | D: Navegación por rol     | Android · TalkBack + Chrome; versiones: ___ | Pendiente – Calixto | ___                        | ___       | ___                        |

Aceptar cada recorrido solo con evidencia real y defectos corregidos. Calixto registra los resultados y solicita el retiro de EXC-F6-01 en su registro original; Axel y Eduardo aprueban el gate por mensaje aparte. Guardar la captura en docs/qa/phase-7/evidence/.

## Anuncios esperados (en ambas plataformas)

| Flujo / IDs  | Anuncios y foco esperados                                                                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A / SR-01,02 | Nombre de Correo/Contraseña, obligatoriedad y error al enviar; «Si la cuenta existe…» en recuperación; foco en primer campo inválido.                                                                       |
| B / SR-03,04 | «Contexto de trabajo», nombre/valor de selects; «No se cambió el contexto» en fallo; contexto nuevo al aplicar; foco vuelve al disparador al cancelar.                                                      |
| C / SR-05,06 | Vacío distinto de cero/deshabilitado; en /summary, «[título de la alerta]: el cambio quedó auditado» después de Marcar enterado, una sola vez sin foco forzado. F6: «Alerta marcada como enterada. Folio…». |
| D / SR-07,08 | Nuevo módulo/encabezado y enlace activo, menú/dialogo y denegación; no anunciar éxito de acción bloqueada; foco devuelto al cerrar menú.                                                                    |

Para la alerta real usar persona Dueño y Demo «Alerta crítica: probar anuncio» en /summary. Respuesta ficticia sin persistencia: recargar restablece alerta. Los IDs humanos de ocho filas sustituyen la matriz anterior de doce; la suite automática mantiene sus IDs y resoluciones como cobertura adicional, sin equivalencia con lectores.

### Extensión operativa F7 (anotar junto al recorrido de cada plataforma)

- Descargar una orden como Técnico: «Verificando espacio y descargando…», después «Disponible sin conexión…». La región debe existir antes del clic; no mover el foco.
- Ejecutar → guardar borrador: «Borrador guardado en el servidor». Revisar/cerrar/corregir: «Operación registrada. El historial anterior se conserva»; conservar el foco previsto por el flujo en errores.
- Crear ticket o asignar orden con fallo controlado: anunciar el error bloqueante una vez, conservar valores y permitir corregir. No confundir una región vacía con un error.
- Centro de sincronización: anunciar consulta, pérdida de conexión y error de actualización; no afirmar que se sincronizó cuando falla.
- Editor offline: anunciar «Guardando en este dispositivo…» y luego «Guardado en este dispositivo» una vez; si falla almacenamiento, anunciar que no se guardó y mantener la advertencia. El chip visual no debe repetir la confirmación.
- Carga de fotos: anunciar preparación/carga y su resultado; cualquier error bloqueante conserva la captura y no anuncia éxito.

La automatización comprueba DOM, cambios de texto, roles y foco; **el anuncio audible exacto, uso físico y aprobaciones de negocio/cierre por mensaje siguen pendientes**. Los contrastes inicialmente indeterminados tienen [medición y corrección técnica](rendered-contrast.md), sin acreditar lector.
