# Rediseño de pantallas del perfil Dueño (UXD) — plan y prompts para Codex

Estado: **borrador para aprobación** · 20/11/2026 · fuente: llamada con Dirección (19/11) + revisión UI/UX con el
lente de Apple HIG sobre las capturas de `tests/visual/__screenshots__/*--escritorio-amplio.png` (1440 px).

> Los identificadores `UXD-xx` evitan chocar con `TASK-F8-xx` de `context/TASKS.md` (F8-02 ya es el KPI sanitario).

## 1. Perfil demo base

| Perfil demo                           | Menú visible (de 12)                                         | Lo que **no** ve o no puede hacer                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dueño (OW)**                        | 10: todo menos _Centro de trabajos_ y _Administración ICE24_ | Pantallas internas de ICE24 (trabajos, administración global, bitácora de integraciones)                                                                                     |
| Administrador ICE24 (IA)              | 12                                                           | No puede crear tickets, asignar, ejecutar ni revisar órdenes, ni gestionar catálogo, componentes ni frecuencias → la mitad de Mantenimiento y Máquinas queda en solo lectura |
| Administrador de sucursal (OP)        | 7                                                            | Configuración de cuenta, suscripción y auditoría; solo ve su sucursal                                                                                                        |
| Técnico, Solo lectura, Operador ICE24 | menos                                                        | —                                                                                                                                                                            |

**Ningún perfil ve todo sin restricciones.** El Dueño es el más completo en pantallas _del cliente_: tiene todas
las acciones de mantenimiento, catálogo, usuarios, suscripción y auditoría. Este plan se trabaja con el Dueño. Las dos
pantallas internas (Centro de trabajos, Administración ICE24) se revisan al final con el perfil IA.

## 2. Calificación por pantalla (Dueño, escritorio 1440)

Escala 1–10. Las citas son de `.claude/skills/apple-design/references/hig/`. Aplican los principios y fundamentos
(es una app web), no las convenciones propias de iOS o macOS.

