# ICE24 OS — Technical Requirements Document (TRD)

> **Confidencial.** Información propiedad intelectual de ICE24 MX. Su reproducción total o parcial requiere autorización escrita.

## Control del documento

| Campo | Valor |
|---|---|
| Proyecto | ICE24 OS |
| Documento | Technical Requirements Document (TRD) |
| Versión | 1.0 |
| Fecha | Agosto de 2026 |
| Propietario | ICE24 MX |
| Estado | Arquitectura propuesta para validación técnica y planeación |
| Documento base | ICE24 OS — Product Requirements Document, versión 1.0 |
| Mercado inicial | México |
| Idioma inicial | Español |
| Moneda | Pesos mexicanos (MXN) |
| Formato de fecha visible | DD/MM/AAAA |

## 1. Propósito

Este TRD transforma los requisitos funcionales, no funcionales, restricciones, riesgos y preguntas abiertas del PRD de ICE24 OS en una propuesta técnica ejecutable.

El documento define:

- la arquitectura lógica y de despliegue recomendada;
- los límites entre aplicaciones, módulos y servicios;
- las tecnologías sugeridas y su justificación;
- la estrategia de datos, multiempresa, autenticación, autorización y auditoría;
- el diseño de PWA, operación offline y sincronización;
- el manejo de archivos, reportes, colas, integraciones y observabilidad;
- las convenciones que deberá seguir el equipo de ingeniería;
- los riesgos técnicos y las decisiones que permanecen abiertas.

Este TRD **no sustituye** la validación sanitaria, jurídica, financiera ni operativa requerida por el PRD. Tampoco agrega funcionalidades de negocio que no estén justificadas por dicho documento. Cuando se proponen objetivos técnicos cuantitativos o herramientas específicas, se identifican como recomendaciones de arquitectura sujetas a validación durante la Etapa 0.

## 2. Alcance técnico

### 2.1 Incluido

La arquitectura debe soportar progresivamente todos los dominios contemplados en el PRD:

1. Gobierno y administración central de ICE24.
2. Identidad, autenticación, sesiones, roles, permisos y asociaciones.
3. Cuentas titulares, sucursales y contextos multiempresa.
4. Equipos, identidad permanente, ubicaciones y transferencias.
5. Modelos, sistemas, componentes y plantillas versionadas.
6. Mantenimiento, tickets y órdenes de trabajo.
7. Control sanitario, bitácoras, laboratorio, restricciones y acciones correctivas.
8. Inventario, refacciones y consumibles.
9. Documentos, evidencias, versiones, publicaciones y descargas.
10. Reportes, PDF, exportaciones y programación.
11. Portal público, etiquetas y códigos QR.
12. Ventas importadas desde Excel.
13. Tarjetas, recargas y control administrativo.
14. Negocios, restaurantes, productos, precios, pedidos y reparto.
15. Analítica, indicadores, alertas y escalamiento.
16. Suscripción mediante Stripe y cuentas demo.
17. Auditoría de negocio, logs técnicos, PWA y operación offline.

### 2.2 No incluido como integración inicial

La propuesta respeta los límites confirmados en el PRD:

- no controla físicamente las máquinas;
- no integra inicialmente una API de la aplicación de la máquina;
- no conoce el saldo físico real de las tarjetas;
- no procesa pagos de pedidos de hielo;
- no timbra facturas fiscales;
- no reemplaza la plataforma externa de capacitación;
- no integra el accesorio Brain ni su plataforma;
- no soporta carga de video en la primera versión;
- no presenta resultados como certificación sanitaria.

## 3. Impulsores de arquitectura

| Impulsor | Consecuencia técnica |
|---|---|
| Identidad única con acceso a varias cuentas | La identidad no puede pertenecer físicamente a un solo tenant. Se requieren asociaciones y contextos independientes. |
| Permisos por cuenta, sucursal, máquina, módulo, acción y sensibilidad | Se requiere autorización centralizada, evaluada en servidor y con política de denegación por defecto. |
| Expediente permanente por máquina | La máquina debe modelarse como activo global con periodos de propiedad y ubicación, no como registro dependiente del propietario actual. |
| Historial técnico y sanitario transferible | Los datos técnicos y sanitarios deben vincularse al activo permanente. Los datos comerciales deben separarse por cuenta o periodo de propiedad. |
| Plantillas y bitácoras dinámicas versionadas | Se requiere un motor de definición y ejecución de formularios, checklists, reglas, frecuencias y límites. |
| Correcciones sin destrucción del historial | Las entidades sensibles requieren versionado, estados de anulación/corrección y auditoría atómica. |
| PWA con trabajo offline controlado | Se requiere almacenamiento local estructurado, cola de operaciones, sincronización idempotente y resolución explícita de conflictos. |
| Archivos, fotos, PDF y Excel | Los binarios deben almacenarse fuera de la base relacional y cargarse mediante accesos temporales. |
| Reportes y tareas programadas | La generación pesada debe ejecutarse en procesos asíncronos desacoplados. |
| Portal público y QR | Debe existir una superficie pública aislada de la aplicación privada, con proyecciones protegidas y caché. |
| Auditoría y logs diferenciados | Se requieren dos mecanismos: auditoría inmutable de negocio y telemetría técnica operativa. |
| Alcance amplio con construcción por etapas | La solución debe permitir entrega incremental sin diseñar microservicios prematuramente ni acoplar todos los módulos. |

## 4. Decisiones de arquitectura propuestas

Las siguientes decisiones son recomendaciones técnicas. Deben formalizarse mediante Architecture Decision Records durante la Etapa 0.

| ID | Decisión propuesta | Estado |
|---|---|---|
| ADR-001 | Utilizar un monolito modular para la API de negocio, acompañado de procesos de trabajadores asíncronos. | Propuesta |
| ADR-002 | Utilizar una arquitectura web separada en aplicación privada y portal público, compartiendo paquetes comunes. | Propuesta |
| ADR-003 | Exponer una API REST versionada y documentada con OpenAPI. | Propuesta |
| ADR-004 | Utilizar PostgreSQL como fuente transaccional principal, con PostGIS para geolocalización. | Propuesta |
| ADR-005 | Implementar multiempresa mediante esquema compartido, identificadores de contexto y políticas de aislamiento. | Propuesta |
| ADR-006 | Utilizar un proveedor de identidad compatible con OpenID Connect; Keycloak es la recomendación inicial. | Propuesta |
| ADR-007 | Mantener la autorización de negocio dentro de ICE24 OS, separada de la autenticación del proveedor de identidad. | Propuesta |
| ADR-008 | Utilizar almacenamiento de objetos privado para fotografías, PDFs, Excel y exportaciones. | Confirmada por PRD; proveedor propuesto |
| ADR-009 | Utilizar una cola administrada y un patrón transactional outbox para efectos asíncronos. | Propuesta |
| ADR-010 | Generar vista previa y PDF desde la misma representación HTML y plantilla. | Confirmada por PRD |
| ADR-011 | Utilizar IndexedDB para datos offline de la PWA, con sincronización explícita y control de versiones. | Propuesta |
| ADR-012 | Instrumentar aplicaciones y trabajadores con OpenTelemetry. | Propuesta |
| ADR-013 | Mantener componentes desplegables en contenedores y describir infraestructura como código. | Propuesta |
| ADR-014 | No iniciar con microservicios; separar servicios únicamente cuando exista una razón operativa o de escala medible. | Propuesta |

# Arquitectura propuesta

## 5. Estilo arquitectónico

### 5.1 Monolito modular con procesamiento asíncrono

La recomendación es construir la lógica principal como un **monolito modular**. Cada dominio mantiene sus propios casos de uso, reglas, entidades, repositorios y contratos, pero se despliega inicialmente dentro de una sola API.

Este enfoque es adecuado porque:

- las operaciones principales cruzan varios dominios y requieren consistencia transaccional;
- el producto todavía no tiene volúmenes, concurrencia ni límites de equipo definidos;
- el alcance se construirá por etapas;
- el equipo de desarrollo debe poder operar y depurar el sistema con una carga DevOps controlada;
- la auditoría debe registrarse junto con el cambio de negocio;
- evita introducir comunicación distribuida, fallos parciales y costos operativos antes de que sean necesarios.

El monolito modular no significa una aplicación sin estructura. Cada módulo debe tener límites explícitos y comunicarse con otros módulos mediante interfaces de aplicación o eventos internos, no mediante acceso directo a sus tablas o lógica privada.

### 5.2 Trabajadores asíncronos

Los procesos pesados o que dependen de terceros se ejecutarán en trabajadores separados:

- generación de PDF;
- importación y validación de Excel;
- envío de correo;
- preparación de exportaciones completas;
- compresión y procesamiento de imágenes;
- análisis de seguridad de archivos;
- envío y repetición de notificaciones;
- escalamientos programados;
- actualización de indicadores y proyecciones;
- procesamiento de webhooks y reconciliaciones;
- limpieza de archivos temporales y exportaciones expiradas.

La API no debe mantener conexiones HTTP abiertas mientras se realizan estas tareas. Debe crear un trabajo, devolver su estado y permitir consultar el progreso.

## 6. Vista de contexto

### 6.1 Actores externos

- Usuarios internos de ICE24.
- Propietarios y administradores de cuentas.
- Encargados, operadores, técnicos y responsables sanitarios.
- Negocios, restaurantes y sus usuarios.
- Repartidores.
- Público que escanea códigos QR.
- Stripe.
- Proveedor de correo transaccional.
- Proveedor de mapas y geocodificación.
- Almacenamiento de objetos.
- Motor o proceso de PDF.
- Plataforma externa de capacitación.
- Aplicación independiente de la máquina, mediante archivos Excel.

### 6.2 Sistemas dentro del límite de ICE24 OS

1. Aplicación privada PWA.
2. Portal público de equipo.
3. API de negocio.
4. Procesadores asíncronos.
5. Servicio de generación de PDF.
6. Proveedor de identidad.
7. Base de datos transaccional.
8. Almacenamiento de objetos.
9. Cola de mensajes y programador de tareas.
10. Plataforma de observabilidad.

## 7. Contenedores lógicos