| #   | Pantalla                   | Nota    | Problemas principales                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Lo que conviene conservar                                                                   |
| --- | -------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Resumen                    | **6.5** | Los 5 enlaces de tareas dicen igual «Revisar filtro de agua» y ocupan media pantalla. No hay estado de tickets del día ni gráficas. «Alertas críticas 0» mientras Avisos tiene 1 alerta _Alta_ sin enterado y la campana marca 1, así que el dato se contradice. Solo el KPI «8» es enlace.                                                                                                                                                                                                                                                                                                                                               | Fila de 3 KPI, tabla rápida con chips de estado, «Sin datos» en vez de 0 cuando falla       |
| 2   | Sucursales                 | **4**   | Solo nombre + «Activo». Sin dirección, conteo de máquinas ni responsable. «Nueva sucursal» es un desplegable al pie. La sobrecabecera «ICE24 OS» no aporta. Dos tercios de la pantalla vacíos                                                                                                                                                                                                                                                                                                                                                                                                                                             | Filtro y botón «Actualizar datos» con hora                                                  |
| 3   | Máquinas (lista)           | **4.5** | Estado en texto gris sin color (las chips de Resumen sí lo tienen). Sin folio, sucursal ni última atención. «Ver / editar» se repite 8 veces                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Filtro por código, serie o nombre; pestaña Solicitudes                                      |
| 4   | Expediente de máquina      | **3.5** | Se abre **al pie de la misma lista**. Las filas Operación / Condición técnica / sanitaria / Publicación salen **sin valor**. Las 5 acciones son desplegables que ocultan el dato actual. Componentes, frecuencias y calendario están en pestañas con poco contenido                                                                                                                                                                                                                                                                                                                                                                       | Pestañas temáticas, «Reportar una falla» y «Ver tickets» como accesos directos              |
| 5   | Avisos                     | **6**   | Columna central de ~800 px en un lienzo de 1184 px, con aire de diseño solo para celular. «Ver detalle» como texto y «Ver máquina» como enlace en la misma fila de botones                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Tarjetas con severidad y estado, filtros por estado, explicación de «Enterado» y «Resuelta» |
| 6   | Mantenimiento · Calendario | **7**   | La mejor pantalla. Pendientes: «Octubre De 2026» y «Martes, 20 De Octubre» con mayúsculas incorrectas. Celdas truncadas («Limpiar condensa…»). La lista del día repite tarjetas de alto fijo                                                                                                                                                                                                                                                                                                                                                                                                                                              | Leyenda de colores con texto, vista Mes/Semana/Día, «Hoy»                                   |
| 7   | Órdenes de trabajo         | **5**   | 20 tarjetas idénticas sin agrupar por urgencia. «Vista: Pendientes de inic» truncado. Todas con la misma fecha. No hay vista de tablero (Kanban)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Chips Programado/Próximo/Vencido, filtros, «Cargar más»                                     |
| 8   | Tickets (lista)            | **4**   | Cada ticket ocupa ~230 px con un título-enlace de 24 px. Sin filtros, antigüedad, asignado ni prioridad visual. 8 tarjetas = 2 pantallas de scroll                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Breadcrumb, botón «Reportar una falla» arriba                                               |
| 9   | Reportar una falla         | **6**   | Campos deshabilitados sin explicar que primero se elige la máquina. El área de fotos solo tiene texto. «Crear ticket» deshabilitado en gris, sin decir qué falta                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Dos bloques claros, ayuda de longitud, prioridad con significado                            |
| 10  | Configuración de cuenta    | **3**   | «ACTIVE» en inglés. Mi cuenta / Usuarios / Transferencias usan el **mismo ícono**. Mi cuenta: datos dentro de un desplegable, campos vacíos y módulos (Mantenimiento, Sanidad, Inventario, Comercial) como casillas sin marcar con la etiqueta lejos de la casilla. Usuarios: lista solo con nombre y «Activo», sin correo, rol ni alcance; «Ver / editar» abre al pie 3 formularios con 3 botones «Guardar» y el texto «undefined»; «Invitar usuario» escondido al final; aparecen «Operaciones ICE24» y «Administración ICE24» como usuarios de la cuenta del cliente. Transferencias vacía y Componentes y frecuencias «No disponible» | Pestañas como estructura                                                                    |
| 11  | Suscripción                | **6.5** | Tarjeta centrada de 540 px: el mismo problema de ancho que Avisos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Precio claro, estado con chip, aviso de Stripe                                              |
| 12  | Auditoría                  | **6**   | El filtro «Tipo de evento» muestra `JobRetryRequested` (nombre técnico) y «Acción registrada.» como texto suelto. El detalle aparece al pie. «Ver todos los eventos de esta correlación» abre un solo evento. Las fechas se parten en 2 líneas                                                                                                                                                                                                                                                                                                                                                                                            | Tabla real, estados Denegado/Fallido en color + texto, paginación                           |
| 13  | Perfil y seguridad         | **4**   | Solo lectura, sin editar. La tarjeta de sesiones queda medio vacía. Sin rol, permisos ni actividad propia                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | «Cerrar todas las sesiones» visible                                                         |
| 14  | Archivos privados          | **5**   | `select` y selector de archivo nativos sin estilo («Choose File / No file chosen» en inglés). Lista solo de la sesión                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Explicación de privacidad y cuarentena                                                      |

### Fallas del demo confirmadas (20/11, capturas del usuario + código)

`apps/private-web/src/server/demo/api.ts` no tiene rutas de lectura (`GET_ROUTES`) para lo que piden estas pantallas,
así que responde 404 y la pantalla muestra «No disponible · Recurso no disponible en este contexto»:

| Lo que se ve (Dueño)                                                                                                      | Ruta que pide la pantalla                                                                                | En el demo                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Expediente › Componentes: «No disponible»                                                                                 | `machines/<id>/components`                                                                               | sin ruta → 404                                                                                                                      |
| Expediente › Frecuencias y alertas: «No disponible»                                                                       | `machines/<id>/frequencies` (los ajustes vienen dentro; `frequency-overrides` solo se usa para escribir) | sin ruta → 404                                                                                                                      |
| Expediente › Calendario: «No fue posible cargar el calendario» **y** «Sin registros…» a la vez                            | calendario por máquina                                                                                   | sin datos; además la pantalla muestra dos mensajes que se contradicen                                                               |
| Expediente: Operación, Condición técnica, sanitaria y Publicación sin valor                                               | `machines/<id>`                                                                                          | sin ruta                                                                                                                            |
| Configuración › Componentes y frecuencias sin contenido                                                                   | `account-catalog-entries`, `account-frequency-overrides`                                                 | sin ruta → 404                                                                                                                      |
| Configuración › Transferencias vacía                                                                                      | `machine-transfers`                                                                                      | siempre `[]`                                                                                                                        |
| Usuarios › «Usuario: undefined · Estado: active · Roles: undefined»; Rol y sucursal sin precargar                         | `account-users`                                                                                          | manda `data.email` y `data.roles`; la pantalla lee `email` y `roles` en la raíz de la fila (`features/equipment/workspace.tsx:696`) |
| Mi cuenta › razón social, correo, teléfono, RFC y domicilio vacíos; módulos sin marcar (aunque Mantenimiento está activo) | `accounts/<id>`                                                                                          | manda `data.contactEmail`; la pantalla y la API real usan `details.contact`, `details.taxProfile`, `details.moduleConfiguration`    |

Las dos últimas filas no son rutas faltantes: el demo responde con otra forma de datos que la que lee la pantalla.

No es un problema de permisos: el Dueño tiene `equipment.machine-components-manage`,
`equipment.machine-frequencies-manage`, `equipment.catalog-manage` y `equipment.account-frequencies-manage`. Se corrige en
**UXD-00B** antes de rediseñar esas pantallas. Perfil también se ve centrado y estrecho a 1920 px (lo corrige UXD-00).

### Hallazgos transversales (se atienden en UXD-00)

- **Ancho inconsistente** (High): Avisos, Auditoría, Archivos y Suscripción usan anchos y márgenes distintos.
  `layout.md › Adaptability`: «Design a layout that adapts gracefully and consistently.» Una sola regla de ancho
  para listas y tablas a todo lo ancho, y para formularios de lectura un máximo legible con columna lateral.
- **Información esencial dentro de desplegables** (High): Expediente, Mi cuenta y Nueva sucursal.
  `disclosure-controls.md › Best practices`: «Use a disclosure control to hide details until they're relevant»; el dato
  actual siempre es relevante. Se muestra el valor y un botón «Editar» abre el formulario.
- **Detalles al pie de la página en vez de su propia ruta** (High): Expediente, detalle de auditoría y usuarios.
  `layout.md › Visual hierarchy`: «place the most important items near the top». Cada detalle tiene ruta propia,
  breadcrumb y «Volver» que conserva filtros y foco (ya lo validamos en SR-05 con Alt+←).
- **Listas de texto donde hace falta tabla** (Medium): Máquinas, Tickets y Usuarios. `lists-and-tables.md`: «use a
  table to represent various characteristics or attributes of the data in separate, sortable columns.»
- **Sobrecabecera «ICE24 OS»** (Low): no dice nada; se reemplaza por el módulo («Operación», «Administración») o se quita.
- **Textos en inglés o técnicos** (Medium): `ACTIVE`, `JobRetryRequested`, `Choose File`. `writing.md`: los nombres
  salen de lo que la persona reconoce, no de cómo está construido el sistema.

## 3. Orden de trabajo

Cada paso es un PR independiente que deja la demo funcionando. Del 00 al 04 hay dependencias; del 05 en adelante el
orden es libre.

| Paso    | Alcance                                                                                                    | Depende de  | Tamaño |
| ------- | ---------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| UXD-00  | Base común: ancho de página, patrón de detalle con ruta, alternador lista/bloques, tabla con fila clicable | —           | M      |
| UXD-00B | Datos faltantes del demo (componentes, frecuencias, calendario, condición, catálogo, transferencias)       | —           | S      |
| UXD-01  | Resumen con tablero operativo                                                                              | 00          | M      |
| UXD-02  | Sucursales: lista/bloques, nueva sucursal y detalle editable                                               | 00          | M      |
| UXD-03  | Máquinas: lista/bloques con datos útiles                                                                   | 00          | S      |
| UXD-04  | Ficha de máquina en su propia ruta                                                                         | 00, 00B, 03 | L      |
| UXD-05  | Avisos a todo el ancho + detalle                                                                           | 00          | S      |
| UXD-06  | Órdenes de trabajo: lista y tablero Kanban                                                                 | 00          | M      |
| UXD-07  | Tickets: tabla, filtros y detalle                                                                          | 00          | M      |
| UXD-08  | Configuración de cuenta: íconos, Mi cuenta editable, Transferencias, Componentes y frecuencias             | 00, 00B     | M      |
| UXD-09  | Usuarios: tabla, ficha con actividad, invitación en pantalla propia                                        | 00, 08      | L      |
| UXD-10  | Auditoría: filtro, detalle en ruta, correlación real                                                       | 00          | M      |
| UXD-11  | Perfil editable                                                                                            | 00          | S      |
| UXD-12  | Pulido: Calendario, Reportar falla, Archivos, Suscripción (hallazgos propios, no de Dirección)             | 00          | S      |
| UXD-13  | Revisión con perfil IA: Centro de trabajos y Administración ICE24                                          | 00          | S      |