| Contenedor | Responsabilidad | Acceso |
|---|---|---|
| Aplicación privada PWA | Interfaz autenticada, captura, paneles, administración, trabajo offline y cambio de contexto. | Usuarios autenticados |
| Portal público | Consulta de proyecciones publicadas, documentos públicos y analítica QR. | Público |
| BFF web | Mantener sesión segura del navegador, proteger tokens, aplicar CSRF y agregar llamadas a la API. | Aplicación privada |
| API de negocio | Reglas, permisos, estados, transacciones, auditoría, contratos e integraciones. | BFF, portal público y servicios autorizados |
| Worker general | Correos, importaciones, exportaciones, notificaciones, escalamiento, procesamiento de archivos y proyecciones. | Cola y base de datos |
| Worker PDF | Renderizado HTML/PDF y optimización de recursos con límites de CPU y memoria independientes. | Cola y almacenamiento |
| Proveedor de identidad | Credenciales, inicio de sesión, recuperación, OTP, sesiones e identidad federada futura. | Usuarios, BFF y API |
| PostgreSQL | Datos transaccionales, relaciones, estados, historial, auditoría y outbox. | API y workers |
| Almacenamiento de objetos | Archivos originales, derivados, públicos, exportaciones y temporales. | API, workers y URLs temporales |
| Cola administrada | Desacoplar tareas, reintentos y dead-letter queues. | API y workers |
| Scheduler | Disparar mantenimientos, alertas, reportes programados, expiraciones y reconciliaciones. | Worker |
| Observabilidad | Recibir métricas, trazas y logs técnicos. | Todos los componentes |

## 8. Módulos de la API

Los módulos deben respetar el mapa del PRD y permanecer separados internamente.

| Módulo técnico | Responsabilidades principales |
|---|---|
| Platform Administration | Gobierno ICE24, validaciones, restricciones globales y configuración de módulos. |
| Identity Profile | Perfil local del usuario, asociaciones, contextos y sincronización con el proveedor de identidad. |
| Authorization | Roles base, permisos individuales, ámbitos y evaluación de políticas. |
| Organizations | Cuentas titulares, sucursales, contactos y datos fiscales. |
| Assets | Máquinas, código ICE24 OS, series, modelos asignados, ubicaciones, propiedad y transferencias. |
| Template Engine | Versiones de modelos, sistemas, componentes, actividades, campos, reglas y escalamiento. |
| Maintenance | Calendarios, tickets, órdenes, checklists, diagnósticos y componentes utilizados. |
| Sanitary Control | Bitácoras, controles, lecturas, no conformidades, restricciones y acciones correctivas. |
| Laboratory | Análisis, parámetros, límites, documentos, resultados y vigencias. |
| Inventory | Productos, proveedores, almacenes, lotes, existencias y movimientos. |
| Files | Metadatos, versiones, integridad, cargas, derivados, visibilidad y acceso temporal. |
| Reporting | Configuración, generación, programación, permisos, PDF y exportaciones. |
| Publication | Proyecciones públicas, publicación, retiro, QR y autenticidad. |
| Sales Import | Adaptadores Excel, validación, vista previa, importación, duplicados y anulación. |
| Cards | Folios, asignaciones, recargas, retiros, transferencias y saldos administrativos. |
| Consumer Businesses | Negocios, sucursales consumidoras, usuarios y asociaciones con propietarios. |
| Catalog and Pricing | Productos, precios, límites, disponibilidad y tarifas. |
| Orders | Creación, elegibilidad, asignación atómica, estados, cancelaciones e incidencias. |
| Delivery | Repartidores, disponibilidad, zonas, ubicación, entrega y ventas externas. |
| Analytics | Indicadores, fórmulas, versiones, proyecciones y series históricas. |
| Notifications | Centro de avisos, correo, navegador, confirmaciones y escalamiento. |
| Subscription | Demo, Stripe, estados de acceso, cancelación y reactivación. |
| Audit | Eventos de negocio, consultas, filtros y retención. |
| Offline Sync | Manifiestos, paquetes sincronizados, operaciones locales, conflictos y resolución. |
| Integration Adapters | Stripe, correo, mapas, objetos, PDF, capacitación y formatos Excel. |

## 9. Flujo de una operación autenticada

1. El navegador inicia sesión mediante OpenID Connect.
2. El BFF crea una sesión segura y evita exponer tokens persistentes al JavaScript del navegador.
3. El usuario selecciona un contexto de cuenta, sucursal o función autorizado.
4. El BFF envía la solicitud a la API con identidad, sesión, contexto y correlación.
5. La API valida autenticación, estado de la cuenta, estado de la sesión y permisos.
6. El módulo correspondiente valida reglas de negocio y transición de estado.
7. La modificación, el evento de auditoría y el registro outbox se confirman en una misma transacción cuando aplique.
8. La API devuelve el resultado y el identificador de correlación.
9. Los efectos externos son procesados por trabajadores después de la confirmación transaccional.

## 10. Flujo asíncrono y patrón outbox

Para evitar que una operación de negocio quede confirmada sin que se registre el trabajo posterior, se recomienda el patrón transactional outbox:

1. La API modifica la entidad de negocio.
2. En la misma transacción inserta auditoría y uno o varios eventos en outbox.
3. Un publicador lee eventos pendientes y los envía a la cola.
4. El worker procesa el mensaje con una clave idempotente.
5. El resultado se registra como completado, reintentable o fallido.
6. Los mensajes que excedan el máximo de reintentos pasan a una dead-letter queue.
7. El soporte puede consultar, corregir la causa y reprocesar de forma auditada.

La cola debe asumirse como entrega al menos una vez. Todo consumidor debe tolerar mensajes repetidos.

## 11. Arquitectura multiempresa

### 11.1 Modelo recomendado

Se recomienda una sola base PostgreSQL con esquema compartido y separación lógica por contexto. La mayoría de las tablas privadas deberán incluir un identificador de cuenta o una relación inequívoca que permita derivarlo.

No se recomienda una base de datos por cuenta porque:

- una persona puede relacionarse con varias cuentas;
- una máquina puede transferirse entre propietarios;
- un restaurante puede asociarse con máquinas de diferentes propietarios;
- ICE24 requiere paneles y auditoría globales;
- el plan contempla cuentas con número no definido de máquinas y usuarios;
- aumentaría significativamente la complejidad de migraciones, reportes y operación.

### 11.2 Entidades globales y entidades de contexto

| Tipo | Ejemplos | Regla |
|---|---|---|
| Global | Usuario, máquina física, código ICE24 OS, modelo oficial, laboratorio catalogado | Existe una sola vez en la plataforma. |
| De cuenta | Sucursal, almacén, precio, inventario, configuración de módulos | Pertenece a una cuenta titular. |
| De asociación | Usuario-cuenta, usuario-máquina, restaurante-máquina, repartidor-máquina | Define ámbito, rol, vigencia y estado. |
| Histórica por periodo | Propiedad de máquina, ubicación de máquina, titularidad de tarjeta | Nunca debe sobrescribirse; usa fecha de inicio y fin. |
| Comercial | Venta, recarga, pedido, tarifa, ganancia estimada | Permanece vinculada a la cuenta o periodo que la originó. |
| Técnica/sanitaria | Mantenimiento, análisis, componente, bitácora | Permanece vinculada a la máquina física. |

### 11.3 Aislamiento

El aislamiento debe aplicarse en varias capas:

- filtros obligatorios de contexto en repositorios;
- autorización central antes de ejecutar cada caso de uso;
- pruebas automatizadas de acceso cruzado;
- claves foráneas y restricciones que impidan asociaciones inválidas;
- Row-Level Security de PostgreSQL como defensa adicional en tablas de mayor riesgo, después de validar su interacción con el ORM y los procesos administrativos;
- credenciales de base de datos separadas para aplicación, migraciones, auditoría y procesos operativos;
- ningún acceso directo del navegador a PostgreSQL.

## 12. Arquitectura de datos

### 12.1 Principios

- PostgreSQL será la fuente de verdad para datos estructurados y estados.
- Los archivos binarios permanecerán en almacenamiento de objetos.
- Los datos dinámicos de formularios pueden utilizar JSONB, pero las propiedades utilizadas en reglas, búsquedas, límites e indicadores deben modelarse de manera consultable.
- No se debe utilizar JSONB para evitar diseñar relaciones, restricciones o índices.
- Toda entidad sensible debe tener identificador interno no reutilizable.
- Las fechas técnicas se almacenarán en UTC y se convertirán a la zona horaria correspondiente al mostrar o programar.
- Los importes se almacenarán en unidades enteras menores de la moneda, no en punto flotante.
- Las mediciones deben conservar valor, unidad, precisión y origen.
- Las correcciones no deben reemplazar silenciosamente el dato anterior.

### 12.2 Modelo de máquina permanente

Para cumplir la continuidad de la máquina se recomienda separar:

- activo físico de máquina;
- código ICE24 OS;
- serie del fabricante;
- periodo de propiedad;
- periodo de ubicación;
- configuración de modelo y versión de plantilla;
- historial técnico y sanitario;
- relaciones comerciales por propietario.

La transferencia cerrará el periodo de propiedad anterior y abrirá uno nuevo. No cambiará el identificador interno ni el código visible.

### 12.3 Versionado de plantillas

Las plantillas deberán modelarse como versiones inmutables publicadas:

- una versión en borrador puede editarse;
- una versión publicada no se modifica;
- una corrección crea una versión nueva;
- cada actividad generada conserva el identificador de la versión y la definición utilizada;
- la publicación de una versión produce un cálculo de impacto antes de actualizar actividades futuras;
- las actividades históricas nunca se recalculan retroactivamente.

### 12.4 Formularios dinámicos

El motor de plantillas debe soportar, como mínimo, la definición de:

- texto, número, fecha, hora, selección, selección múltiple, booleano y comentario;
- unidad y precisión;
- obligatoriedad;
- límites inferiores y superiores;
- evidencia requerida;
- reglas condicionales justificadas por la plantilla;
- responsable y frecuencia;
- versión y vigencia.

La representación debe ser declarativa, validable y versionada. La ejecución debe conservar tanto la respuesta estructurada como la definición de campo vigente.

### 12.5 Auditoría transaccional

La auditoría de negocio se almacenará en tablas append-only con:

- evento único;
- fecha técnica UTC y fecha local;
- usuario, sesión y contexto;
- cuenta, sucursal y máquina cuando apliquen;
- entidad y operación;
- estado anterior y nuevo o resumen de diferencias;
- motivo;
- origen, dispositivo e IP aproximada;
- resultado;
- identificador de correlación.

Las tablas de alto crecimiento, como auditoría, notificaciones y analítica QR, deben diseñarse para particionarse por periodo cuando el volumen lo justifique. No se recomienda particionar todas las tablas desde el primer día.

## 13. Arquitectura offline

### 13.1 Alcance permitido

La PWA únicamente permitirá sin conexión las actividades confirmadas por el PRD:

- órdenes de trabajo previamente sincronizadas;
- bitácoras previamente descargadas;
- pedidos ya tomados;
- captura de checklist, diagnóstico, mediciones, piezas, fotografías, firma y estados permitidos.

No se permitirá offline:

- tomar un pedido;
- crear usuarios;
- cambiar permisos o configuración;
- importar Excel;
- generar reportes;
- publicar contenido;
- modificar plantillas;
- ejecutar operaciones financieras o de suscripción.

### 13.2 Almacenamiento local

Se recomienda IndexedDB, utilizando una capa como Dexie para transacciones y esquema local. El almacenamiento deberá contener únicamente los datos necesarios para las tareas descargadas.

Cada paquete offline incluirá:

- identificador de tarea;
- versión del registro base;
- permisos y acciones permitidas;
- fecha de sincronización;
- fecha máxima de uso offline;
- checklist o formulario versionado;
- archivos mínimos necesarios;
- identificadores idempotentes para operaciones locales.

### 13.3 Protección local

El navegador no ofrece las mismas garantías que un contenedor nativo seguro. Por ello:

- se minimizará la información sensible disponible offline;
- se utilizará cifrado mediante Web Crypto para campos y blobs seleccionados;
- las claves locales deberán estar vinculadas a la sesión y dispositivo en la medida permitida por el navegador;
- el usuario deberá volver a autenticarse al vencer la ventana offline;
- los datos se eliminarán al cerrar sesión, cambiar de dispositivo o detectar desactivación cuando exista conectividad;
- una revocación remota no puede borrar inmediatamente un dispositivo que permanece desconectado; este riesgo debe aceptarse y limitarse mediante vigencia corta y minimización de datos.

La duración máxima offline, cantidad de fotografías y número de tareas por dispositivo permanecen pendientes en el PRD.

### 13.4 Sincronización

Cada cambio local se registrará como operación independiente, no como una copia completa del registro. La sincronización enviará:

- ID de operación cliente;
- entidad y versión base;
- cambio solicitado;
- hora local y técnica disponible;
- archivos asociados;
- identidad y contexto del usuario;
- orden relativo dentro de la tarea.

El servidor responderá por operación con estado:

- aceptada;
- duplicada previamente;
- rechazada por validación;
- rechazada por permiso o estado;
- conflicto de versión;
- pendiente de archivo;
- error reintentable.

### 13.5 Conflictos

Se aplicará control de concurrencia optimista. Si la versión base ya cambió:

- no se sobrescribe la versión del servidor;
- se conserva la propuesta offline;
- se crea un conflicto con ambas versiones;
- un propietario o administrador autorizado resuelve;
- la resolución genera auditoría y una nueva versión.

## 14. Arquitectura de archivos

### 14.1 Flujo de carga

1. El usuario solicita iniciar una carga con metadatos.
2. La API valida permiso, tamaño, tipo y relación de negocio.
3. La API crea un registro de archivo en estado pendiente.
4. Se genera una URL temporal de carga directa al almacenamiento de objetos.
5. El navegador carga el archivo sin atravesar la memoria de la API.
6. El almacenamiento emite un evento o el cliente confirma la carga.
7. Un worker verifica tamaño real, tipo, hash, integridad y malware.
8. Se generan derivados optimizados cuando corresponda.
9. El archivo cambia a disponible o rechazado.
10. La actividad de negocio solo puede completarse cuando la evidencia obligatoria está disponible.

### 14.2 Organización de objetos

Los nombres físicos no deben exponer nombres de personas, correos o datos sanitarios. La ruta lógica debe utilizar identificadores técnicos y categorías controladas.

Se deberán separar, mediante prefijos o buckets:

- originales privados;
- derivados optimizados;
- versiones públicas;
- exportaciones temporales;
- archivos en cuarentena;
- archivos rechazados con retención técnica limitada.

### 14.3 Acceso

- Los buckets serán privados por defecto.
- Las descargas privadas utilizarán URLs temporales de corta duración.
- Las versiones públicas podrán servirse mediante CDN, pero únicamente desde una zona de publicación separada.
- La API registrará la autorización y la descarga sensible.
- El archivo original no se expondrá a través del portal público.
- Las exportaciones completas expirarán después de siete días conforme al PRD.

## 15. Arquitectura de reportes y PDF

### 15.1 Fuente única de plantilla

La vista previa y el PDF deben usar el mismo documento HTML, estilos, datos y reglas de composición. La vista previa no debe ser una recreación independiente.

### 15.2 Proceso

1. El usuario configura el reporte.
2. La API valida permisos de secciones, datos sensibles y ámbito.
3. Se crea una solicitud inmutable con una instantánea de parámetros.
4. El worker genera un modelo de lectura consistente.
5. Se renderiza el HTML de vista previa.
6. El worker PDF imprime el mismo HTML mediante Chromium.
7. Se almacena el PDF, su hash, folio y versión.
8. El estado se actualiza y se genera notificación.
9. Si está programado, el envío se ejecuta únicamente a usuarios registrados.

### 15.3 Aislamiento del worker PDF

El worker PDF debe desplegarse por separado porque Chromium puede consumir memoria y CPU de forma considerable. Debe tener:

- concurrencia limitada;
- tiempo máximo por trabajo;
- límites de memoria;
- reintentos controlados;
- rechazo de recursos externos no autorizados;
- caché de activos de marca;
- limpieza de archivos temporales.

## 16. Arquitectura del portal público

El portal público debe ser una aplicación o despliegue independiente de la PWA privada, aunque comparta componentes visuales y contratos.

### 16.1 Razones de separación

- reducir riesgo de exposición accidental de datos privados;
- permitir caché y CDN agresivos;
- mantener una política de contenido y cabeceras propia;
- escalar lecturas públicas sin escalar el panel privado;
- limitar la API pública a proyecciones de solo lectura.

### 16.2 Proyección pública

La publicación debe crear una proyección explícita que contenga únicamente:

- datos generales aprobados de máquina;
- resumen técnico publicado;
- resumen sanitario publicado;
- referencias a documentos públicos protegidos;
- teléfono público autorizado;
- estado y fecha de actualización;
- leyenda obligatoria.

El portal no debe construir su respuesta consultando libremente tablas privadas y filtrando campos en tiempo de presentación. Debe leer una proyección pública previamente generada y auditada.

### 16.3 QR

Los códigos QR deben resolver a un identificador público estable, no a la ubicación ni al propietario actual. Se recomienda un token público opaco asociado con la máquina. El cambio de propietario o sucursal no modifica el QR.

## 17. Arquitectura de integraciones

Cada integración debe implementarse mediante un adaptador con contrato interno, sin dispersar SDKs externos por los módulos de negocio.

| Integración | Patrón | Requisitos técnicos |
|---|---|---|
| Stripe | Webhooks, API saliente y reconciliación | Verificación de firma, idempotencia, registro del evento original y fuente de verdad externa. |
| Correo | Cola y proveedor intercambiable | Plantillas versionadas, estado de entrega, reintentos y exclusión de información sensible innecesaria. |
| Mapas | API mediante adaptador | Cuotas, caché permitida, normalización de coordenadas y manejo de geolocalización denegada. |
| Objetos | SDK de almacenamiento | URLs temporales, cifrado, versionado o políticas de retención según categoría. |
| PDF | Worker dedicado | Plantilla compartida, límites y almacenamiento protegido. |
| Capacitación | Redirección | Lista blanca de destino, sin compartir credenciales. |
| Excel de máquina | Adaptadores de formato | Vista previa, deduplicación, archivo original, esquema por versión y anulación reversible. |

# Tecnologías recomendadas

## 18. Stack de aplicación

| Capa | Tecnología recomendada | Justificación |
|---|---|---|
| Lenguaje principal | TypeScript sobre una versión activa LTS de Node.js | Permite compartir contratos entre web, API y workers; reduce errores de tipos y es compatible con el ecosistema propuesto. |
| Aplicación privada | Next.js con React y App Router | Soporta PWA, renderizado híbrido, aplicación tipo SPA, BFF, optimización y una base común para paneles complejos. |
| Portal público | Next.js en despliegue separado | Permite páginas públicas optimizadas, caché, renderizado del lado servidor y reutilización de componentes sin mezclar seguridad privada. |
| API | NestJS | Su arquitectura modular, inyección de dependencias, validación, guards, OpenAPI y soporte de colas favorecen un monolito modular mantenible. |
| Contrato API | REST con OpenAPI | Es explícito, versionable, fácil de integrar con PWA, webhooks y clientes futuros. Facilita generación de clientes y pruebas de contrato. |
| Base de datos | PostgreSQL, major soportado en producción | Ofrece transacciones, restricciones, JSONB, índices, RLS, particionamiento y consultas analíticas suficientes para el dominio. |
| Geoespacial | PostGIS | Permite calcular distancias, zonas y pertenencia a polígonos dentro de la base de datos. |
| Acceso a datos | Prisma ORM estable, complementado con SQL explícito | Ofrece tipos y migraciones para el trabajo cotidiano; SQL explícito conserva control para PostGIS, RLS, particiones, vistas y reportes complejos. No se recomienda adoptar versiones early access. |
| Identidad | Keycloak, versión estable soportada | Proporciona OIDC, sesiones, contraseña temporal, acciones de primer acceso, recuperación, TOTP y administración central sin costo por usuario. |
| Base local PWA | IndexedDB con Dexie | Facilita almacenamiento estructurado offline, transacciones locales y evolución del esquema del navegador. |
| Objetos | Amazon S3 o servicio compatible con S3 | Separa binarios de la base relacional y soporta URLs temporales, políticas de ciclo de vida y almacenamiento escalable. |
| Cola | Amazon SQS o cola administrada equivalente | Proporciona desacoplamiento, durabilidad, reintentos y dead-letter queues sin operar un broker propio. |
| Programación | Amazon EventBridge Scheduler o scheduler administrado equivalente | Ejecuta recordatorios, reportes, vencimientos y reconciliaciones sin depender de un único proceso con cron local. |
| PDF | Playwright con Chromium en worker dedicado | Permite renderizar el mismo HTML usado por la vista previa y probarlo en un navegador real. |
| Observabilidad | OpenTelemetry | Estandariza trazas, métricas y correlación de logs sin ligar el código a un solo proveedor. |
| Contenedores | Docker | Uniforma desarrollo, CI y producción para web, API, workers, PDF y Keycloak. |
| Infraestructura | Terraform | Mantiene infraestructura versionada, revisable y reproducible. |
| Monorepo | pnpm workspaces y Turborepo | Permite compartir paquetes y contratos, ejecutar tareas incrementales y mantener una sola versión coherente del producto. |
| Pruebas web | Playwright Test | Cubre Chromium, Firefox y WebKit, además de emulación móvil y flujos E2E. |
| Pruebas unitarias | Vitest o Jest, decisión de equipo | Ambas son compatibles con TypeScript; debe elegirse una sola para reducir duplicidad. |
| Pruebas de integración | Testcontainers | Permite validar PostgreSQL, colas y servicios reales en entornos efímeros. |