## 4. Reglas que todo prompt incluye

Pega este bloque al inicio de cada prompt:

```text
Contexto fijo (no negociable):
- Repo ICE24OS, app apps/private-web (Next 16). Reutiliza el shell privado y los componentes de @ice24/ui
  aprobados en Fase 6 (layouts lista/detalle/dashboard/flujo por pasos, StatusTag, Table, Tabs, Card,
  StatusPanel, banners). No inventes estilos fuera de los tokens existentes.
- Trabaja primero con el perfil demo Dueño (OW); verifica después que Técnico, Solo lectura y Administrador
  de sucursal no ven acciones que no les corresponden (ROLE_PERMISSIONS en src/server/demo/personas.ts).
- Actualiza el modo demo (ICE24_DEMO_MODE=1, src/server/demo) con fixtures realistas y variados (no 8
  registros idénticos) para cada estado: normal, carga, vacío, error con folio, sin conexión, modo lectura.
- Agrega o actualiza las rutas en tests/visual/ux-review.routes.ts y regenera solo las capturas afectadas
  con `node scripts/ui-quality/run.mjs -u --update-snapshots=all --project=visual --grep "<título>"`.
- Accesibilidad: título de página «<Pantalla> · ICE24 OS», un h1, regiones con nombre, foco visible, nada
  comunicado solo por color, objetivos táctiles ≥ 44 px en móvil, sin desplazamiento lateral a 200 % de
  zoom ni en 375 px. Los cambios de vista (lista/bloques, Kanban) se anuncian una sola vez en una región viva.
- Textos en español de México, sin términos internos ni en inglés. Mayúscula solo inicial en títulos.
- Toda acción de escritura pasa por la API existente con permiso, If-Match y auditoría; si el endpoint
  no existe, créalo en apps/api siguiendo el módulo vecino, con pruebas.
- Pruebas: unitarias del componente nuevo, e2e de accesibilidad de la ruta, y `pnpm lint && pnpm typecheck`.
- No toques pantallas fuera del alcance. Un PR por paso, rama codex/uxd-<nn>-<tema>.
```

## 5. Prompts por paso

### UXD-00 · Base común

```text
Objetivo: dejar los patrones que usarán los pasos UXD-01..13.
1. Ancho de página: una regla única en el layout de (account) para que listas, tablas y tableros ocupen
   todo el ancho disponible (mismo margen que Resumen) y que formularios y lecturas usen un máximo legible
   (~960 px) alineado a la izquierda, nunca centrado en una columna estrecha. Aplícalo a Avisos,
   Auditoría, Archivos y Suscripción sin cambiar su contenido.
2. Patrón de detalle con ruta propia: componente/plantilla para páginas `/<modulo>/[id]` con breadcrumb,
   botón «Volver a <lista>» que regresa conservando filtros (query string) y devuelve el foco a la fila de
   origen. Documenta su uso en la plantilla Detalle de /plantillas.
3. Alternador de vista «Lista | Bloques»: control segmentado reutilizable (radiogroup accesible) que
   guarda la preferencia por pantalla en la URL (?vista=bloques) y en localStorage con try/catch.
4. Tabla con fila clicable: extiende la Table de @ice24/ui para que toda la fila lleve al detalle (enlace
   real en la primera celda, el resto de la fila amplía el área de clic), con columnas ordenables.
5. Sobrecabecera: reemplaza «ICE24 OS» por el grupo del menú («Operación», «Administración», «Mi cuenta»).
Aceptación: los 4 patrones tienen historia en Storybook y prueba unitaria; las pantallas tocadas en (1)
cambian solo de ancho; capturas regeneradas de esas rutas.
```