## 19. Mapeo recomendado a AWS

El PRD no selecciona proveedor. Como arquitectura de referencia se recomienda AWS administrado, manteniendo adaptadores que reduzcan el acoplamiento.

| Necesidad | Servicio de referencia |
|---|---|
| Contenedores web/API/workers | ECS Fargate |
| Imágenes de contenedor | ECR |
| PostgreSQL | RDS for PostgreSQL |
| Archivos | S3 |
| CDN y portal público | CloudFront |
| Protección perimetral | WAF y Shield Standard |
| Cola | SQS |
| Programación | EventBridge Scheduler |
| Correo | SES o proveedor transaccional especializado |
| Secretos | Secrets Manager |
| Llaves | KMS |
| DNS y certificados | Route 53 y ACM |
| Logs y métricas base | CloudWatch con exportación OpenTelemetry |
| Backups | RDS automated backups, snapshots y políticas S3 |

La selección final deberá comparar costo, disponibilidad del equipo, soporte, operación, residencia de datos, monitoreo y previsión de crecimiento. Para un piloto se puede utilizar una plataforma de contenedores administrada más simple, siempre que conserve PostgreSQL, objetos privados, cola durable, secretos y respaldos.

# Justificación de cada tecnología

## 20. Decisiones tecnológicas clave

### 20.1 Next.js

Se recomienda porque puede soportar tanto una PWA autenticada como páginas públicas y dispone de una guía oficial de PWA. La aplicación privada podrá operar como SPA después de la carga inicial, mientras el portal público puede usar renderizado y caché orientados a lectura.

No se dependerá de Server Actions como sustituto de la API de negocio. La API NestJS seguirá siendo la autoridad funcional para mantener contratos claros, acceso móvil futuro y trabajadores independientes.

### 20.2 NestJS

El dominio requiere múltiples módulos, guards, validación, OpenAPI, procesos de cola y separación de responsabilidades. NestJS ofrece una estructura consistente para un equipo que crecerá y evita construir una arquitectura interna desde cero.

### 20.3 PostgreSQL y PostGIS

El producto es relacional y transaccional: cuentas, asociaciones, estados, versiones, transferencias, pedidos, inventario y auditoría dependen de integridad referencial. PostgreSQL también permite usar JSONB para definiciones dinámicas sin abandonar el modelo relacional. PostGIS cubre distancias y zonas sin introducir una base geoespacial separada.

### 20.4 Prisma con SQL explícito

Prisma facilita productividad, tipos y migraciones. Sin embargo, ICE24 OS utilizará características avanzadas de PostgreSQL. Por ello, la convención debe permitir migraciones SQL revisadas y consultas explícitas para PostGIS, políticas RLS, particiones, vistas, cargas masivas y analítica. El ORM no debe ocultar las decisiones de base de datos.

### 20.5 Keycloak

La plataforma necesita usuarios ilimitados dentro de un plan de bajo costo relativo, inicio con usuario o correo, contraseña temporal, cambio obligatorio, recuperación, 2FA opcional y cierre de sesiones. Un proveedor cobrado por usuario activo puede afectar el modelo comercial. Keycloak ofrece control y costo predecible, a cambio de una responsabilidad operativa que debe asumirse mediante despliegue administrado, respaldos y actualizaciones.

### 20.6 SQS y outbox

La generación de reportes, envíos, importaciones y alertas no debe bloquear la API. Una cola administrada reduce operación y permite escalar trabajadores de forma independiente. El outbox mantiene consistencia entre el cambio de negocio y el mensaje que deberá procesarse.

### 20.7 OpenTelemetry

El PRD exige correlación entre errores, integraciones, colas y operaciones. OpenTelemetry permite emitir trazas, métricas y logs con un identificador común y cambiar de backend de observabilidad sin reescribir la instrumentación principal.

# Organización del proyecto

## 21. Modelo de repositorio

Se recomienda un monorepo único para la primera etapa. Los despliegues seguirán siendo independientes.

| Área | Contenido |
|---|---|
| apps/private-web | PWA privada y BFF. |
| apps/public-portal | Portal público y rutas QR. |
| apps/api | API NestJS y módulos de negocio. |
| apps/worker | Procesadores generales de cola. |
| apps/pdf-worker | Renderizado de reportes y documentos. |
| packages/contracts | Esquemas de API, eventos, errores y tipos compartidos. |
| packages/ui | Sistema de diseño y componentes accesibles. |
| packages/domain | Tipos y utilidades de dominio que pueden compartirse sin infraestructura. |
| packages/authorization | Modelo de permisos, acciones, ámbitos y evaluador. |
| packages/database | Esquema Prisma, migraciones, SQL, semillas y utilidades de transacción. |
| packages/offline | Esquema IndexedDB, cola local, sincronización y resolución de estados. |
| packages/config | Esquemas de configuración y carga validada. |
| packages/observability | Instrumentación, correlación y convenciones de telemetría. |
| packages/testing | Fixtures, builders, utilidades E2E y pruebas de aislamiento. |
| infra | Terraform, definiciones de despliegue y políticas. |
| docs | ADRs, diagramas, contratos, runbooks y decisiones. |

## 22. Organización interna de módulos

Cada módulo de negocio debe mantener las siguientes capas conceptuales:

| Capa | Responsabilidad |
|---|---|
| Domain | Entidades, valores, invariantes, estados y eventos de dominio. |
| Application | Casos de uso, autorización requerida, transacciones y orquestación. |
| Infrastructure | Repositorios, SDKs, colas, almacenamiento y adaptadores. |
| Interface | Controladores HTTP, consumidores de mensajes y tareas programadas. |

No se permite que un controlador acceda directamente al ORM ni que un módulo consulte tablas internas de otro módulo sin un contrato aprobado.

## 23. Propiedad de módulos

Para cada módulo debe existir:

- responsable técnico;
- responsable funcional;
- catálogo de entidades y estados;
- permisos asociados;
- eventos de auditoría obligatorios;
- contratos públicos del módulo;
- pruebas de aislamiento;
- métricas operativas;
- decisiones abiertas y deuda técnica.

# Convenciones

## 24. Convenciones generales

### 24.1 Idioma

- Código, identificadores técnicos, contratos y nombres de eventos: inglés.
- Interfaz y mensajes de usuario: español inicialmente.
- Documentación de negocio: español.
- Comentarios técnicos: inglés o español, pero de forma consistente dentro del repositorio.

### 24.2 Identificadores

- IDs internos: UUID, preferentemente ordenables temporalmente cuando el soporte de librerías y base esté validado.
- Código ICE24 OS: identificador de negocio separado, estable y no derivado del ID interno.
- Folios: generados por dominio, visibles y no utilizados como llave primaria.
- Idempotency keys: UUID o equivalente, únicos por operación lógica.
- Correlation IDs: presentes en solicitudes, eventos, trabajos y logs.

### 24.3 Fechas y zonas horarias

- Persistencia: UTC.
- Programación: guardar hora local, zona IANA y próxima ejecución UTC.
- Presentación inicial: DD/MM/AAAA.
- Ninguna lógica deberá depender de la zona horaria del servidor.
- Las fechas históricas conservarán la zona utilizada al capturarse cuando sea relevante.

### 24.4 Dinero y mediciones

- Dinero: enteros en centavos y código de moneda.
- Cantidades físicas: valor decimal con precisión definida, unidad catalogada y conversión explícita.
- Nunca usar punto flotante binario para dinero.
- Diferenciar importe real, saldo administrativo, costo estimado y ganancia estimada.

### 24.5 Estados

- Los estados deben provenir de catálogos o máquinas de estado explícitas.
- Toda transición valida estado anterior, permiso, precondiciones y campos obligatorios.
- No se deben inferir estados críticos únicamente desde texto libre.
- Las transiciones sensibles registran motivo y auditoría.

## 25. Convenciones de API

### 25.1 Estilo

- REST sobre HTTPS.
- JSON UTF-8 para datos estructurados.
- OpenAPI como contrato publicado.
- Versionado mayor en la ruta o cabecera, decisión a formalizar; se recomienda ruta `/v1` para claridad inicial.
- Nombres de recursos en plural y vocabulario estable.
- Paginación por cursor para listas de alto crecimiento; paginación por página solo en catálogos pequeños.
- Filtros y ordenamientos permitidos deben estar enumerados, no aceptar expresiones arbitrarias.

### 25.2 Operaciones críticas

Las operaciones que puedan repetirse por conectividad o reintentos deberán aceptar una idempotency key:

- tomar pedido;
- completar transiciones offline;
- confirmar importación;
- crear exportación;
- iniciar suscripción o cancelación;
- registrar recarga, retiro o transferencia;
- publicar o retirar documento;
- aplicar o levantar restricción.