### UXD-00B · Datos faltantes del demo

```text
Objetivo: que el Dueño vea datos en el expediente y en Configuración sin cambiar el diseño todavía.
Causa confirmada: src/server/demo/api.ts no tiene rutas GET para estas lecturas y responde 404
(«Recurso no disponible en este contexto»). Lee la sección «Fallas del demo confirmadas» del plan.
1. Agrega a GET_ROUTES, con el mismo permiso y alcance por sucursal que usa la API real
   (apps/api/src/modules/equipment), lecturas para: machines/<id>, machines/<id>/components,
   machines/<id>/frequencies, machines/<id>/schedules (calendario), technical-models/<id>/frequencies,
   account-catalog-entries y account-frequency-overrides. No hay GET machines/<id>/frequency-overrides:
   la pantalla solo escribe ahí. No amplíes la API en este paso. Respeta el contrato de @ice24/contracts.
2. Fixtures variados: componentes con modelo, instalación y garantía distintos; frecuencias de fábrica
   y ajustadas; condición técnica/sanitaria y publicación con valores y fechas; 2 transferencias
   enviadas en machine-transfers (una pending y otra approved; la API solo lista las enviadas).
3. Calendario del expediente: no debe mostrar «No fue posible cargar el calendario» y «Sin registros…»
   al mismo tiempo; error y vacío son estados excluyentes.
4. Forma de datos: alinea con la API real (apps/api/src/modules/equipment) las respuestas que hoy no
   coinciden con lo que lee la pantalla:
   - account-users: la pantalla muestra «Usuario: undefined · Roles: undefined» porque el demo manda
     data.email/data.roles. Revisa qué devuelve la API real y corrige el lado equivocado (demo o
     features/equipment/workspace.tsx), sin dejar los dos formatos.
   - accounts/<id>: el demo manda data.contactEmail; la pantalla y la API usan details.contact,
     details.taxProfile y details.moduleConfiguration. Llena razón social, correo, teléfono, RFC,
     domicilio fiscal y los módulos activos de cada cuenta demo.
   - Confirma si los usuarios internos «Operaciones ICE24» y «Administración ICE24» deben listarse como
     usuarios de la cuenta del cliente; si la API real no los incluye, quítalos de account-users.
5. Pruebas en src/server/demo/api.test.ts: el Dueño obtiene 200 con datos en cada ruta y con la misma
   forma que la API real; Técnico y Solo lectura reciben lo que la API real les daría (403 o solo lectura).
Aceptación: con el demo como Dueño, Componentes, Frecuencias y alertas, Calendario y las 4 filas de
condición muestran datos; Configuración muestra datos de la cuenta llenos, usuarios sin «undefined»,
catálogo, frecuencias y transferencias.
```

### UXD-01 · Resumen con tablero operativo

```text
Objetivo: que el Dueño entienda en 5 segundos el estado de máquinas, tickets del día y mantenimientos.
Diseño (de arriba a abajo):
1. Fila de KPI (4): Máquinas disponibles (x de y), Alertas sin enterado (incluye Alta y Crítica; corrige
   la contradicción actual «Alertas críticas 0» con una alerta Alta abierta), Tickets abiertos hoy,
   Mantenimientos vencidos/próximos 7 días. Cada KPI es un enlace a su lista ya filtrada.
2. Tablero de gráficas (2 columnas en ≥1280, 1 en móvil):
   - Estado operativo de máquinas: barra apilada horizontal Disponible/En mantenimiento/Fuera de servicio
     con números visibles y leyenda en texto.
   - Tickets de hoy por estado (Pendiente de asignación, En atención, Resuelto) y por prioridad.
   - Mantenimientos de los próximos 7 días por día (columnas) con vencidos destacados.
   - Órdenes por responsable (top 5).
   Cada gráfica lleva título, frase de resumen («3 de 8 máquinas necesitan atención») y una tabla
   equivalente oculta visualmente para lector de pantalla. Usa SVG simple o la librería de gráficas ya
   instalada; no añadas dependencias sin justificarlo en el PR.
3. «Tareas por atender»: tabla compacta (actividad, máquina, sucursal, prioridad, fecha), máximo 5, en
   lugar de los 5 enlaces repetidos.
4. «Vista rápida de máquinas»: se queda igual (ya funciona).
Respeta los estados ya auditados en SR-05 (vacío, módulo deshabilitado, error con «Sin datos», nunca 0).
Agrega endpoints de agregados solo si los existentes no bastan; en demo, fixtures con datos variados.
Aceptación: SR-05 sigue pasando (encabezados, regiones, mensajes); capturas resumen--* regeneradas.
```

### UXD-02 · Sucursales

```text
Objetivo: lista útil, alta de sucursal en pantalla propia y detalle editable.
1. /branches con alternador Lista | Bloques (UXD-00).
   - Lista: tabla Nombre, Código, Dirección/ciudad, Máquinas (total y fuera de servicio), Responsable,
     Estado (StatusTag). Fila → detalle.
   - Bloques: tarjeta por sucursal con nombre, dirección, mini resumen de estados de sus máquinas y
     responsable.
2. Botón primario «Nueva sucursal» arriba a la derecha (junto a «Actualizar datos»), solo con
   equipment.manage; elimina el desplegable del pie.
3. /branches/new: formulario completo (nombre, código, dirección, ciudad, estado, zona horaria,
   responsable, teléfono, notas) con layout Flujo por pasos o formulario de una página; «Cancelar» y
   breadcrumb regresan a /branches; protección de cambios sin guardar ya existente.
4. /branches/[id]: datos de la sucursal visibles (no en desplegable) con «Editar»; tabla de sus máquinas;
   próximos mantenimientos de la sucursal.
Aceptación: alta y edición auditadas; Administrador de sucursal solo ve la suya y no ve «Nueva sucursal».
```

### UXD-03 · Máquinas (lista)

```text
Objetivo: que la lista de máquinas informe sin abrir cada una.
1. Alternador Lista | Bloques.
   - Lista: tabla Folio, Nombre, Sucursal, Estado operativo (StatusTag con color + ícono + texto),
     Último mantenimiento, Próximo mantenimiento, Tickets abiertos. Columnas ordenables. Fila → /machines/[id].
   - Bloques: tarjeta con nombre, folio, sucursal, estado, próximo mantenimiento y tickets abiertos.
2. Filtros: texto existente + Sucursal + Estado.
3. Quita el «Ver / editar» repetido (la fila entera es el enlace) y el expediente incrustado al pie.
Aceptación: la pestaña Solicitudes sigue igual; capturas maquinas--* regeneradas.
```

### UXD-04 · Ficha de máquina

```text
Objetivo: /machines/[id] como pantalla propia que muestre de un vistazo la condición de la máquina.
1. Encabezado: nombre, folio, sucursal, StatusTag de estado operativo, acciones «Reportar una falla» y
   «Ver tickets».
2. Bloque «Condición» (MachineTriad existente): Operación, Condición técnica, Condición sanitaria y
   Publicación **con su valor y fecha**. Corrige que hoy salgan vacías; si no hay dato, «Sin registro».
3. Pestañas: Resumen | Componentes | Frecuencias y alertas | Calendario | Historial.
   - Resumen: datos generales y una sección «Administración» con 5 filas que muestran el valor actual y
     un botón «Editar» cada una: Nombre y marca (valor actual), Estado operativo (estado actual y motivo),
     Sucursal (actual), Retiro definitivo (estado), Transferencia a otra cuenta (solicitudes en curso).
     Al pulsar «Editar» se abre el formulario en línea con el valor precargado, Guardar/Cancelar y
     confirmación para acciones destructivas (retiro, transferencia).
   - Componentes: tabla de componentes instalados (nombre, modelo, fecha de instalación, garantía) con
     alta/edición si hay equipment.machine-components-manage.
   - Frecuencias y alertas: tabla actividad, frecuencia de fábrica, frecuencia ajustada, próxima fecha,
     alertas configuradas; edición con equipment.machine-frequencies-manage.
   - Calendario: componente de calendario de Mantenimiento filtrado a esta máquina.
   - Historial: mantenimientos, tickets y eventos de auditoría de la máquina.
4. Breadcrumb Máquinas › <nombre> y «Volver» (UXD-00).
Aceptación: todos los formularios de edición existentes siguen funcionando con If-Match; las acciones
se ocultan según permisos; SR-07 (navegación por rol) sigue pasando.
```