### 25.3 Concurrencia

Las actualizaciones sensibles deberán incluir versión esperada o ETag. Si la versión no coincide, la API devolverá conflicto y no sobrescribirá.

### 25.4 Respuestas asíncronas

Las tareas pesadas devolverán:

- identificador de trabajo;
- estado inicial;
- recurso para consultar progreso;
- fecha estimada no obligatoria;
- errores estructurados si el trabajo falla.

## 26. Convenciones de eventos

Los eventos deberán nombrarse en pasado y representar hechos:

- MachineApproved.
- MaintenanceCompleted.
- SanitaryRestrictionApplied.
- ReportGenerationRequested.
- SubscriptionPaymentFailed.

Cada evento incluirá:

- event ID;
- event type y versión;
- aggregate ID y versión;
- fecha UTC;
- actor y contexto;
- correlation ID y causation ID;
- payload mínimo necesario;
- clasificación de sensibilidad.

Los eventos externos o de integración deben conservar el identificador original del proveedor.

## 27. Convenciones de base de datos

- Nombres en `snake_case`.
- Llaves primarias técnicas, no folios de negocio.
- Restricciones `NOT NULL`, `UNIQUE`, `CHECK` y claves foráneas siempre que el dominio lo permita.
- Índices creados a partir de patrones de consulta medidos.
- Ninguna migración de producción se modifica después de aplicarse.
- Las migraciones destructivas requieren estrategia de expansión y contracción.
- Los cambios grandes de datos se ejecutan mediante trabajos controlados, no dentro de una migración bloqueante.
- No se permite hard delete en entidades donde el PRD exige historial; se utilizarán estados, archivado o vigencia.

## 28. Convenciones de documentación y decisiones

- Cada decisión relevante tendrá un ADR.
- Cada API deberá actualizar OpenAPI y contratos de eventos.
- Cada módulo tendrá diagrama de estados.
- Los runbooks cubrirán integraciones, colas, restauración, incidentes, rotación de secretos y fallas de PDF.
- Los cambios de plantilla, fórmula o límite de negocio no se documentarán solo en código; deberán existir como datos versionados y auditados.

# Dependencias

## 29. Dependencias internas

| Capacidad | Dependencias técnicas mínimas |
|---|---|
| Identidad y permisos | Keycloak, perfiles locales, sesiones, contextos, auditoría. |
| Equipos | Organizaciones, archivos, plantillas y permisos. |
| Mantenimiento | Equipos, componentes, plantillas, archivos, inventario, alertas y offline. |
| Sanidad | Plantillas, archivos, laboratorio, alertas, restricciones y publicación. |
| Inventario | Organizaciones, sucursales, productos, órdenes y auditoría. |
| Reportes | Datos de módulos, permisos, objetos, PDF, cola y correo. |
| Portal público | Proyección de publicación, objetos públicos, QR, CDN y analítica. |
| Ventas | Adaptadores Excel, objetos, deduplicación, workers y analítica. |
| Pedidos | Negocios, productos, precios, máquinas, repartidores, tarjetas, mapas y notificaciones. |
| Analítica | Datos confiables, fórmulas versionadas y procesos de agregación. |
| Offline | PWA, IndexedDB, versiones, permisos, API de sincronización y auditoría. |

## 30. Dependencias externas y política de resiliencia

| Dependencia | Fuente de verdad | Timeout | Reintentos | Degradación esperada |
|---|---|---|---|---|
| Stripe | Stripe para estado de pago | Corto | Sí, idempotentes | Mantener último estado conocido y reconciliar; no asumir pago. |
| Correo | ICE24 OS para intención; proveedor para entrega | Corto al enviar a cola | Sí | La operación de negocio continúa; se muestra envío pendiente o fallido. |
| Mapas | ICE24 OS conserva coordenadas; proveedor resuelve mapas/rutas | Corto | Limitados | Permitir dirección y coordenadas manuales; suspender cálculo dependiente si no hay datos. |
| S3 | Almacenamiento para binarios | Corto | Sí | La entidad permanece pendiente de archivo; no completar actividad obligatoria. |
| PDF | ICE24 OS para datos y solicitud | Asíncrono | Sí | Reporte queda en error reintentable; la API sigue disponible. |
| Keycloak | Keycloak para autenticación | Corto | Controlados | Sesiones existentes pueden continuar según su vigencia; nuevos inicios fallan de forma segura. |
| Excel externo | Archivo original | No aplica | No automático | Marcar formato no reconocido y conservar archivo para revisión. |

# Estrategia de autenticación

## 31. Separación entre identidad, autenticación y autorización

- **Identidad:** persona única global.
- **Autenticación:** demostración de la identidad, administrada por Keycloak.
- **Autorización:** acciones permitidas dentro de ICE24 OS, administradas por la API y base de datos de negocio.

Los roles de negocio no deben depender exclusivamente de roles internos del proveedor de identidad. Keycloak conocerá credenciales y algunos atributos globales; ICE24 OS conocerá asociaciones, ámbitos y permisos.

## 32. Flujo recomendado

- OpenID Connect Authorization Code con PKCE.
- Patrón BFF para la aplicación privada.
- Cookie de sesión `HttpOnly`, `Secure` y `SameSite` apropiada.
- Tokens de acceso de corta duración almacenados del lado servidor o protegidos por el BFF.
- El JavaScript del navegador no mantendrá refresh tokens persistentes.
- La API validará firma, emisor, audiencia, expiración y sesión.
- El portal público no compartirá sesión con la aplicación privada.

## 33. Inicio de sesión

Keycloak deberá configurarse para aceptar nombre de usuario o correo y contraseña, respetando unicidad global.

El alta será privada:

1. ICE24 crea o invita al usuario.
2. Se asigna contraseña temporal o enlace de acción.
3. El primer acceso obliga a cambiar la contraseña.
4. ICE24 OS crea o confirma el perfil local y sus asociaciones.
5. El usuario selecciona un contexto autorizado.

## 34. Recuperación

- Recuperación normal mediante correo.
- Si el usuario perdió acceso al correo, un operador ICE24 ejecutará el proceso manual definido por negocio.
- La verificación manual no permitirá que soporte vea o establezca una contraseña permanente.
- Después de validar identidad, ICE24 iniciará una acción de restablecimiento y revocará sesiones pertinentes.
- Todo el proceso quedará auditado.

Los criterios exactos de verificación permanecen abiertos en el PRD.

## 35. Autenticación de dos factores

Se recomienda TOTP como primer mecanismo de 2FA, administrado por Keycloak. WebAuthn puede habilitarse posteriormente sin cambiar el modelo de negocio.

- 2FA será opcional conforme al PRD.
- La arquitectura permitirá volverlo obligatorio para roles críticos mediante política futura.
- Los códigos de recuperación y proceso de pérdida del segundo factor deben definirse antes de producción.

## 36. Sesiones y cierre

### 36.1 Sesión global

ICE24 podrá revocar la sesión global del proveedor de identidad.

### 36.2 Sesión de contexto

Debido a que un usuario puede trabajar para varias cuentas, el cierre realizado por un propietario no debería necesariamente expulsarlo de todas sus otras relaciones. Se recomienda introducir una sesión de contexto de cuenta:

- el propietario revoca la sesión o acceso dentro de su cuenta;
- la identidad global puede permanecer autenticada para otros contextos;
- ICE24 puede revocar todas las sesiones globales;
- la API verifica en cada operación que la asociación y sesión de contexto sigan activas.

Esta interpretación deberá validarse con producto porque el PRD no distingue explícitamente entre sesión global y sesión de cuenta.

## 37. Autorización

### 37.1 Modelo híbrido RBAC y ABAC

- RBAC: roles base proporcionan un conjunto inicial de permisos.
- ABAC: el permiso final depende de cuenta, sucursal, máquina, relación, estado, módulo, acción y sensibilidad.

Una decisión de autorización incluirá:

- sujeto;
- contexto activo;
- recurso;
- acción;
- ámbito;
- clasificación de datos;
- estado de suscripción;
- estado de la asociación;
- restricciones técnicas o sanitarias relevantes.

### 37.2 Política

- Denegar por defecto.
- Evaluar en servidor.
- No confiar en campos enviados por el cliente para tenant o propietario.
- No reutilizar consultas sin aplicar contexto.
- Registrar acciones sensibles y denegaciones relevantes.
- Mantener una matriz de permisos versionada y probada.

### 37.3 Acceso público

El acceso público no utiliza los permisos privados. Solo permite leer proyecciones publicadas mediante identificadores públicos opacos. La API pública no aceptará IDs internos de entidades privadas como autorización suficiente.

# Manejo de errores

## 38. Formato estándar

Las APIs utilizarán Problem Details for HTTP APIs conforme a RFC 9457. Cada error incluirá, cuando corresponda:

- tipo estable de problema;
- título legible;
- código HTTP;
- detalle seguro para el usuario;
- instancia o identificador de solicitud;
- código interno estable;
- campos inválidos;
- correlation ID;
- indicador de reintento.

No se devolverán stack traces, consultas SQL, secretos, tokens ni información de infraestructura.

## 39. Clasificación

| Categoría | Ejemplos | Respuesta |
|---|---|---|
| Validación | Campo faltante, unidad inválida, archivo excedido | 400 o 422 con errores por campo. |
| Autenticación | Sesión expirada, token inválido | 401. |
| Autorización | Falta de permiso o contexto | 403 sin revelar datos existentes. |
| No encontrado | Recurso inexistente o no visible | 404. |
| Conflicto | Versión cambió, pedido ya tomado, duplicado lógico | 409. |
| Precondición | Estado no permite transición | 412 o 422 según contrato. |
| Límite | Demasiadas solicitudes o cuota externa | 429. |
| Integración | Stripe, correo, mapas u objetos no disponibles | 502 o 503, o trabajo asíncrono fallido. |
| Interno | Error no esperado | 500 con mensaje genérico y correlación. |

## 40. Errores asíncronos

Cada trabajo tendrá:

- estado;
- número de intentos;
- fecha del último intento;
- tipo de error normalizado;
- detalle técnico restringido;
- detalle visible para usuario;
- siguiente reintento;
- referencia a dead-letter queue cuando aplique.