### UXD-05 · Avisos

```text
Objetivo: aprovechar el escritorio.
1. Ancho completo (UXD-00). En ≥1280: lista de avisos a la izquierda (~40 %) y panel de detalle a la
   derecha (~60 %) con el aviso seleccionado; en <1024 el detalle es la ruta /notifications/[id].
2. Resumen superior como 3 KPI (críticas sin enterado, en atención, resueltas) que filtran la lista.
3. En cada tarjeta, acciones con jerarquía consistente: primaria «Marcar enterado», secundaria
   «Atender», enlaces «Ver detalle» y «Ver máquina» del mismo estilo.
Aceptación: el anuncio de «Marcar enterado» (SR-05 C6) se lee una vez y el foco no se pierde.
```

### UXD-06 · Órdenes de trabajo: lista y Kanban

```text
Objetivo: el usuario elige entre Lista y Tablero.
1. Alternador Lista | Tablero en /maintenance/work-orders (preferencia en URL).
2. Tablero Kanban con columnas en orden de atención: Críticas → Vencidas → Próximas → Programadas →
   En revisión/Cerradas (plegada por defecto). Cada tarjeta: folio, máquina, actividad, fecha límite,
   responsable y prioridad. Contador por columna. Sin arrastrar y soltar en esta entrega (el cambio de
   estado sigue en el detalle); accesible como lista de listas con encabezado por columna.
3. Lista: tabla ordenable (folio, máquina, actividad, estado, fecha límite, responsable) agrupada por
   las mismas categorías y en el mismo orden.
4. Corrige el campo «Vista» truncado («Pendientes de inic»); fixtures con fechas y responsables variados.
Aceptación: filtros actuales se aplican a ambas vistas; capturas ui-wo-01--* regeneradas.
```

### UXD-07 · Tickets

```text
Objetivo: lista escaneable y detalle claro.
1. /maintenance/tickets como tabla: Folio, Máquina, Sucursal, Sistema, Prioridad (chip), Estado (chip),
   Reportado por, Antigüedad, Asignado a. Fila → /maintenance/tickets/[id].
2. Filtros: Estado, Prioridad, Sucursal, Máquina, Rango de fechas; KPI arriba (abiertos, sin asignar,
   alta prioridad, resueltos hoy).
3. Detalle: encabezado con estado y prioridad, descripción, fotos, línea de tiempo de diagnóstico y
   seguimiento, orden de trabajo vinculada, acciones según permiso.
4. Fixtures con descripciones, sistemas y prioridades distintas.
Aceptación: capturas tickets-list--* y ui-tkt-02--* regeneradas.
```

### UXD-08 · Configuración de cuenta

```text
Objetivo: cada pestaña con contenido útil y editable.
1. Íconos distintos por pestaña: Mi cuenta (building/edificio), Usuarios (users), Transferencias
   (flechas de intercambio), Componentes y frecuencias (sliders). Agrega íconos a @ice24/ui si faltan.
2. Mi cuenta: datos visibles sin desplegable (razón social, nombre comercial, RFC, contacto, teléfono,
   dirección fiscal, zona horaria, estado «Activa» en español, fecha de alta, plan) con «Editar» y
   guardado auditado (identity o equipment según dónde viva el dato; crea endpoint si no existe).
   Los módulos (Mantenimiento, Sanidad, Inventario, Comercial) van en su propio bloque «Módulos
   contratados» como interruptores con la etiqueta a la izquierda y una línea de qué habilita cada uno.
3. Transferencias: investiga por qué no muestra nada para el Dueño (permiso, fixture o ruta) y muéstrala:
   tabla de transferencias enviadas con estado y acciones. Ver las recibidas requiere ampliar la API
   (la cuenta destino vería transferencias ajenas): decisión de producto y seguridad; pide aprobación antes.
4. Componentes y frecuencias: mismo diagnóstico (el Dueño tiene equipment.catalog-manage y
   equipment.account-frequencies-manage); muestra catálogo de componentes y frecuencias de la cuenta.
Aceptación: prueba que confirme que el Dueño ve las 4 pestañas con datos; capturas configuracion-cuenta--*.
```