El usuario no debe recibir una notificación de éxito hasta que el trabajo realmente finalice.

## 41. Errores offline

La PWA distinguirá:

- sin conectividad;
- operación pendiente;
- archivo pendiente;
- error reintentable;
- permiso revocado;
- versión en conflicto;
- operación rechazada definitivamente.

La interfaz no deberá agrupar todos estos casos como “error de sincronización”.

# Manejo de configuración

## 42. Tipos de configuración

| Tipo | Ejemplos | Almacenamiento |
|---|---|---|
| Configuración de despliegue | URLs, puertos, región, nivel de log | Variables de entorno validadas. |
| Secretos | Credenciales, claves, firmas de webhook | Secrets Manager o equivalente. |
| Configuración de negocio | Precio de plan, módulos habilitados, límites de archivo | Base de datos, administrable y auditada. |
| Configuración versionada | Plantillas, frecuencias, límites sanitarios, fórmulas | Base de datos con versiones inmutables. |
| Feature flags | Liberación gradual por cuenta o entorno | Servicio o tabla controlada y auditada. |
| Configuración cliente | Preferencias visuales no sensibles | Perfil o almacenamiento local. |

## 43. Reglas

- La aplicación debe validar toda configuración al arrancar y fallar de forma explícita si falta un valor crítico.
- No se incluirán secretos en repositorio, imágenes de contenedor, logs ni bundles web.
- Las variables públicas de frontend deben declararse expresamente.
- Los cambios de configuración de negocio sensibles generan auditoría.
- Los entornos de desarrollo, pruebas y producción usan cuentas y secretos distintos.
- No se copiarán datos personales de producción a ambientes no productivos sin anonimización.
- Las plantillas y límites sanitarios no se manejarán como variables de entorno.

## 44. Entornos

Se recomiendan:

- local;
- integración continua;
- desarrollo compartido;
- staging;
- producción.

Staging deberá reproducir autenticación, colas, objetos, PDF y webhooks con credenciales de prueba. Las migraciones se validarán primero en una copia estructural o restauración controlada.

# Seguridad

## 45. Estándar objetivo

Se recomienda adoptar OWASP ASVS nivel 2 como línea base técnica, sujeto a validación de ICE24. Los controles de mayor riesgo —autenticación, autorización multiempresa, archivos, auditoría y portal público— deberán recibir pruebas específicas adicionales.

## 46. Controles de aplicación

- HTTPS obligatorio.
- HSTS en producción.
- CSP restrictiva.
- Cookies seguras y protección CSRF en el BFF.
- Validación y normalización de entradas en servidor.
- Salida codificada según contexto.
- CORS limitado a orígenes autorizados.
- Rate limiting por IP, sesión, usuario y ruta sensible.
- Protección contra fuerza bruta coordinada con Keycloak.
- Autorización de cada objeto, no solo de cada endpoint.
- Encabezados de seguridad y política de permisos del navegador.
- Dependencias fijadas y escaneadas.

## 47. Archivos

- Lista permitida de extensiones y MIME.
- Validación de firma real del archivo, no solo nombre.
- Límites del PRD: fotografía 10 MB, PDF 25 MB y Excel 20 MB, salvo cambio versionado.
- Carga a cuarentena.
- Análisis antimalware antes de disponibilidad.
- Nombres físicos aleatorios.
- No ejecutar ni servir contenido activo desde el dominio principal.
- PDF y Excel se procesan en workers aislados.
- Imágenes se decodifican y vuelven a generar cuando sea posible.
- Las URLs temporales tendrán alcance y expiración mínimos.

## 48. Datos personales y sensibles

Se deberá crear una clasificación de datos, como mínimo:

- público;
- interno;
- confidencial;
- sensible sanitario o financiero;
- secreto técnico.

La clasificación determinará:

- acceso;
- cifrado;
- posibilidad de uso offline;
- presencia en logs;
- retención;
- publicación;
- exportación.

El portal público debe utilizar versiones derivadas y nunca asumir que un original es publicable.

## 49. Cifrado

- TLS en tránsito.
- Cifrado administrado en base de datos, backups y objetos.
- KMS o equivalente para llaves de infraestructura.
- Cifrado de campos solamente cuando exista una razón de amenaza o cumplimiento; no sustituye autorización.
- Rotación de secretos y credenciales de servicio.
- Hash de integridad para archivos relevantes.

## 50. Seguridad de infraestructura

- Servicios de base de datos y workers en redes privadas.
- Exposición pública únicamente de CDN, balanceador, portal y endpoints necesarios.
- Roles IAM mínimos por servicio.
- Separación de cuentas o proyectos cloud para producción y no producción.
- WAF para superficies públicas.
- Imágenes de contenedor escaneadas y sin ejecución como root cuando sea posible.
- Backups protegidos contra borrado accidental.
- Acceso administrativo mediante identidad individual y MFA.

## 51. Desarrollo seguro

- Revisión obligatoria de cambios.
- Análisis estático y de dependencias en CI.
- Detección de secretos.
- Pruebas de autorización y aislamiento.
- Escaneo dinámico en staging.
- Revisión de amenazas antes de liberar módulos de sanidad, publicación, suscripción y exportación.
- Proceso de actualización de dependencias y respuesta a vulnerabilidades.

# Logging

## 52. Separación de auditoría y logs

### 52.1 Auditoría de negocio

Responde quién hizo qué, sobre qué entidad, con qué valores y resultado. Es parte del producto, visible según permisos y con retención prolongada.

### 52.2 Logs técnicos

Permiten operar y diagnosticar servicios. No son un historial legal o funcional y pueden tener retención menor.

No se debe depender de logs técnicos para reconstruir una acción de negocio que el PRD exige auditar.

## 53. Logging estructurado

Todos los componentes producirán logs estructurados con:

- timestamp UTC;
- nivel;
- servicio y versión;
- entorno;
- correlation ID;
- trace ID y span ID;
- request o job ID;
- módulo;
- resultado y duración;
- código de error normalizado;
- cuenta y usuario pseudonimizados cuando sea necesario.

## 54. Datos prohibidos en logs

- contraseñas;
- códigos OTP;
- tokens y cookies;
- secretos de webhook;
- contenido completo de documentos;
- datos fiscales completos;
- resultados sanitarios detallados sin necesidad operativa;
- direcciones o teléfonos sin una razón aprobada;
- payloads de archivo.

## 55. Niveles

- Error: fallo que requiere investigación o afecta una operación.
- Warn: condición degradada o recuperada.
- Info: eventos operativos significativos de bajo volumen.
- Debug: diagnóstico temporal, deshabilitado normalmente en producción.
- Trace: uso excepcional y con muestreo.

## 56. Métricas y trazas

Se instrumentarán, al menos:

- latencia y tasa de error por endpoint;
- consultas lentas;
- profundidad y edad de colas;
- duración y éxito de trabajos;
- generación de PDF;
- importaciones Excel;
- cargas y análisis de archivos;
- webhooks Stripe recibidos, duplicados y fallidos;
- correos enviados y fallidos;
- conflictos offline;
- inicios de sesión y errores de autorización agregados;
- caché del portal público;
- consumo de almacenamiento.

## 57. Alertas técnicas

Las alertas de operación deben cubrir:

- disponibilidad de API, portal e identidad;
- errores sostenidos;
- cola acumulada;
- dead-letter queue no vacía;
- backups fallidos;
- restauración no probada;
- expiración de certificados;
- capacidad de base de datos;
- crecimiento inesperado de objetos o logs;
- fallas de webhooks y reconciliación Stripe;
- reportes o correos detenidos.

Los umbrales y responsables permanecen abiertos en el PRD.

# Escalabilidad

## 58. Estrategia general

La arquitectura debe escalar horizontalmente sin convertir el sistema en microservicios prematuramente.

- Web, API y workers serán stateless respecto a la sesión persistente.
- Las instancias podrán aumentar detrás de un balanceador.
- Los trabajos se dividirán por cola y tipo.
- El worker PDF escalará independientemente.
- Los archivos no atravesarán la API principal.
- El portal público utilizará CDN y caché.
- Las consultas analíticas pesadas usarán proyecciones, vistas o tablas agregadas.

## 59. Evolución de base de datos

Orden recomendado de optimización:

1. Índices y consultas correctas.
2. Límites y paginación.
3. Pool de conexiones.
4. Vistas o tablas de lectura.
5. Particionamiento de tablas de alto crecimiento.
6. Réplica de lectura para reportes públicos o analítica.
7. Separación de cargas analíticas si el volumen lo requiere.

No se recomienda sharding en las primeras etapas.

## 60. Criterios para separar un módulo en servicio

Un módulo podrá extraerse del monolito cuando exista al menos una de estas condiciones:

- necesita escalar de forma muy diferente;
- tiene requisitos de disponibilidad independientes;
- bloquea despliegues frecuentes de otros dominios;
- requiere una tecnología o aislamiento de seguridad distinto;
- tiene un equipo propietario estable;
- su límite y contratos están maduros;
- el costo operativo de separarlo es menor que el problema actual.

Los primeros candidatos potenciales, si el volumen lo justifica, son PDF, importaciones, notificaciones, portal público y analítica. Los módulos transaccionales centrales no deben separarse sin evidencia.

## 61. Escalabilidad de archivos

- Carga directa a objetos.
- Derivados y miniaturas.
- Políticas de ciclo de vida.
- CDN para públicos.
- Exportaciones temporales.
- Métricas por cuenta y categoría.
- Límites configurables y cuotas futuras si el costo lo requiere.

## 62. Escalabilidad de analítica

Los paneles iniciales pueden operar con PostgreSQL y agregaciones programadas. Si el volumen de ventas, QR, auditoría o eventos crece significativamente, se podrá incorporar un almacén analítico separado. Esta capacidad no es necesaria para la primera liberación.

# Rendimiento

## 63. Principios

- El trabajo interactivo no esperará tareas pesadas.
- Las listas deberán paginarse.
- Las consultas se diseñarán según contexto y permisos.
- Los archivos se cargarán directamente.
- Las imágenes se servirán en tamaño adecuado.
- El portal público será cacheable.
- Las validaciones masivas de Excel se ejecutarán fuera del request web.
- Las métricas deberán medir experiencia real, no solo servidor.

## 64. Presupuestos técnicos iniciales propuestos

El PRD no fija objetivos cuantitativos. Los siguientes son valores de inicio para pruebas y deben validarse con volúmenes reales en Etapa 0.

| Operación | Objetivo inicial propuesto |
|---|---|
| Lectura API transaccional común | p95 menor o igual a 500 ms, sin incluir red del usuario. |
| Escritura API común | p95 menor o igual a 800 ms, excluyendo efectos asíncronos. |
| Inicio de carga directa | Respuesta de autorización menor o igual a 1 s en p95. |
| Portal público cacheado | p95 de respuesta de origen menor o igual a 300 ms. |
| Página privada principal | LCP objetivo menor o igual a 2.5 s en dispositivo y red de referencia acordados. |
| Encolado de alerta crítica | Menor o igual a 60 s desde la confirmación del evento. |
| Inicio de un trabajo en cola | p95 menor o igual a 30 s en operación normal. |
| Reporte estándar | Generación objetivo menor o igual a 2 minutos. |
| Exportación completa | Asíncrona, con progreso; objetivo dependiente del volumen. |
| Sincronización de operación sin archivo | Confirmación objetivo menor o igual a 2 s en conectividad estable. |

## 65. Pruebas de carga

Antes de producción se deberán definir y probar escenarios con:

- cuentas, sucursales y máquinas esperadas;
- usuarios concurrentes;
- órdenes y bitácoras por día;
- fotografías por actividad;
- tamaño y frecuencia de reportes;
- archivos Excel y número de filas;
- escaneos QR;
- pedidos concurrentes;
- webhooks Stripe;
- trabajos programados simultáneos.

Los volúmenes exactos permanecen como pregunta abierta del PRD.

## 66. Optimización de consultas

- Evitar N+1.
- Seleccionar solo columnas necesarias.
- Índices compuestos alineados con tenant, estado y fecha.
- Explicar y medir consultas críticas.
- Usar cursor para historiales.
- Mantener estadísticas de PostgreSQL.
- Ejecutar reportes sobre proyecciones o snapshots cuando la consistencia instantánea no sea necesaria.
- No consultar JSONB sin índices o diseño de acceso.

# Estructura de carpetas

## 67. Estructura raíz recomendada

| Ruta | Propósito |
|---|---|
| `/apps/private-web` | Aplicación privada PWA y BFF. |
| `/apps/public-portal` | Portal público y rutas QR. |
| `/apps/api` | API de negocio. |
| `/apps/worker` | Trabajadores generales. |
| `/apps/pdf-worker` | Generación de PDF. |
| `/packages/contracts` | OpenAPI, DTOs, eventos y errores compartidos. |
| `/packages/ui` | Design system. |
| `/packages/domain` | Primitivas, estados y tipos de dominio compartibles. |
| `/packages/authorization` | Permisos y políticas. |
| `/packages/database` | Prisma, SQL, migraciones y acceso transaccional. |
| `/packages/offline` | IndexedDB y sincronización. |
| `/packages/config` | Configuración tipada. |
| `/packages/observability` | Logging, métricas, trazas y correlación. |
| `/packages/testing` | Utilidades de pruebas. |
| `/infra/terraform` | Infraestructura como código. |
| `/infra/containers` | Definiciones de imagen y runtime. |
| `/docs/adr` | Architecture Decision Records. |
| `/docs/diagrams` | Diagramas C4, secuencia y datos. |
| `/docs/runbooks` | Operación e incidentes. |
| `/docs/security` | Modelo de amenazas y controles. |

## 68. Estructura interna de la API

Dentro de `/apps/api`, los módulos deberán agruparse por dominio y no por tipo técnico global. Cada módulo contendrá conceptualmente:

- domain;
- application;
- infrastructure;
- interface;
- tests;
- module documentation.

Se evitarán carpetas globales como `controllers`, `services` o `repositories` que mezclen todos los dominios.

## 69. Estructura de contratos

Los contratos compartidos se separarán por:

- API pública;
- API privada;
- eventos internos;
- mensajes de cola;
- errores;
- sincronización offline;
- versiones de formatos Excel;
- esquemas de formularios dinámicos.

No se compartirán directamente entidades del ORM con el frontend.

# Dependencias de software

## 70. Política de dependencias

- Utilizar versiones estables y soportadas.
- Fijar versiones mediante lockfile.
- No adoptar paquetes en early access para componentes críticos.
- Revisar licencia, mantenimiento, vulnerabilidades y capacidad de reemplazo.
- Evitar varias librerías para el mismo propósito.
- Mantener un inventario de software y dependencias.
- Actualizaciones pequeñas y frecuentes.
- Cambios mayores mediante ADR y pruebas de compatibilidad.

## 71. Dependencias críticas

| Dependencia | Riesgo | Control |
|---|---|---|
| Next.js/React | Cambios de rendering y caché | Actualizaciones planificadas y pruebas E2E. |
| NestJS | Acoplamiento al framework | Dominio independiente y adaptadores. |
| Prisma | Limitaciones con SQL avanzado | SQL explícito y repositorios. |
| Keycloak | Operación y upgrades | Despliegue aislado, backups y pruebas de actualización. |
| Chromium/Playwright | Consumo y cambios de render | Imagen fijada, worker aislado y pruebas visuales. |
| S3/SQS/AWS | Acoplamiento al proveedor | Interfaces internas y uso limitado de SDKs en adaptadores. |
| Dexie/IndexedDB | Diferencias de navegador | Matriz de soporte y pruebas reales. |

# Calidad, pruebas y entrega

## 72. Estrategia de pruebas

### 72.1 Unitarias

- reglas de negocio;
- transiciones de estado;
- fórmulas y ponderaciones;
- autorización;
- deduplicación;
- validación de plantillas.

### 72.2 Integración

- repositorios contra PostgreSQL real;
- RLS y aislamiento;
- transacciones y outbox;
- objetos y URLs temporales;
- colas y reintentos;
- Keycloak de prueba;
- Stripe en modo prueba;
- PDF y Excel.

### 72.3 Contrato

- OpenAPI;
- eventos de cola;
- webhooks;
- formatos Excel;
- compatibilidad de PWA y API durante despliegues.

### 72.4 E2E

- flujos por rol;
- transferencia de máquina;
- mantenimiento offline;
- no conformidad y restricción;
- publicación y retiro;
- importación Excel;
- pedido atómico;
- pago rechazado y reactivación;
- exportación y expiración.

### 72.5 Seguridad

- acceso cruzado;
- elevación de privilegios;
- IDOR;
- carga maliciosa;
- CSRF, XSS y CORS;
- tokens y sesiones;
- portal público;
- URLs temporales;
- secretos en logs.

### 72.6 Recuperación

- restauración de PostgreSQL;
- consistencia con objetos;
- recuperación de Keycloak;
- reconstrucción de proyecciones;
- reproceso de outbox y colas.

## 73. CI/CD

Cada cambio deberá pasar por:

1. Formato y lint.
2. Compilación y tipos.
3. Pruebas unitarias.
4. Pruebas de integración relevantes.
5. Validación de migraciones.
6. Análisis de dependencias y secretos.
7. Construcción de imágenes.
8. Pruebas E2E en entorno efímero o staging.
9. Escaneo de imágenes.
10. Aprobación para producción.

Los despliegues deberán ser repetibles, con rollback de aplicación. Las migraciones de datos deben ser compatibles hacia atrás durante la ventana de despliegue.

## 74. Estrategia de migraciones

- Migraciones versionadas y revisadas.
- Expansión antes de contracción.
- No bloquear tablas grandes durante horario de operación.
- Backfill asíncrono para datos masivos.
- Compatibilidad entre versión nueva y anterior durante despliegue.
- Backup y plan de reversión antes de cambios de alto riesgo.
- Registro de migración y tiempo de ejecución.

# Seguridad operativa, respaldo y continuidad

## 75. Backups

- PostgreSQL con backups automáticos y recuperación a punto en el tiempo según objetivo aprobado.
- Objetos con versionado o protección equivalente para categorías críticas.
- Configuración de Keycloak respaldada.
- Infraestructura reproducible desde Terraform.
- Secretos no deben depender de backups de aplicación.

## 76. RPO y RTO

El PRD deja RPO y RTO abiertos. Se propone iniciar la discusión con:

- RPO preliminar de 15 minutos para datos transaccionales;
- RTO preliminar de 4 horas para la plataforma privada;
- RTO preliminar menor para portal público si existe caché vigente.

Estos valores no deben considerarse compromiso hasta evaluar costo y criticidad.

## 77. Restauración

- Prueba al menos trimestral o con la frecuencia que defina operación.
- Verificación de relaciones entre base y objetos.
- Registro de resultados, duración y datos faltantes.
- Runbook de restauración por ambiente.
- Simulación de pérdida de worker, cola, base y proveedor de identidad.

# Riesgos técnicos

## 78. Matriz de riesgos