### UXD-09 · Usuarios e invitación

```text
Objetivo: administrar personas desde una tabla y una ficha.
1. Pestaña Usuarios: botón «Invitar usuario» arriba a la derecha (no al pie). Tabla: Nombre, Correo,
   Rol, Alcance (cuenta/sucursal/máquinas), Estado (activo, invitado, suspendido), Último acceso.
2. /account/users/invite: pantalla propia con datos (nombre, correo, teléfono, puesto), rol con
   descripción de lo que puede hacer, alcance y sucursales/máquinas, mensaje opcional; «Cancelar» vuelve.
3. /account/users/[id]: datos y rol editables; actividad con selector Día | Semana | Mes: mantenimientos
   completados, tickets creados y atendidos, órdenes asignadas, último acceso; tabla de sus últimos
   mantenimientos y tickets con enlace; acciones suspender/reactivar/revocar sesiones con confirmación.
   Sustituye los 3 formularios actuales al pie de la lista (permisos delegados, estado de asociación)
   por secciones de esta ficha con el valor actual precargado, «Editar» y un solo «Guardar» por sección.
4. Endpoints de agregados de actividad por usuario si no existen (lectura, con permiso
   identity.membership-manage).
Aceptación: un usuario no puede degradar ni suspender al último Dueño; acciones auditadas.
```

### UXD-10 · Auditoría

```text
Objetivo: filtros comprensibles y detalle en su propia ruta.
1. «Tipo de evento» como lista desplegable con nombres en español agrupados (Máquinas, Mantenimiento,
   Archivos, Usuarios, Suscripción); quita el placeholder técnico «JobRetryRequested» y el texto suelto
   «Acción registrada.». Igual para «Tipo de entidad».
2. «Ver detalle» → /audit/[id] (UXD-00) con todos los campos: fecha local y UTC, actor, entidad con
   enlace, antes/después, IP/origen, correlación. Volver conserva filtros y página.
3. «Ver todos los eventos de esta correlación» → /audit?correlation=<id> mostrando la lista filtrada de
   todos los eventos de esa correlación (hoy abre uno solo: corrige la consulta).
4. Fecha en una línea (formato corto) y la fila entera como enlace en lugar del botón repetido.
Aceptación: prueba e2e del flujo lista → detalle → correlación → volver.
```

### UXD-11 · Perfil

```text
Objetivo: que la persona vea y edite su información.
1. Datos de perfil visibles con «Editar»: nombre, teléfono, puesto, zona horaria, idioma, foto/iniciales
   (correo y usuario de solo lectura con explicación de cómo cambiarlos).
2. Rol y alcance actuales en la cuenta activa, con lista legible de lo que puede hacer.
3. Seguridad: MFA (estado y acción), sesiones con dispositivo, lugar y último uso; cerrar una o todas.
4. Mi actividad reciente (últimos 10 eventos propios).
Aceptación: guardado auditado con identity.profile-update; capturas perfil--*.
```

### UXD-12 · Pulido (hallazgos propios)

```text
1. Calendario: mayúsculas «Octubre de 2026», «Martes, 20 de octubre»; tooltip o texto completo en
   celdas truncadas; lista del día en tabla compacta.
2. Reportar una falla: texto «Elige primero la máquina» junto a los campos deshabilitados; el botón dice
   qué falta; zona de fotos con botón estilizado.
3. Archivos: select y selector de archivo con componentes de @ice24/ui (sin «Choose File»); lista de
   archivos de la cuenta, no solo de la sesión.
4. Suscripción: ancho estándar de UXD-00 con historial de pagos a la derecha.
```

### UXD-13 · Revisión con Administrador ICE24

```text
Con el perfil IA, revisa Centro de trabajos y Administración ICE24 con las reglas de UXD-00 (ancho,
detalle en ruta, tabla con fila clicable) y corrige solo lo necesario para que sigan la misma vista.
```

## 6. Cómo aprobar

Marca por paso: ✅ aprobado · ✏️ cambiar (anota qué) · ⏸ después. Al aprobar un paso, copia el bloque de la
sección 4 + el prompt del paso a Codex.