| ID | Riesgo técnico | Impacto | Mitigación |
|---|---|---|---|
| RT-01 | Alcance demasiado amplio para una primera liberación | Arquitectura inconclusa y retrasos | Confirmar MVP, construir por etapas y mantener módulos deshabilitados hasta estar listos. |
| RT-02 | Autorización granular implementada de forma inconsistente | Fuga de datos entre cuentas | Servicio central de políticas, deny-by-default, pruebas de aislamiento y RLS selectivo. |
| RT-03 | Revocación de sesión de cuenta afecta otras relaciones del usuario | Interrupción indebida | Separar sesión global de sesión de contexto y validar con producto. |
| RT-04 | Datos offline permanecen en dispositivo revocado | Exposición de información | Ventana offline limitada, minimización, cifrado local, reautenticación y borrado al reconectar. |
| RT-05 | Conflictos offline complejos | Pérdida o duplicación | Operaciones idempotentes, control de versión y resolución explícita. |
| RT-06 | Keycloak aumenta carga operativa | Fallas de acceso o upgrades difíciles | Despliegue aislado, respaldo, monitoreo, staging y procedimiento de actualización. |
| RT-07 | Prisma limita PostGIS, RLS o consultas avanzadas | Soluciones frágiles o lentas | SQL explícito revisado y repositorios especializados. |
| RT-08 | PDF consume excesivos recursos | Caída o lentitud de API | Worker aislado, límites, colas y optimización de imágenes. |
| RT-09 | Archivos maliciosos o activos | Compromiso de usuarios o infraestructura | Cuarentena, validación, escaneo, dominios separados y no ejecución. |
| RT-10 | Crecimiento de fotos, PDFs y auditoría | Costos y rendimiento | Métricas, ciclo de vida, derivados, límites y particionamiento selectivo. |
| RT-11 | Mensajes duplicados en cola | Correos, cargos o estados repetidos | Idempotencia por consumidor, outbox y claves únicas. |
| RT-12 | Webhooks Stripe desordenados o tardíos | Estado de suscripción incorrecto | Registrar eventos, comparar versión temporal, reconciliar y usar Stripe como fuente de verdad. |
| RT-13 | Publicación filtra datos privados | Riesgo legal y reputacional | Proyección pública separada, revisión, pruebas y descarga protegida. |
| RT-14 | Formatos Excel cambian | Importaciones incorrectas | Adaptadores versionados, vista previa y conservación del original. |
| RT-15 | Transferencia mezcla historia técnica y comercial | Exposición o pérdida de datos | Modelo por activo y periodos de propiedad, autorización documentada y pruebas. |
| RT-16 | Plantillas dinámicas evolucionan sin compatibilidad | Registros imposibles de interpretar | Versiones inmutables y conservación de definición ejecutada. |
| RT-17 | Analítica consulta tablas transaccionales pesadas | Lentitud general | Agregaciones, proyecciones y réplica futura. |
| RT-18 | Dependencia excesiva de AWS | Costos o dificultad de migración | Adaptadores y contenedores; mantener datos en tecnologías portables. |
| RT-19 | Objetivos de rendimiento no corresponden al uso real | Sobrediseño o mala experiencia | Definir volúmenes y ejecutar pruebas desde Etapa 0. |
| RT-20 | Retención indefinida de datos y logs | Costos y riesgo de privacidad | Política formal por categoría antes de producción. |

## 79. Riesgos que requieren decisión de negocio

- primera combinación de etapas que formará el MVP;
- política exacta de retención y eliminación legítima;
- límites de trabajo offline;
- obligatoriedad futura de 2FA;
- tratamiento de sesiones multiempresa;
- volúmenes esperados;
- publicación de documentos y datos sanitarios;
- transferencia de información comercial;
- periodos de gracia de suscripción;
- responsabilidad y horario de soporte.

# Decisiones técnicas abiertas

## 80. Pendientes para Etapa 0

1. Proveedor cloud y región de despliegue.
2. Objetivos definitivos de disponibilidad, RPO y RTO.
3. Volumen estimado de cuentas, máquinas, usuarios y archivos.
4. Navegadores y versiones mínimas.
5. Duración, tamaño y seguridad exacta del modo offline.
6. Política de 2FA para roles críticos.
7. Proveedor de correo.
8. Proveedor de mapas y modelo de costos.
9. Servicio de análisis antimalware.
10. Estrategia de retención de logs, auditoría, originales y cuentas canceladas.
11. Dominio de aplicación privada, portal público y enlaces de archivos.
12. Formato y longitud del código ICE24 OS.
13. Matriz completa de roles y permisos.
14. Formatos reales de Excel por modelo.
15. Plantillas finales de mantenimiento y sanidad.
16. Límites y parámetros normativos validados.
17. Reglas de publicación y anonimización de documentos.
18. Política de recuperación manual de identidad.
19. Criterio de resolución de conflictos offline.
20. Estrategia de soporte, incidentes y guardias.

# Criterios técnicos de aceptación

## 81. Arquitectura

- Los módulos pueden desarrollarse y probarse de forma aislada.
- Ningún controlador accede directamente a datos de otro módulo.
- El despliegue permite escalar web, API, worker y PDF por separado.
- Los efectos externos usan cola y son idempotentes.
- La auditoría se confirma atómicamente con las operaciones sensibles.

## 82. Identidad y seguridad

- Existe una sola identidad global por usuario.
- Un usuario puede cambiar de contexto sin nueva autenticación.
- La API rechaza accesos cruzados incluso si se manipulan IDs.
- Los tokens persistentes no se exponen al JavaScript del navegador.
- El cierre de sesión elimina los datos locales que la PWA pueda eliminar.
- Los archivos privados no tienen URLs permanentes públicas.

## 83. Datos y consistencia

- El código ICE24 OS permanece estable durante traslados y transferencias.
- Las correcciones conservan versiones anteriores.
- Las plantillas publicadas son inmutables.
- Los pedidos se toman de manera atómica.
- Los webhooks y trabajos repetidos no duplican efectos.
- La información pública se obtiene únicamente desde una proyección publicada.

## 84. Offline

- Solo se descargan tareas autorizadas.
- Cada operación tiene estado visible.
- Un conflicto conserva ambas versiones.
- La sincronización tolera reintentos.
- Los archivos pueden continuar su carga sin duplicar la actividad.
- Las tareas vencidas o revocadas se rechazan de forma segura al sincronizar.

## 85. Observabilidad y continuidad

- Toda solicitud tiene correlation ID.
- Las trazas continúan a través de API, cola y worker.
- Existen alertas para colas, backups, errores y webhooks.
- Se prueba restauración antes del lanzamiento.
- La auditoría puede diferenciar descargas públicas y privadas.

# Trazabilidad con el PRD

## 86. Relación entre requisitos y componentes

| Grupo del PRD | Componentes principales del TRD |
|---|---|
| RF-ADM | Aplicación privada, Platform Administration, Authorization, Audit. |
| RF-ID | Keycloak, BFF, Identity Profile, Authorization, sesiones de contexto. |
| RF-ORG | Organizations, modelo multiempresa y PostgreSQL. |
| RF-EQP | Assets, periodos de propiedad/ubicación, Files y Template Engine. |
| RF-TPL | Template Engine, versionado y formularios dinámicos. |
| RF-MNT | Maintenance, Offline Sync, Inventory, Files y Notifications. |
| RF-SAN / RF-LAB | Sanitary Control, Laboratory, Restrictions, Files y Publication. |
| RF-INV | Inventory, Maintenance y Audit. |
| RF-DOC | Files, objetos privados, malware scanning, Publication y Audit. |
| RF-RPT | Reporting, queue, PDF worker, objetos y correo. |
| RF-PUB | Public portal, public projection, CDN, QR y public analytics. |
| RF-SAL | Sales Import, Excel adapters, workers y deduplicación. |
| RF-CARD | Cards, transacciones, idempotencia y auditoría. |
| RF-BIZ | Consumer Businesses y asociaciones multiempresa. |
| RF-PRD / RF-ORD / RF-DEL | Catalog and Pricing, Orders, Delivery, PostGIS y Offline Sync. |
| RF-ANA | Analytics, agregaciones y fórmulas versionadas. |
| RF-NOT | Notifications, scheduler, queue y correo. |
| RF-SUB | Subscription, Stripe adapter, webhooks y sesiones. |
| RF-AUD | Audit, OpenTelemetry, almacenamiento y filtros. |
| RF-PWA | Next.js PWA, IndexedDB, Dexie y API de sincronización. |
| RF-INT | Integration Adapters, outbox, queue y observabilidad. |

# Referencias técnicas de arquitectura

## 87. Fuentes de referencia

La propuesta se apoya en documentación primaria y estándares vigentes al momento de redactar este TRD:

- documentación oficial de Next.js para Progressive Web Applications;
- documentación oficial de NestJS para arquitectura modular, validación, OpenAPI, autenticación y colas;
- documentación oficial de PostgreSQL para Row-Level Security, JSONB y particionamiento;
- documentación oficial de PostGIS para tipos geográficos y cálculo de distancias;
- documentación oficial de Keycloak para administración de servidor, sesiones, acciones requeridas y OTP;
- documentación oficial de Prisma para acceso tipado, transacciones y migraciones SQL personalizables;
- documentación oficial de Stripe para webhooks e idempotencia;
- RFC 9457 para errores de APIs HTTP;
- OWASP ASVS y guías de logging y carga de archivos;
- documentación oficial de Amazon S3 y SQS para URLs temporales, almacenamiento y colas administradas;
- documentación oficial de OpenTelemetry para trazas, métricas y logs;
- documentación oficial de Playwright para navegadores y pruebas E2E;
- documentación de Dexie para IndexedDB y patrones offline.

# Próximos entregables recomendados

## 88. Entregables de Etapa 0

1. ADRs aprobados para las decisiones 001–014.
2. Diagrama C4 de contexto, contenedores y componentes.
3. Modelo lógico inicial de datos.
4. Matriz de roles y permisos.
5. Contrato de autenticación y sesiones de contexto.
6. Prototipo técnico de PWA offline con fotografías y conflicto.
7. Prototipo de vista previa y PDF desde la misma plantilla.
8. Prototipo de carga directa, cuarentena y descarga temporal.
9. Prueba de concepto de Keycloak y cierre de sesiones.
10. Prueba de concepto de PostgreSQL, PostGIS y aislamiento multiempresa.
11. Prueba de concepto de outbox, SQS y worker idempotente.
12. Estimación de costos de infraestructura por etapa.
13. Matriz de navegadores y dispositivos.
14. Plan de seguridad, respaldo, observabilidad y respuesta a incidentes.
15. Backlog técnico de Etapa 1 con dependencias y criterios de terminado.

## 89. Condición para iniciar desarrollo de Etapa 1

No se recomienda iniciar el desarrollo funcional completo hasta que se hayan resuelto, al menos:

- MVP o primera liberación;
- proveedor de infraestructura;
- matriz inicial de permisos;
- diseño de identidad y sesiones;
- modelo base de cuenta, sucursal, máquina, propiedad y ubicación;
- estrategia de archivos;
- estrategia de auditoría;
- objetivos provisionales de disponibilidad y rendimiento;
- límites iniciales de offline;
- proceso de despliegue y migraciones.

---

**ICE24 OS — Technical Requirements Document — Versión 1.0**
