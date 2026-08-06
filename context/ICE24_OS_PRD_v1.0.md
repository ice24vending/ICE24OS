# ICE24 OS — Product Requirements Document (PRD)

> **Confidencial.** Información propiedad intelectual de ICE24 MX. Su reproducción total o parcial requiere autorización escrita.

## Control del documento

| Campo | Valor |
|---|---|
| Proyecto | ICE24 OS |
| Documento | Product Requirements Document (PRD) |
| Versión | 1.0 |
| Fecha | Agosto de 2026 |
| Propietario | ICE24 MX |
| Estado | Borrador profesional para validación de producto, diseño, arquitectura e ingeniería |
| Mercado inicial | México |
| Idioma inicial | Español |
| Moneda | Pesos mexicanos (MXN) |
| Formato de fecha | DD/MM/AAAA |
| Documento fuente | ICE24 OS — Documento Maestro de Requerimientos Funcionales y Estructurales, versión 2026-V1.0 |

## Propósito del PRD

Este PRD transforma el Documento Maestro de ICE24 OS en una especificación de producto estructurada, verificable y utilizable por negocio, Product Management, UX/UI, arquitectura, ingeniería, calidad y operación.

El documento:

- conserva el alcance integral definido por ICE24 MX;
- organiza las capacidades por dominio, usuario y etapa de construcción;
- identifica casos de uso, historias de usuario, requisitos y criterios de aceptación;
- separa explícitamente lo confirmado de las decisiones todavía pendientes;
- no define funcionalidades que no estén justificadas por el documento fuente.

## 1. Nombre del proyecto

**ICE24 OS**

Sistema integral de gestión operativa, técnica, sanitaria, comercial y documental para máquinas vending de hielo y agua.

## 2. Objetivo

### 2.1 Objetivo general

Diseñar y construir una plataforma web privada, instalable como aplicación web progresiva (PWA), que centralice y estandarice el ciclo de vida de las máquinas vending de hielo y agua alrededor de un expediente único por equipo.

La plataforma debe permitir gestionar identidad y ubicación del equipo, mantenimiento, control sanitario, análisis de laboratorio, evidencias, documentos, inventario, reportes, ventas importadas, tarjetas, clientes comerciales, pedidos, reparto, alertas, suscripción y auditoría.

### 2.2 Objetivos específicos

| ID | Objetivo | Resultado esperado |
|---|---|---|
| OBJ-01 | Centralizar el control operativo | El propietario conoce el estado de sus cuentas, sucursales, máquinas, pendientes, alertas e inventarios. |
| OBJ-02 | Estandarizar procesos | Cada modelo y componente activa plantillas, mantenimientos, bitácoras, límites y procedimientos oficiales definidos por ICE24. |
| OBJ-03 | Garantizar trazabilidad | Toda actividad relevante conserva actor, fecha, evidencia, versión, transición y motivo de corrección o anulación. |
| OBJ-04 | Organizar el control sanitario documental | Bitácoras, análisis, documentos, alertas, restricciones y acciones correctivas permanecen vinculados con la máquina y la sucursal. |
| OBJ-05 | Mantener continuidad técnica | Mantenimientos, fallas, componentes instalados, componentes retirados y órdenes de trabajo forman el historial permanente del equipo. |
| OBJ-06 | Convertir datos comerciales en información útil | Los archivos de ventas, pedidos, recargas y entregas alimentan paneles y reportes. |
| OBJ-07 | Coordinar el ecosistema de usuarios | Propietarios, personal ICE24, operadores, técnicos, responsables sanitarios, negocios y repartidores usan una identidad única con permisos controlados. |
| OBJ-08 | Reducir dependencia de recordatorios manuales | El sistema genera calendarios, vencimientos, alertas y escalamientos accionables. |
| OBJ-09 | Facilitar evidencia verificable | Documentos, archivos, versiones, reportes, etiquetas y códigos QR se gestionan con integridad, privacidad y publicación deliberada. |

### 2.3 Resultados de producto esperados

El documento fuente no fija metas numéricas de adopción, rendimiento, reducción de tiempos o cumplimiento. Por ello, este PRD define resultados cualitativos verificables:

- cada máquina activa cuenta con un expediente único y permanente;
- las actividades obligatorias se generan a partir de plantillas versionadas;
- los vencimientos no desaparecen por reprogramación;
- los eventos sensibles son auditables;
- los datos privados permanecen aislados por cuenta, sucursal, máquina y permiso;
- la información pública requiere una acción explícita de publicación;
- el trabajo offline permitido se sincroniza sin sobrescribir conflictos;
- los reportes y su vista previa mantienen consistencia;
- la información incompleta se presenta como ausencia de datos, no como cumplimiento ni no conformidad.

Las métricas cuantitativas y sus metas se incluyen en **Preguntas abiertas**.

## 3. Problema que resuelve

La operación de máquinas vending de hielo y agua puede distribuirse entre manuales, archivos, fotografías, mensajes, aplicaciones independientes, bitácoras físicas y conocimiento no documentado de las personas. Esta fragmentación dificulta mantener continuidad operativa, demostrar actividades, detectar vencimientos, controlar cambios y analizar información.

ICE24 OS atiende los siguientes problemas:

1. **Ausencia de expediente único por máquina.** La identidad, ubicación, historial técnico, historial sanitario, documentos y relaciones comerciales no se encuentran consolidados.
2. **Dependencia de recordatorios manuales.** Mantenimientos, bitácoras, análisis, vencimientos y acciones correctivas pueden omitirse o atenderse tarde.
3. **Procesos no estandarizados.** Los formatos y procedimientos pueden variar por persona, sucursal o modelo.
4. **Evidencia sin estructura.** Fotografías, PDFs, firmas, lecturas y resultados de laboratorio pueden existir sin metadatos ni relación clara con una actividad.
5. **Falta de trazabilidad.** Correcciones, anulaciones, restricciones, publicaciones, descargas y transferencias pueden no conservar actor, motivo, versión o resultado.
6. **Inventario desconectado del servicio.** Refacciones y consumibles no siempre se relacionan con el mantenimiento o la máquina donde fueron utilizados.
7. **Ventas difíciles de analizar.** La información depende de archivos Excel descargados desde la aplicación independiente del equipo.
8. **Control administrativo limitado de tarjetas.** Los dispositivos físicos no comunican automáticamente saldos o movimientos a ICE24 OS.
9. **Pedidos y entregas sin flujo común.** Propietarios, máquinas, restaurantes, productos, repartidores y tarjetas necesitan reglas de relación y estados verificables.
10. **Falta de gobierno central.** ICE24 necesita administrar cuentas, plantillas, validaciones, restricciones, suscripciones, seguridad y auditoría global sin mezclarlas con la operación del cliente.
11. **Riesgo de exposición pública indebida.** La publicación de información técnica o sanitaria requiere versiones protegidas y aprobación deliberada.

## 4. Público objetivo

### 4.1 Clientes y organizaciones objetivo

- ICE24 MX como administrador central de la plataforma.
- Personas físicas o morales propietarias de máquinas vending de hielo o agua.
- Operaciones con una o varias sucursales y una o varias máquinas.
- Equipos ICE24, equipos con marca comercial del cliente y equipos externos validados con plantilla compatible.
- Negocios y restaurantes consumidores de hielo asociados con máquinas autorizadas.

### 4.2 Usuarios y roles

| Rol | Necesidad principal dentro del producto |
|---|---|
| Superadministrador ICE24 | Gobierno global, seguridad, configuración crítica, suscripciones y auditoría. |
| Administrador técnico ICE24 | Modelos, sistemas, componentes, mantenimiento, validaciones y restricciones técnicas. |
| Administrador sanitario ICE24 | Plantillas sanitarias, límites, análisis, restricciones, no conformidades y publicación crítica. |
| Personal ICE24 | Soporte y operación con permisos específicos. |
| Propietario principal | Control de su cuenta, sucursales, equipos, usuarios, precios, inventario, reportes y publicaciones. |
| Administrador del cliente | Gestión delegada dentro de permisos; puede recibir permisos especiales como reactivación. |
| Encargado de sucursal | Consulta y operación de sucursales asignadas, sin acceso estructural o financiero salvo autorización. |
| Operador | Captura de bitácoras, actividades, mediciones e incidencias. |
| Técnico | Atención de órdenes, mantenimientos, componentes, diagnóstico y evidencias. |
| Responsable sanitario | Gestión y consulta de controles sanitarios, análisis y acciones correctivas autorizadas. |
| Repartidor | Consulta, toma y ejecución de pedidos de máquinas asociadas con tarjeta activa. |
| Administrador de negocio consumidor | Gestión de sucursales y usuarios del negocio consumidor. |
| Usuario de restaurante | Creación y consulta de pedidos asociados. |
| Consulta o auditor interno | Lectura de información autorizada sin capacidad de modificación. |
| Público | Consulta de información técnica y sanitaria publicada mediante portal y códigos QR. |

### 4.3 Principio de identidad

Cada persona debe existir una sola vez en ICE24 OS. El correo y el nombre de usuario son únicos globalmente. Una misma identidad puede tener diferentes roles, asociaciones y ámbitos de acceso en varias cuentas, sucursales o máquinas.

## 5. Alcance del producto

### 5.1 Alcance integral incluido

El producto contempla desde su arquitectura inicial los siguientes bloques:

1. **Gobierno y plataforma:** administración central, identidad, permisos, suscripción, seguridad, auditoría y configuración.
2. **Activos y operación:** cuentas, sucursales, equipos, modelos, sistemas, componentes, ubicación y transferencias.
3. **Control principal:** mantenimiento, tickets, órdenes, bitácoras, sanidad, laboratorio, restricciones e inventario.
4. **Documentación y confianza:** archivos, evidencias, versiones, reportes, etiquetas, portal público, QR y autenticidad.
5. **Comercio y distribución:** ventas importadas, tarjetas, recargas, negocios, productos, precios, pedidos, repartidores y entregas.
6. **Inteligencia:** indicadores técnicos, sanitarios, comerciales, inventario, mapas de calor y predicción cuando exista historial suficiente.
7. **Capacidades transversales:** notificaciones, escalamiento, permisos, auditoría, PWA, offline, sincronización, archivos, reportes e integraciones.

### 5.2 Límites y fuera de alcance

ICE24 OS:

- no controla físicamente las máquinas;
- no sustituye la aplicación remota original del fabricante;
- no obtiene automáticamente el saldo real de las tarjetas físicas;
- no procesa pagos de pedidos de hielo;
- usa Stripe exclusivamente para la suscripción del software;
- no timbra facturas fiscales;
- no constituye certificación, autorización o dictamen sanitario;
- no sustituye el portal externo de capacitación;
- no incluye el accesorio Brain ni su plataforma en el alcance actual;
- no incorpora video en la primera versión de la política de archivos;
- no integra inicialmente una API con la aplicación de la máquina: las ventas se importan manualmente mediante Excel.

### 5.3 Principios rectores

| Principio | Aplicación en el producto |
|---|---|
| Privado por diseño | No existe registro público libre de propietarios o equipos. |
| Equipo como eje | El historial técnico y sanitario pertenece al equipo y no al propietario temporal. |
| Plantillas oficiales | ICE24 controla y versiona modelos, actividades, límites y evidencias obligatorias. |
| Trazabilidad antes que conveniencia | Correcciones, anulaciones, reactivaciones, restricciones y transferencias conservan historia y motivo. |
| Identidad única | Una persona usa una sola cuenta de acceso con múltiples asociaciones. |
| Permiso mínimo | El acceso se limita por organización, sucursal, máquina, módulo, acción y sensibilidad. |
| Offline controlado | Solo las actividades previamente sincronizadas pueden ejecutarse sin conexión. |
| Publicación deliberada | El estado operativo y la visibilidad pública son independientes. |
| Alertas accionables | Cada alerta tiene prioridad, responsable, escalamiento y acción requerida. |
| Experiencia consistente | Todos los módulos deben sentirse parte de un único producto. |
| Datos reutilizables | La captura es estructurada y alimenta reportes, indicadores y auditoría. |
| Arquitectura extensible | El modelo de datos contempla todos los módulos aunque se liberen gradualmente. |

### 5.4 Secuencia de construcción

El documento fuente define el diseño integral y una construcción por etapas. No define formalmente un MVP comercial independiente.

| Etapa | Alcance |
|---|---|
| Etapa 0 — Descubrimiento y arquitectura | Validación, prototipos, stack, modelo de datos, seguridad, UX y plan de pruebas. |
| Etapa 1 — Fundamentos | Identidad, cuentas, sucursales, permisos, equipos, modelos, componentes, suscripción, auditoría y PWA base. |
| Etapa 2 — Control principal | Mantenimiento, tickets, bitácoras, sanidad, laboratorio, restricciones, inventario, archivos y alertas. |
| Etapa 3 — Resultados y portal | Reportes, PDF, programación, etiquetas, QR, portal público e indicadores iniciales. |
| Etapa 4 — Ventas y monederos | Importación Excel, ventas, tarjetas, recargas, bonificaciones y transferencias. |
| Etapa 5 — Clientes y reparto | Negocios, productos, precios, pedidos, repartidores, GPS, entregas y ventas externas. |
| Etapa 6 — Inteligencia | Ganancias estimadas, comparaciones, mapas de calor, demanda y reportes avanzados. |
| Etapa 7 — Endurecimiento y lanzamiento | Rendimiento, seguridad, respaldos, accesibilidad, observabilidad, soporte y migraciones. |

## 6. Casos de uso

| ID | Caso de uso | Actor principal | Resultado esperado |
|---|---|---|---|
| CU-01 | Crear una cuenta titular | ICE24 | Cuenta creada con propietario principal y credenciales temporales. |
| CU-02 | Iniciar sesión y cambiar de contexto | Usuario con varias asociaciones | Acceso a las funciones y datos del contexto autorizado sin iniciar sesión nuevamente. |
| CU-03 | Recuperar acceso | Usuario / ICE24 | Contraseña restablecida por correo o mediante verificación manual. |
| CU-04 | Administrar usuarios y permisos | Propietario / ICE24 | Usuarios asociados con rol, ámbito y acciones autorizadas. |
| CU-05 | Cerrar sesiones | Propietario / ICE24 | Sesiones de una cuenta o globales invalidadas y auditadas. |
| CU-06 | Solicitar alta de una máquina | Propietario | Solicitud enviada con datos, documentos y fotografías. |
| CU-07 | Validar y activar una máquina | ICE24 | Plantilla asignada, código ICE24 OS generado y calendarios iniciales creados. |
| CU-08 | Trasladar una máquina | ICE24 / propietario autorizado | Nueva ubicación registrada sin perder historial de ubicaciones. |
| CU-09 | Transferir una máquina | ICE24 | Historial técnico y sanitario transferido; información comercial tratada según autorización. |
| CU-10 | Publicar una nueva versión de plantilla | ICE24 | Actividades futuras recalculadas; históricos conservan la versión original. |
| CU-11 | Consultar calendario de mantenimiento | Propietario / técnico / operador | Actividades próximas, vencidas y críticas visibles según permisos. |
| CU-12 | Reportar una incidencia | Usuario autorizado | Ticket creado para una máquina, sistema y prioridad. |
| CU-13 | Ejecutar una orden de trabajo | Técnico | Diagnóstico, checklist, piezas y evidencias registrados, incluso offline cuando fue sincronizada. |
| CU-14 | Corregir o anular una actividad | Usuario autorizado | Nueva versión creada con motivo, actor y comparación. |
| CU-15 | Completar una bitácora sanitaria | Operador / responsable sanitario | Registro estructurado capturado con unidades, límites y evidencia aplicable. |
| CU-16 | Registrar análisis de laboratorio | Responsable sanitario / ICE24 | Documento original y parámetros estructurados vinculados con el equipo. |
| CU-17 | Gestionar una no conformidad | Propietario / ICE24 / responsable sanitario | Alerta crítica, ticket, acción correctiva, restricción y seguimiento registrados. |
| CU-18 | Reactivar después de una restricción | Propietario o administrador autorizado | Formulario, evidencia, aceptación y auditoría registrados; ICE24 notificado. |
| CU-19 | Registrar inventario y movimientos | Propietario / técnico autorizado | Existencias, costos, lotes, movimientos y relación con órdenes actualizados. |
| CU-20 | Solicitar refacciones | Propietario | Solicitud con folio y mensaje de WhatsApp prellenado generado. |
| CU-21 | Cargar y versionar un documento | Usuario autorizado | Archivo protegido con metadatos, hash, versión y visibilidad. |
| CU-22 | Generar un reporte | Usuario autorizado | Vista previa y PDF consistentes según periodo, secciones y privacidad. |
| CU-23 | Programar un reporte | Propietario / usuario autorizado | PDF enviado por correo a usuarios registrados con auditoría de envío. |
| CU-24 | Solicitar exportación completa | Propietario principal | Paquete disponible por siete días con registro de descargas. |
| CU-25 | Publicar contenido en portal público | Propietario / ICE24 | Versión protegida visible y acción auditada. |
| CU-26 | Escanear un QR público | Público | Acceso a información publicada del equipo sin exposición de datos privados. |
| CU-27 | Importar ventas desde Excel | Propietario / financiero autorizado | Archivo validado, vista previa confirmada y datos deduplicados importados. |
| CU-28 | Anular una importación | Usuario autorizado | Registros retirados de paneles y operación conservada en auditoría. |
| CU-29 | Administrar tarjetas y recargas | Propietario / administrador autorizado | Movimientos administrativos registrados sin presentarlos como saldo real. |
| CU-30 | Crear y asociar un negocio consumidor | Propietario | Negocio y usuarios creados o asociados con máquinas autorizadas. |
| CU-31 | Configurar productos y precios | Propietario | Catálogo, precios, límites y disponibilidad definidos por máquina. |
| CU-32 | Crear un pedido | Restaurante | Pedido creado únicamente cuando máquina, producto y repartidor son elegibles. |
| CU-33 | Tomar un pedido | Repartidor | Asignación atómica al primer repartidor elegible conectado. |
| CU-34 | Completar una entrega | Repartidor | Recolección, ruta, entrega, código, ubicación y evidencia registrados. |
| CU-35 | Registrar una venta externa | Repartidor | Venta opcional registrada con privacidad y ganancia estimada. |
| CU-36 | Consultar indicadores | Propietario / ICE24 / usuario autorizado | Métricas visibles según ámbito, fórmula y versión. |
| CU-37 | Atender una alerta crítica | Responsable | Lectura, confirmación de enterado, atención y resolución vinculadas con una actividad. |
| CU-38 | Pagar o reactivar la suscripción | Propietario / Stripe | Estado de acceso actualizado conforme al evento confirmado por Stripe. |
| CU-39 | Consultar auditoría | ICE24 / propietario / administrador autorizado | Eventos filtrables por usuario, cuenta, sucursal, máquina, fecha y tipo. |
| CU-40 | Sincronizar trabajo offline | Técnico / operador / repartidor | Cambios cargados o conflicto preservado para revisión, sin sobrescritura silenciosa. |

## 7. Historias de usuario

### 7.1 Administración, identidad y permisos

- **HU-ID-01:** Como ICE24, quiero crear una cuenta titular y un propietario principal para entregar acceso controlado sin registro público libre.
- **HU-ID-02:** Como usuario, quiero iniciar sesión con nombre de usuario o correo para utilizar una sola identidad.
- **HU-ID-03:** Como usuario nuevo, quiero recibir una contraseña temporal y cambiarla en el primer acceso para proteger mi cuenta.
- **HU-ID-04:** Como usuario, quiero recuperar mi contraseña por correo para restablecer el acceso.
- **HU-ID-05:** Como ICE24, quiero verificar manualmente la identidad cuando el usuario perdió acceso al correo para evitar una recuperación no autorizada.
- **HU-ID-06:** Como propietario, quiero asignar roles, ámbitos y permisos individuales para limitar lo que cada persona puede ver o hacer.
- **HU-ID-07:** Como usuario con varias relaciones, quiero cambiar de contexto sin volver a iniciar sesión para operar distintas cuentas o máquinas.
- **HU-ID-08:** Como propietario, quiero cerrar sesiones de usuarios de mi cuenta para responder a incidentes de seguridad.
- **HU-ID-09:** Como ICE24, quiero cerrar sesiones globalmente para atender riesgos de plataforma.
- **HU-ID-10:** Como usuario, quiero activar 2FA de forma opcional para reforzar mi acceso.

### 7.2 Cuentas, sucursales y equipos

- **HU-ACT-01:** Como propietario, quiero registrar sucursales con ubicación, horario, zona horaria y contacto para organizar mis máquinas.
- **HU-ACT-02:** Como propietario, quiero archivar una sucursal sin borrar su historial para conservar trazabilidad.
- **HU-ACT-03:** Como propietario, quiero iniciar una solicitud de alta de equipo para integrar una máquina a ICE24 OS.
- **HU-ACT-04:** Como ICE24, quiero validar documentos, fotografías o inspecciones antes de activar un equipo para asignar la plantilla correcta.
- **HU-ACT-05:** Como propietario, quiero identificar cada máquina mediante un código permanente para mantener continuidad durante traslados o ventas.
- **HU-ACT-06:** Como ICE24, quiero transferir una máquina entre cuentas conservando obligatoriamente su historial técnico y sanitario.
- **HU-ACT-07:** Como propietario, quiero trasladar una máquina entre sucursales sin perder el historial de ubicaciones.
- **HU-ACT-08:** Como usuario autorizado, quiero ver estados operativo, técnico y sanitario por separado para no confundir disponibilidad con salud técnica o sanitaria.

### 7.3 Plantillas, mantenimiento y sanidad

- **HU-TPL-01:** Como administrador ICE24, quiero versionar plantillas por modelo, sistema y componente para estandarizar actividades y límites.
- **HU-TPL-02:** Como propietario, quiero que las actividades futuras se actualicen automáticamente cuando ICE24 publique una nueva versión oficial.
- **HU-MNT-01:** Como propietario, quiero consultar mantenimientos próximos, vencidos y críticos para priorizar la operación.
- **HU-MNT-02:** Como usuario autorizado, quiero crear un ticket relacionado con una máquina y sistema para reportar una incidencia.
- **HU-MNT-03:** Como administrador, quiero asignar una orden de trabajo a un técnico para dar seguimiento formal.
- **HU-MNT-04:** Como técnico, quiero descargar una orden y completarla sin conexión para trabajar en ubicaciones con conectividad limitada.
- **HU-MNT-05:** Como técnico, quiero registrar diagnóstico, checklist, piezas, pruebas y evidencias para demostrar el trabajo realizado.
- **HU-MNT-06:** Como propietario, quiero que una actividad vencida permanezca vencida hasta su ejecución real para no ocultar atrasos.
- **HU-SAN-01:** Como operador, quiero completar bitácoras generadas desde plantillas dinámicas para registrar actividades sanitarias estandarizadas.
- **HU-SAN-02:** Como responsable sanitario, quiero corregir un registro conservando la versión original para mantener trazabilidad.
- **HU-SAN-03:** Como responsable sanitario, quiero registrar parámetros de laboratorio en campos estructurados y vincular el PDF original para poder analizarlos y verificarlos.
- **HU-SAN-04:** Como propietario, quiero recibir una alerta crítica cuando exista una no conformidad para iniciar una acción correctiva.
- **HU-SAN-05:** Como ICE24 sanitario, quiero aplicar una restricción con motivo y evidencia para bloquear pedidos cuando exista riesgo.
- **HU-SAN-06:** Como propietario autorizado, quiero solicitar reactivación con evidencia y aceptación de responsabilidad para documentar la atención del evento.

### 7.4 Inventario, documentos y reportes

- **HU-INV-01:** Como propietario, quiero registrar entradas, transferencias y ajustes de inventario para conocer existencias y costos.
- **HU-INV-02:** Como técnico, quiero registrar el consumo de una refacción desde mi orden de trabajo para asociarla con la máquina.
- **HU-INV-03:** Como propietario, quiero conservar el historial de piezas instaladas y retiradas para conocer su ciclo de vida.
- **HU-DOC-01:** Como usuario autorizado, quiero cargar documentos con metadatos y versión para mantener un repositorio verificable.
- **HU-DOC-02:** Como propietario, quiero publicar o retirar versiones protegidas para controlar qué información se muestra al público.
- **HU-DOC-03:** Como propietario, quiero descargar el original con o sin marca de agua según mis permisos.
- **HU-REP-01:** Como usuario autorizado, quiero generar reportes por periodo, cuenta, sucursal o máquina para presentar información relevante.
- **HU-REP-02:** Como propietario, quiero personalizar secciones, anexos, fotografías y privacidad para adaptar cada reporte.
- **HU-REP-03:** Como propietario, quiero programar reportes periódicos a usuarios registrados para automatizar la distribución.
- **HU-REP-04:** Como propietario principal, quiero solicitar una exportación completa para obtener mis datos y archivos en un paquete temporal.

### 7.5 Portal público

- **HU-PUB-01:** Como propietario, quiero publicar un resumen técnico o sanitario de una máquina para ofrecer transparencia controlada.
- **HU-PUB-02:** Como integrante del público, quiero escanear un QR y consultar únicamente información publicada para conocer el historial autorizado del equipo.
- **HU-PUB-03:** Como ICE24, quiero que el portal indique que la información es de gestión y no una certificación oficial para evitar interpretaciones incorrectas.
- **HU-PUB-04:** Como propietario, quiero mantener el mismo QR después de un traslado o transferencia para preservar la identidad pública del equipo.

### 7.6 Ventas, tarjetas y negocios

- **HU-VEN-01:** Como propietario, quiero cargar un Excel de ventas y revisar una vista previa para validar los datos antes de importarlos.
- **HU-VEN-02:** Como propietario, quiero evitar duplicados por periodo o transacción para no inflar resultados.
- **HU-VEN-03:** Como usuario autorizado, quiero anular una importación conservando el historial para corregir información sin borrarla.
- **HU-TAR-01:** Como propietario, quiero registrar tarjetas y movimientos administrativos por máquina para documentar recargas y transferencias.
- **HU-TAR-02:** Como usuario, quiero ver una advertencia de que el saldo mostrado es administrativo para no confundirlo con el saldo físico real.
- **HU-NEG-01:** Como propietario, quiero crear o asociar un negocio consumidor para ofrecer autoservicio o entrega.
- **HU-NEG-02:** Como administrador de negocio, quiero gestionar mis sucursales y usuarios sin asociarme por mi cuenta con nuevas máquinas.
- **HU-NEG-03:** Como negocio asociado con varios propietarios, quiero usar una sola identidad y ver únicamente mis relaciones autorizadas.

### 7.7 Productos, pedidos y reparto

- **HU-PRO-01:** Como propietario, quiero definir productos, precios y disponibilidad por máquina para controlar la oferta de hielo.
- **HU-PRO-02:** Como propietario, quiero configurar tarifas de entrega por modalidad permitida para mostrar el total antes de confirmar.
- **HU-PED-01:** Como restaurante, quiero ver máquinas asociadas ordenadas principalmente por cercanía para elegir dónde realizar el pedido.
- **HU-PED-02:** Como restaurante, quiero crear un pedido únicamente cuando exista una máquina, producto y repartidor elegibles para evitar pedidos imposibles de atender.
- **HU-PED-03:** Como repartidor, quiero tomar un pedido de manera exclusiva para que otro repartidor no pueda asumirlo simultáneamente.
- **HU-PED-04:** Como repartidor, quiero continuar un pedido tomado sin conexión para completar la entrega aun con conectividad limitada.
- **HU-PED-05:** Como restaurante, quiero cancelar antes de que el producto sea recogido para evitar una compra innecesaria.
- **HU-PED-06:** Como propietario, quiero que las cancelaciones posteriores a la recolección se registren como autorización o incidencia para conservar control.
- **HU-REP-05:** Como repartidor, quiero trabajar con máquinas de distintos propietarios desde una sola cuenta para no duplicar identidades.
- **HU-REP-06:** Como repartidor, quiero registrar ventas externas opcionales y una ganancia estimada para dar seguimiento a mi actividad privada.

### 7.8 Analítica, alertas, suscripción y auditoría

- **HU-ANA-01:** Como propietario, quiero consultar indicadores técnicos, sanitarios, comerciales y de inventario para priorizar acciones.
- **HU-ANA-02:** Como usuario, quiero conocer los factores y la versión de fórmula que afectan un indicador para interpretarlo correctamente.
- **HU-ALT-01:** Como responsable, quiero que las alertas críticas permanezcan fijadas hasta que confirme estar enterado para evitar que desaparezcan al leerlas.
- **HU-ALT-02:** Como ICE24, quiero definir escalamientos mínimos obligatorios para asegurar atención de riesgos y vencimientos.
- **HU-SUB-01:** Como propietario, quiero contratar un plan único mediante Stripe para activar mi cuenta.
- **HU-SUB-02:** Como propietario, quiero conservar acceso de solo lectura cuando mi suscripción no esté activa para consultar documentos existentes.
- **HU-SUB-03:** Como propietario, quiero que la cuenta se reactive automáticamente después de un pago confirmado para recuperar acceso sin intervención manual.
- **HU-AUD-01:** Como propietario, quiero consultar la auditoría de mi cuenta para saber quién realizó cambios o descargas sensibles.
- **HU-AUD-02:** Como ICE24, quiero consultar auditoría global y logs de integraciones para investigar operaciones y errores.
- **HU-OFF-01:** Como administrador, quiero revisar conflictos offline sin que una versión sobrescriba a otra para decidir cuál debe prevalecer.

## 8. Requerimientos funcionales

### 8.1 Administración central de ICE24

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-ADM-001 | El sistema debe ofrecer a ICE24 un panel global de cuentas, demos, equipos, suscripciones, alertas y restricciones. | 1 |
| RF-ADM-002 | ICE24 debe poder crear cuentas titulares y propietarios principales con credenciales temporales. | 1 |
| RF-ADM-003 | ICE24 debe poder administrar roles internos y permisos especiales. | 1 |
| RF-ADM-004 | ICE24 debe poder revisar y resolver solicitudes de alta de equipos mediante documentos, fotografías, videollamada o visita técnica cuando se requiera. | 1 |
| RF-ADM-005 | ICE24 debe asignar el código ICE24 OS y la plantilla oficial antes de activar una máquina. | 1 |
| RF-ADM-006 | ICE24 debe crear y versionar modelos, sistemas, componentes, mantenimientos, bitácoras, límites sanitarios, indicadores y reglas de escalamiento. | 1–2 |
| RF-ADM-007 | ICE24 debe poder aplicar restricciones técnicas o sanitarias con motivo, evidencia, condiciones de levantamiento y auditoría. | 1–2 |
| RF-ADM-008 | ICE24 debe administrar cuentas demo, ampliar su vigencia y convertir una contratación en una cuenta productiva limpia. | 1 |
| RF-ADM-009 | ICE24 debe poder consultar auditoría global, logs de integraciones y actividad pública de QR. | 1–3 |
| RF-ADM-010 | ICE24 debe poder habilitar o deshabilitar módulos funcionales por cuenta sin crear planes comerciales distintos. | 1 |
| RF-ADM-011 | El panel de validaciones debe mostrar solicitudes, información faltante, responsable, estado y resolución. | 1 |
| RF-ADM-012 | El panel de plantillas debe mostrar versión, vigencia, cambios y máquinas afectadas. | 1 |
| RF-ADM-013 | El panel de suscripciones debe mostrar estado de Stripe, próximo cobro, rechazo, cancelación y reactivación. | 1 |
| RF-ADM-014 | Las acciones administrativas sensibles deben generar eventos de auditoría. | 1 |

### 8.2 Identidad, autenticación y permisos

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-ID-001 | El correo electrónico y el nombre de usuario deben ser únicos globalmente. | 1 |
| RF-ID-002 | Un usuario debe existir una sola vez y poder asociarse con múltiples cuentas, sucursales, máquinas y roles. | 1 |
| RF-ID-003 | El inicio de sesión debe aceptar nombre de usuario o correo y contraseña. | 1 |
| RF-ID-004 | El primer acceso debe obligar a cambiar la contraseña temporal. | 1 |
| RF-ID-005 | La recuperación de contraseña debe realizarse por correo electrónico. | 1 |
| RF-ID-006 | Cuando el usuario no tenga acceso al correo, ICE24 debe poder ejecutar una verificación manual antes del restablecimiento. | 1 |
| RF-ID-007 | El propietario debe poder cerrar sesiones de usuarios de su cuenta. | 1 |
| RF-ID-008 | ICE24 debe poder cerrar sesiones globalmente. | 1 |
| RF-ID-009 | El propietario no debe poder cambiar directamente el correo de otro usuario. | 1 |
| RF-ID-010 | El usuario debe poder activar autenticación de dos factores de forma opcional. | 1 |
| RF-ID-011 | Los permisos deben evaluarse por organización, sucursal, máquina, módulo, acción y sensibilidad del dato. | 1 |
| RF-ID-012 | Un rol debe ofrecer permisos base, pero el propietario podrá ajustar permisos individuales dentro de límites definidos por ICE24. | 1 |
| RF-ID-013 | El usuario con varias asociaciones debe poder cambiar de contexto sin una nueva autenticación. | 1 |
| RF-ID-014 | Cuando un correo o nombre de usuario ya exista, el sistema debe crear una solicitud de asociación y no una identidad duplicada. | 1 |
| RF-ID-015 | El sistema debe soportar, como mínimo, todos los roles descritos en la sección de público objetivo. | 1 |
| RF-ID-016 | El acceso a costos, ingresos, márgenes, documentos sanitarios, datos personales y auditoría debe requerir permisos específicos. | 1 |

### 8.3 Cuentas, sucursales y asociaciones

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-ORG-001 | Una cuenta titular debe poder representar una persona física o una persona moral. | 1 |
| RF-ORG-002 | La cuenta debe almacenar zona horaria principal, contacto, datos fiscales y configuración de módulos. | 1 |
| RF-ORG-003 | El propietario principal debe poder crear perfiles y asignar permisos dentro de su responsabilidad. | 1 |
| RF-ORG-004 | Una sucursal debe almacenar nombre, dirección, coordenadas, zona horaria, horario y teléfono público. | 1 |
| RF-ORG-005 | El propietario debe poder autorizar opcionalmente la publicación de su teléfono. | 1–3 |
| RF-ORG-006 | Una sucursal debe poder registrar temperatura ambiental de referencia y lecturas manuales opcionales. | 1 |
| RF-ORG-007 | Una sucursal debe poder contener una o varias máquinas y un almacén local. | 1–2 |
| RF-ORG-008 | Una sucursal debe poder archivarse sin eliminar su historial. | 1 |
| RF-ORG-009 | El acceso de un usuario debe poder limitarse a sucursales o máquinas específicas. | 1 |
| RF-ORG-010 | Un restaurante debe poder asociarse con máquinas de distintos propietarios sin exponer información comercial cruzada. | 5 |
| RF-ORG-011 | Un repartidor debe poder asociarse con varias máquinas, con relación y tarjeta independientes por máquina. | 5 |

### 8.4 Equipos, identidad física y transferencias

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-EQP-001 | El sistema debe gestionar equipos ICE24 450 kg, ICE24 450 kg + agua, ICE24 900 kg, purificadoras vending de agua, equipos externos validados y equipos ICE24 con marca del cliente. | 1 |
| RF-EQP-002 | El propietario debe poder crear una solicitud de equipo en borrador. | 1 |
| RF-EQP-003 | La solicitud debe capturar fabricante, modelo, serie, ubicación, capacidad, componentes, fotografías, manuales y mantenimiento previo. | 1 |
| RF-EQP-004 | ICE24 debe poder solicitar información adicional, videollamada o visita técnica antes de resolver la solicitud. | 1 |
| RF-EQP-005 | El propietario no debe poder activar el equipo ni elegir la plantilla oficial. | 1 |
| RF-EQP-006 | Al aprobar un equipo, el sistema debe generar un código ICE24 OS único, permanente e inmutable. | 1 |
| RF-EQP-007 | Al aprobar un equipo, el sistema debe generar las etiquetas definidas y los calendarios iniciales. | 1–3 |
| RF-EQP-008 | El expediente debe almacenar código, serie, fabricante, modelo técnico, marca comercial y nombre interno. | 1 |
| RF-EQP-009 | El expediente debe almacenar cuenta, sucursal, dirección, coordenadas, fecha de instalación y temperatura de referencia. | 1 |
| RF-EQP-010 | La capacidad nominal solo debe ser modificable por ICE24. | 1 |
| RF-EQP-011 | La configuración debe registrar tamaño de cubo, presentaciones, sistema de pagos, componentes y accesorios permitidos. | 1 |
| RF-EQP-012 | El equipo debe mantener estados independientes operativo, técnico, sanitario, de suscripción y de publicación. | 1–3 |
| RF-EQP-013 | El cambio de sucursal debe conservar la línea de tiempo de ubicaciones. | 1 |
| RF-EQP-014 | La transferencia entre cuentas debe ser ejecutada por ICE24. | 1 |
| RF-EQP-015 | El código, la serie física y el historial técnico y sanitario deben permanecer con el equipo durante una transferencia. | 1 |
| RF-EQP-016 | La transferencia de ventas, clientes, recargas y pedidos debe ser opcional y requerir autorización documentada. | 1, 4–5 |
| RF-EQP-017 | El sistema debe permitir archivar, retirar, suspender o desactivar un equipo sin eliminar normalmente sus datos. | 1 |

### 8.5 Modelos, sistemas, componentes y plantillas

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-TPL-001 | ICE24 debe poder definir modelos con capacidad, sistemas, dimensiones, características y versiones. | 1 |
| RF-TPL-002 | ICE24 debe poder definir sistemas funcionales con procedimientos, criticidad y dependencias. | 1 |
| RF-TPL-003 | ICE24 debe poder definir componentes con vida útil, compatibilidad, frecuencia y evidencia. | 1 |
| RF-TPL-004 | ICE24 debe poder definir actividades con periodicidad, responsable, pasos, alertas y reporte. | 1–2 |
| RF-TPL-005 | Solo ICE24 debe poder crear o modificar plantillas oficiales. | 1 |
| RF-TPL-006 | Las actualizaciones oficiales deben ser obligatorias y aplicarse automáticamente. | 1 |
| RF-TPL-007 | Las actividades históricas deben conservar la versión que las originó. | 1–2 |
| RF-TPL-008 | Las actividades futuras deben recalcularse con la nueva versión de plantilla. | 1–2 |
| RF-TPL-009 | Antes de publicar una actualización, ICE24 debe poder consultar qué máquinas serán afectadas. | 1 |
| RF-TPL-010 | Cada versión debe registrar autor, fecha, vigencia y resumen de cambios. | 1 |
| RF-TPL-011 | El propietario solo debe poder modificar datos operativos expresamente permitidos, no frecuencias, procedimientos o límites oficiales. | 1–2 |
| RF-TPL-012 | Una característica particular debe poder activar componentes o mantenimientos adicionales. | 1–2 |

### 8.6 Mantenimiento, tickets y órdenes de trabajo

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-MNT-001 | El sistema debe soportar mantenimiento preventivo, correctivo y sanitario, inspección, limpieza, sanitización, calibración, verificación y cambio de componentes. | 2 |
| RF-MNT-002 | Una actividad debe poder originarse por tiempo, uso, condición o evento. | 2 |
| RF-MNT-003 | El calendario debe generarse desde la plantilla, fecha de instalación, último servicio y reglas particulares. | 2 |
| RF-MNT-004 | Una actividad vencida debe permanecer vencida hasta su ejecución real y registrar días de atraso. | 2 |
| RF-MNT-005 | Un usuario autorizado debe poder crear un ticket con máquina, sistema, descripción y prioridad. | 2 |
| RF-MNT-006 | Un propietario o administrador debe poder asignar un técnico y generar una orden de trabajo. | 2 |
| RF-MNT-007 | La orden debe contener checklist, procedimiento, refacciones y evidencia requerida. | 2 |
| RF-MNT-008 | El técnico debe poder registrar diagnóstico, actividades, piezas, pruebas y recomendación. | 2 |
| RF-MNT-009 | El técnico debe poder completar una orden previamente sincronizada sin conexión. | 2 |
| RF-MNT-010 | El cierre debe requerir diagnóstico, actividades, responsable y evidencia exigida por la plantilla. | 2 |
| RF-MNT-011 | Los mantenimientos deben permitir evidencia fotográfica y la plantilla debe poder exigir tipos específicos. | 2 |
| RF-MNT-012 | El usuario debe confirmar que la información corresponde al trabajo realizado. | 2 |
| RF-MNT-013 | El sistema debe soportar estados Programado, Próximo, En atención, Completado, Con observaciones, Vencido, No conforme y Anulado. | 2 |
| RF-MNT-014 | Una corrección debe conservar historial versionado. | 2 |
| RF-MNT-015 | El consumo de un componente debe descontar inventario y asociarse con la máquina y la orden. | 2 |
| RF-MNT-016 | Si dos usuarios modifican el mismo registro, el sistema debe preservar ambas versiones y crear un conflicto para revisión. | 2 |

### 8.7 Control sanitario y bitácoras

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-SAN-001 | El sistema debe gestionar controles de agua y proceso, limpieza y sanitización, filtros, plagas, higiene, capacitación, químicos, residuos y acciones correctivas. | 2 |
| RF-SAN-002 | ICE24 debe administrar plantillas dinámicas de bitácoras con tipos de campo, obligatoriedad, unidades, límites, evidencia y frecuencia. | 2 |
| RF-SAN-003 | Las bitácoras no deben depender de formularios rígidos codificados por cada tipo. | 2 |
| RF-SAN-004 | El propietario no debe poder modificar la plantilla sanitaria oficial. | 2 |
| RF-SAN-005 | El sistema debe generar bitácoras según modelo, componente y frecuencia oficial. | 2 |
| RF-SAN-006 | Una corrección debe exigir motivo y conservar versión original, valor corregido, fecha y actor. | 2 |
| RF-SAN-007 | Un registro anulado no debe eliminarse. | 2 |
| RF-SAN-008 | ICE24 debe definir y versionar ponderaciones del indicador sanitario. | 2, 6 |
| RF-SAN-009 | Un evento crítico debe dominar el resultado visual y evitar que otros cumplimientos oculten el riesgo. | 2, 6 |
| RF-SAN-010 | El panel debe separar estado sanitario, técnico y operativo. | 2 |
| RF-SAN-011 | El propietario no debe poder reducir obligaciones, límites o escalamientos sanitarios definidos por ICE24. | 2 |

### 8.8 Análisis de laboratorio, no conformidades y restricciones

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-LAB-001 | El registro de análisis debe incluir máquina, producto, punto de toma, laboratorio, folio y tipo de análisis. | 2 |
| RF-LAB-002 | El registro debe incluir fechas de muestreo, recepción, resultado, vigencia y próxima revisión. | 2 |
| RF-LAB-003 | Cada parámetro debe registrar nombre, unidad, resultado, límites y criterio. | 2 |
| RF-LAB-004 | El resultado debe clasificarse como Conforme, No conforme, Pendiente o No evaluable. | 2 |
| RF-LAB-005 | El PDF original, la versión pública, las fotografías y anexos deben permanecer vinculados con los datos estructurados. | 2–3 |
| RF-LAB-006 | ICE24 debe administrar plantillas de análisis microbiológicos, fisicoquímicos, metales y otros puntos definidos. | 2 |
| RF-LAB-007 | Un resultado no conforme no debe publicarse automáticamente. | 2–3 |
| RF-LAB-008 | Una no conformidad debe generar alerta crítica, ticket y acción correctiva. | 2 |
| RF-LAB-009 | ICE24 debe poder aplicar una restricción sanitaria que bloquee pedidos y active estado crítico. | 2, 5 |
| RF-LAB-010 | El propietario principal o administrador autorizado debe poder solicitar reactivación mediante formulario con acción, motivo, responsable, evidencia, fecha, próximo análisis y aceptación. | 2 |
| RF-LAB-011 | ICE24 debe ser notificado de la reactivación y poder volver a restringir. | 2 |
| RF-LAB-012 | Cuando se publique una resolución, el historial público aplicable debe conservarse dentro de la ventana de 24 meses definida. | 3 |

### 8.9 Inventario, refacciones y consumibles

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-INV-001 | El sistema debe soportar almacén general, almacén por sucursal y componentes instalados en la máquina. | 2 |
| RF-INV-002 | Un producto de inventario debe almacenar código, categoría, descripción, fotografía y compatibilidad. | 2 |
| RF-INV-003 | Debe almacenar proveedor, costo, lote, caducidad, unidad de medida, existencia, mínimos, máximos y ubicación. | 2 |
| RF-INV-004 | Debe registrar vida útil estimada y mantenimiento relacionado. | 2 |
| RF-INV-005 | Solo el propietario debe poder registrar entradas o compras con proveedor, costo, lote y evidencia. | 2 |
| RF-INV-006 | El técnico u operador autorizado debe poder registrar salidas o consumos ligados con una orden. | 2 |
| RF-INV-007 | Solo el propietario debe poder transferir existencias entre almacenes y sucursales. | 2 |
| RF-INV-008 | Solo el propietario debe poder realizar ajustes manuales, con motivo y auditoría. | 2 |
| RF-INV-009 | La instalación de una pieza debe retirarla de inventario y convertirla en componente activo de una máquina. | 2 |
| RF-INV-010 | La instalación debe iniciar historial y próximo mantenimiento del componente. | 2 |
| RF-INV-011 | La pieza retirada debe conservar condición, fotografía, motivo, costo y disposición. | 2 |
| RF-INV-012 | El propietario debe poder crear una solicitud de refacciones con productos, cantidades y máquina destino. | 2 |
| RF-INV-013 | El sistema debe generar folio y mensaje de WhatsApp prellenado; cotización y pago ocurren fuera de la plataforma. | 2 |

### 8.10 Documentos, evidencias, versiones y publicación

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-DOC-001 | Todo documento debe registrar tipo, título, descripción, emisor, folio y fechas. | 2 |
| RF-DOC-002 | Debe vincularse con cuenta, sucursal, máquina y registro relacionado. | 2 |
| RF-DOC-003 | Debe registrar usuario de carga, fecha, versión y hash de integridad. | 2 |
| RF-DOC-004 | Debe mantener estado operativo y estado de visibilidad pública independientes. | 2–3 |
| RF-DOC-005 | Debe registrar vigencia, sustitución, corrección o anulación. | 2 |
| RF-DOC-006 | El sistema debe soportar estados operativos Borrador, Pendiente de revisión, Completado, No conforme, En acción correctiva, Corregido y Anulado. | 2 |
| RF-DOC-007 | El sistema debe soportar visibilidad Privado, Pendiente de publicación, Publicado, Retirado y Sustituido. | 2–3 |
| RF-DOC-008 | El propietario debe poder descargar el original con o sin marca de agua según permiso. | 2–3 |
| RF-DOC-009 | Las descargas de documentos y reportes sensibles deben registrarse. | 2–3 |
| RF-DOC-010 | Una corrección debe crear una nueva versión y conservar la anterior internamente. | 2 |
| RF-DOC-011 | Las versiones públicas deben ocultar datos personales, firmas, comentarios internos y datos confidenciales. | 3 |
| RF-DOC-012 | Un documento retirado debe dejar de ser público sin desaparecer del expediente privado. | 3 |
| RF-DOC-013 | Los archivos privados deben utilizar un mecanismo protegido de descarga temporal. | 2 |

### 8.11 Reportes y exportaciones

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-RPT-001 | El sistema debe generar reportes predeterminados de máquina, mantenimiento, sanidad, laboratorio, sucursal, cuenta, inventario, ventas, pedidos y reparto. | 3–5 |
| RF-RPT-002 | El usuario autorizado debe poder crear reportes personalizados por periodo, secciones, sucursales, máquinas, anexos, fotografías y privacidad. | 3 |
| RF-RPT-003 | El sistema debe programar reportes semanales, mensuales, trimestrales o anuales. | 3 |
| RF-RPT-004 | Los reportes programados deben enviarse por correo únicamente a usuarios registrados. | 3 |
| RF-RPT-005 | La vista previa y el PDF deben generarse desde la misma plantilla. | 3 |
| RF-RPT-006 | Vista previa y PDF deben coincidir en contenido, orden, tablas, gráficas, fotografías, encabezados, marcas de agua y saltos. | 3 |
| RF-RPT-007 | La generación debe permitir seleccionar periodo, cuenta, sucursal, máquina, secciones, anexos, fotografías y versión pública o privada. | 3 |
| RF-RPT-008 | La marca de agua y la visibilidad de datos financieros deben depender de permisos. | 3 |
| RF-RPT-009 | Si ventas está activo con datos, el reporte debe mostrarlos; si no hay datos, debe indicar “Sin datos disponibles todavía”; si el módulo está deshabilitado, debe indicarlo. | 3–4 |
| RF-RPT-010 | El propietario debe poder definir permisos individuales por tipo de reporte. | 3 |
| RF-RPT-011 | Solo el propietario principal debe poder solicitar una exportación completa. | 3 |
| RF-RPT-012 | La exportación debe incluir archivos estructurados, PDFs, documentos, análisis, fotografías y auditoría. | 3 |
| RF-RPT-013 | El paquete debe permanecer disponible siete días, registrar descargas y expirar después. | 3 |
| RF-RPT-014 | En modo lectura no deben generarse reportes nuevos, pero sí deben poder descargarse documentos ya existentes. | 1–3 |

### 8.12 Portal público, etiquetas y códigos QR

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-PUB-001 | El sistema debe generar una etiqueta exterior de identificación con marca ICE24 OS y código del equipo. | 3 |
| RF-PUB-002 | Debe generar una etiqueta técnica con código, serie, modelo general y QR. | 3 |
| RF-PUB-003 | Debe soportar acceso público de mantenimiento y acceso público sanitario dentro de una sola rama pública por equipo. | 3 |
| RF-PUB-004 | El QR debe permanecer válido aunque cambien propietario o sucursal. | 3 |
| RF-PUB-005 | El portal debe mostrar únicamente información publicada y protegida. | 3 |
| RF-PUB-006 | El portal debe mostrar código, modelo general, marca comercial, fecha de actualización y estado visible. | 3 |
| RF-PUB-007 | Debe mostrar resumen técnico, mantenimientos publicados y descargas autorizadas. | 3 |
| RF-PUB-008 | Debe mostrar resumen sanitario, laboratorio, análisis publicados y acciones correctivas cerradas autorizadas. | 3 |
| RF-PUB-009 | Debe mostrar teléfono público de sucursal y teléfono del propietario solo cuando esté autorizado. | 3 |
| RF-PUB-010 | Debe incluir botón de WhatsApp con mensaje prellenado que contenga el código del equipo. | 3 |
| RF-PUB-011 | No debe publicar costos, inventarios, datos personales, firmas, comentarios internos o fotografías sensibles. | 3 |
| RF-PUB-012 | Los reportes públicos deben incluir marca de agua, folio, versión y verificación de autenticidad. | 3 |
| RF-PUB-013 | Un resultado no conforme no debe publicarse automáticamente. | 3 |
| RF-PUB-014 | Propietario e ICE24 deben poder publicar o retirar contenido; toda acción debe quedar auditada. | 3 |
| RF-PUB-015 | El portal debe mostrar los últimos 24 meses y permitir descargas anteriores autorizadas. | 3 |
| RF-PUB-016 | El sistema debe registrar escaneos por equipo y tipo de QR, fecha, hora y documentos descargados. | 3 |
| RF-PUB-017 | Cuando sea técnica y legalmente posible, debe registrar navegador o dispositivo general y ubicación aproximada. | 3 |
| RF-PUB-018 | El portal y los reportes deben indicar que ICE24 OS es software de gestión y no certificación oficial. | 3 |

### 8.13 Ventas e importación de Excel

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-VTA-001 | El usuario autorizado debe seleccionar una máquina y cargar un archivo Excel de ventas. | 4 |
| RF-VTA-002 | El sistema debe validar formato, columnas, periodo y consistencia. | 4 |
| RF-VTA-003 | Antes de importar, debe mostrar vista previa con registros nuevos, duplicados y errores. | 4 |
| RF-VTA-004 | La importación debe requerir confirmación explícita del usuario. | 4 |
| RF-VTA-005 | El sistema debe conservar archivo original, resumen y registros procesados. | 4 |
| RF-VTA-006 | Un usuario autorizado debe poder anular una importación con motivo. | 4 |
| RF-VTA-007 | La anulación debe retirar datos de paneles sin eliminar archivo, actor, fecha ni cantidad de registros afectados. | 4 |
| RF-VTA-008 | El modelo de datos debe contemplar fecha, hora, pago, producto, cantidad, importe, máquina y transacción cuando exista. | 4 |
| RF-VTA-009 | El sistema debe evitar duplicados por identificador único o por una llave compuesta validada con archivos reales. | 4 |
| RF-VTA-010 | Los resultados deben poder analizarse por día, hora, producto, máquina, método de pago, periodo y sucursal. | 4 |
| RF-VTA-011 | El módulo debe admitir nuevos formatos de Excel sin rehacer el resto del sistema. | 4 |

### 8.14 Tarjetas, recargas y control administrativo

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-TAR-001 | El sistema debe identificar cada tarjeta con folio impreso e identificador interno. | 4 |
| RF-TAR-002 | Cada tarjeta debe ser compatible exclusivamente con una máquina dentro del sistema. | 4 |
| RF-TAR-003 | La tarjeta debe conservar titular actual y periodos históricos de asignación. | 4 |
| RF-TAR-004 | La tarjeta debe poder asignarse a persona, empresa, restaurante, propietario, operador o repartidor. | 4–5 |
| RF-TAR-005 | El sistema no debe permitir saldo administrativo negativo ni vencimiento de tarjeta. | 4 |
| RF-TAR-006 | Debe soportar recarga, retiro, transferencia dentro de la misma máquina, movimiento entre máquinas y reasignación. | 4 |
| RF-TAR-007 | Una recarga debe registrar dinero recibido, saldo cargado, bonificación, responsable, fecha y evidencia. | 4 |
| RF-TAR-008 | La reasignación debe cerrar el periodo del titular anterior y no atribuir movimientos históricos al nuevo titular. | 4 |
| RF-TAR-009 | Un movimiento entre máquinas debe registrarse como retiro en una máquina y recarga en otra. | 4 |
| RF-TAR-010 | Los paneles deben denominar los totales como control o saldo administrativo y advertir que no representan el saldo físico real. | 4 |
| RF-TAR-011 | El sistema debe poder calcular equivalencias y ganancias estimadas con advertencia sobre movimientos no registrados. | 4–6 |

### 8.15 Negocios, restaurantes y datos fiscales

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-NEG-001 | Solo el propietario de una máquina debe poder crear un restaurante o negocio consumidor; el repartidor no debe poder hacerlo. | 5 |
| RF-NEG-002 | Una empresa consumidora debe poder tener varias sucursales y usuarios. | 5 |
| RF-NEG-003 | El administrador del negocio debe poder crear usuarios internos. | 5 |
| RF-NEG-004 | El administrador del negocio no debe poder asociarse por sí mismo con nuevas máquinas. | 5 |
| RF-NEG-005 | Un negocio debe poder asociarse con máquinas de uno o varios propietarios. | 5 |
| RF-NEG-006 | El producto debe soportar modalidades Autoservicio, Entrega y Mixta. | 5 |
| RF-NEG-007 | El negocio debe poder almacenar RFC, razón social, régimen, código postal, uso de CFDI y correo de contacto. | 5 |
| RF-NEG-008 | El sistema no debe timbrar facturas; podrá registrar una solicitud y enviar datos al responsable correspondiente. | 5 |
| RF-NEG-009 | Cada propietario debe ver solo la relación del negocio con sus propias máquinas. | 5 |
| RF-NEG-010 | La asociación con una máquina debe requerir aprobación del propietario correspondiente. | 5 |
| RF-NEG-011 | El negocio debe usar una sola identidad aunque tenga relaciones con varios propietarios. | 5 |

### 8.16 Productos, precios y disponibilidad

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-PRO-001 | Los pedidos de entrega deben limitarse a bolsas de hielo; el agua no forma parte del flujo de entrega definido. | 5 |
| RF-PRO-002 | El producto debe almacenar nombre, presentación, kilogramos, fotografía estándar y estado activo. | 5 |
| RF-PRO-003 | El propietario debe definir valor de máquina o tarjeta, precio comercial para restaurante, máximo por pedido y disponibilidad manual. | 5 |
| RF-PRO-004 | El propietario debe poder configurar precios especiales por cliente. | 5 |
| RF-PRO-005 | El sistema debe informar que no conoce inventario de hielo en tiempo real. | 5 |
| RF-PRO-006 | El propietario debe poder activar, desactivar o marcar disponibilidad aproximada de productos. | 5 |
| RF-PRO-007 | Los estados operativo, técnico o sanitario deben poder bloquear automáticamente pedidos. | 5 |
| RF-PRO-008 | La tarifa de entrega debe soportar modalidad fija, por zona, por distancia, aproximada o gratuita. | 5 |
| RF-PRO-009 | El repartidor solo debe poder ajustar la tarifa dentro de límites definidos y nunca por encima del máximo del propietario. | 5 |
| RF-PRO-010 | Producto, tarifa y total deben mostrarse antes de confirmar el pedido. | 5 |

### 8.17 Pedidos de hielo

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-PED-001 | El sistema debe ordenar únicamente máquinas asociadas con el restaurante. | 5 |
| RF-PED-002 | La recomendación debe priorizar cercanía y considerar disponibilidad, producto, precio y repartidores, dejando la decisión final al restaurante. | 5 |
| RF-PED-003 | Para crear un pedido, el restaurante debe estar asociado con la máquina. | 5 |
| RF-PED-004 | La máquina debe estar disponible y sin restricción técnica o sanitaria. | 5 |
| RF-PED-005 | El producto debe estar activo. | 5 |
| RF-PED-006 | Debe existir al menos un repartidor disponible, dentro de zona cuando aplique y con tarjeta activa de la máquina. | 5 |
| RF-PED-007 | El pedido debe aparecer a todos los repartidores elegibles. | 5 |
| RF-PED-008 | El primer repartidor que tome el pedido debe convertirse atómicamente en responsable y bloquearlo para los demás. | 5 |
| RF-PED-009 | Tomar un pedido debe requerir conexión. | 5 |
| RF-PED-010 | Después de tomarlo, el repartidor debe poder continuar el flujo sin conexión. | 5 |
| RF-PED-011 | El flujo debe registrar Pedido tomado, Inicio de recolección, Producto recogido, Cantidad e importe de tarjeta, En ruta y Entrega. | 5 |
| RF-PED-012 | La entrega debe registrar nombre, hora, ubicación, código de entrega y evidencia. | 5 |
| RF-PED-013 | El restaurante debe poder cancelar antes de que el repartidor compre el hielo. | 5 |
| RF-PED-014 | Después de Producto recogido, la cancelación debe requerir autorización o registrarse como incidencia. | 5 |
| RF-PED-015 | El sistema debe soportar entregas parciales con explicación y aceptación. | 5 |
| RF-PED-016 | Un pedido debe pertenecer a un solo propietario, sucursal operativa y máquina. | 5 |
| RF-PED-017 | El sistema debe soportar los estados Creado, Disponible, Tomado, Recogiendo, Recogido, En ruta, Entregado y Cerrado, además de Cancelado, Liberado, Parcial, No entregado y Con incidencia. | 5 |

### 8.18 Repartidores y entregas

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-DEL-001 | La elegibilidad debe requerir asociación activa, tarjeta exclusiva, disponibilidad, zona permitida cuando aplique y máquina/producto disponibles. | 5 |
| RF-DEL-002 | El repartidor debe poder estar Disponible, Ocupado, No disponible temporalmente, Fuera de servicio o Vacaciones. | 5 |
| RF-DEL-003 | La aplicación debe solicitar geolocalización del dispositivo mediante el navegador. | 5 |
| RF-DEL-004 | El propietario debe poder consultar ubicación durante un pedido activo. | 5 |
| RF-DEL-005 | La ubicación puede utilizarse para recomendaciones mientras el repartidor esté disponible. | 5 |
| RF-DEL-006 | La IP solo debe usarse como respaldo aproximado y no como fuente principal de distancia. | 5 |
| RF-DEL-007 | El repartidor debe poder registrar ventas externas opcionales. | 5 |
| RF-DEL-008 | La captura de venta externa debe poder registrar máquina, cantidad, saldo utilizado, precio, entrega y ganancia estimada. | 5–6 |
| RF-DEL-009 | La información privada del cliente de una venta externa debe respetar la privacidad definida. | 5 |
| RF-DEL-010 | La ganancia debe presentarse como estimación y no como utilidad contable real. | 6 |
| RF-DEL-011 | Un repartidor debe poder trabajar con máquinas de distintos propietarios usando una sola identidad. | 5 |

### 8.19 Analítica e indicadores

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-ANA-001 | El producto debe mostrar indicadores de estado técnico, control sanitario, resumen global, ventas, inventario, pedidos y reparto. | 3–6 |
| RF-ANA-002 | El estado técnico debe considerar mantenimientos, tickets, componentes críticos y tiempo fuera de servicio. | 3, 6 |
| RF-ANA-003 | El control sanitario debe considerar bitácoras, análisis, acciones correctivas y restricciones. | 3, 6 |
| RF-ANA-004 | El resumen global debe priorizar alertas críticas sin ocultarlas mediante promedios favorables. | 3, 6 |
| RF-ANA-005 | Los indicadores deben respetar permisos y ámbitos de acceso. | 3–6 |
| RF-ANA-006 | Cada indicador debe explicar los factores que afectan su resultado. | 6 |
| RF-ANA-007 | Las fórmulas y ponderaciones deben ser exclusivas de ICE24, versionadas y no editables por el propietario. | 6 |
| RF-ANA-008 | El portal público debe utilizar categorías cualitativas y no una calificación presentada como oficial. | 3, 6 |
| RF-ANA-009 | El producto debe poder mostrar mapas de calor por ubicación, zona, día, hora y cobertura de repartidores. | 6 |
| RF-ANA-010 | La predicción de demanda solo debe habilitarse cuando exista historial suficiente y consistente. | 6 |

### 8.20 Notificaciones, alertas y escalamiento

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-ALT-001 | El sistema debe incluir un centro de notificaciones interno. | 2 |
| RF-ALT-002 | Debe soportar notificaciones del navegador cuando el usuario las autorice. | 2 |
| RF-ALT-003 | Debe enviar correo para alertas críticas y reportes programados. | 2–3 |
| RF-ALT-004 | WhatsApp debe utilizarse inicialmente como botón de contacto, no como canal automatizado de alertas. | 2–3 |
| RF-ALT-005 | Las alertas deben soportar estados No leída, Leída, Enterado, En atención y Resuelta. | 2 |
| RF-ALT-006 | Las alertas críticas deben permanecer fijadas hasta que el responsable marque Enterado. | 2 |
| RF-ALT-007 | Marcar Enterado no debe resolver la condición. | 2 |
| RF-ALT-008 | Restricciones, no conformidades, mantenimientos críticos vencidos, pagos rechazados y escalamientos deben enviarse por correo. | 1–2 |
| RF-ALT-009 | ICE24 debe definir el mínimo obligatorio de escalamiento dentro de plantillas. | 2 |
| RF-ALT-010 | El propietario puede añadir avisos, pero no eliminar escalamientos críticos. | 2 |
| RF-ALT-011 | Cada escalamiento debe registrar anticipación, responsables, repetición, nivel superior, envío, lectura y confirmación. | 2 |
| RF-ALT-012 | La resolución debe vincularse con una orden, ticket o acción correctiva. | 2 |

### 8.21 Suscripción, Stripe y cuenta demo

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-SUB-001 | El sistema debe manejar un plan único de $399 MXN mensuales por cuenta, con usuarios, sucursales y máquinas ilimitados. | 1 |
| RF-SUB-002 | ICE24 debe poder configurar precio y condiciones para futuros ajustes o acuerdos especiales. | 1 |
| RF-SUB-003 | Stripe debe utilizarse exclusivamente para la suscripción de ICE24 OS. | 1 |
| RF-SUB-004 | El cobro mensual debe ocurrir en la fecha de activación y ajustarse al último día en meses más cortos. | 1 |
| RF-SUB-005 | Stripe debe emitir comprobante; ICE24 OS no debe timbrar factura. | 1 |
| RF-SUB-006 | El cliente debe poder solicitar cancelación desde ICE24 OS y conservar acceso hasta finalizar el periodo pagado. | 1 |
| RF-SUB-007 | El producto debe soportar estados Demo, Pendiente de activación, Activa, Pago rechazado, Modo lectura, Cancelación programada, Cancelada y Reactivada. | 1 |
| RF-SUB-008 | Un pago rechazado debe activar modo lectura inmediatamente. | 1 |
| RF-SUB-009 | En modo lectura se debe permitir consulta y descarga de documentos ya generados, pero no crear ni modificar. | 1 |
| RF-SUB-010 | La reactivación debe ser automática cuando Stripe confirme el pago. | 1 |
| RF-SUB-011 | La demo debe ser una copia independiente con datos ficticios de dos o tres meses. | 1 |
| RF-SUB-012 | La vigencia inicial de la demo debe ser de 14 días y ampliable por ICE24. | 1 |
| RF-SUB-013 | Al contratar, debe crearse una cuenta productiva limpia y no convertir los datos ficticios en datos reales. | 1 |

### 8.22 Auditoría y logs

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-AUD-001 | El sistema debe registrar auditoría de negocio, seguridad, documentos, reportes, inventario, movimientos administrativos, integraciones, offline, portal público y logs técnicos. | 1–7 |
| RF-AUD-002 | Cada evento debe incluir ID, marca de tiempo técnica, fecha y hora local, zona horaria, usuario y contexto. | 1 |
| RF-AUD-003 | Debe incluir entidad afectada, valores anterior y nuevo cuando aplique, acción, motivo, origen, dispositivo o IP aproximada y resultado. | 1 |
| RF-AUD-004 | Debe incluir identificador de correlación para seguir una operación entre servicios. | 1 |
| RF-AUD-005 | El propietario debe consultar auditoría de su cuenta; el administrador, según permiso; ICE24, auditoría global. | 1 |
| RF-AUD-006 | Ningún usuario debe poder editar o eliminar auditoría. | 1 |
| RF-AUD-007 | La auditoría de negocio y documentos debe conservarse durante la vida de la cuenta conforme a la política vigente. | 1 |
| RF-AUD-008 | Los logs técnicos deben admitir retención diferenciada configurable. | 1–7 |
| RF-AUD-009 | Deben auditarse creación, desactivación, rol, permisos y cierre de sesión de usuarios. | 1 |
| RF-AUD-010 | Deben auditarse alta, validación, traslado, transferencia y retiro de equipos. | 1 |
| RF-AUD-011 | Deben auditarse correcciones, no conformidades, restricciones, reactivaciones y publicaciones sanitarias. | 2–3 |
| RF-AUD-012 | Deben auditarse precios, importaciones, pedidos, recargas y ganancias estimadas. | 4–6 |
| RF-AUD-013 | Deben auditarse exportaciones, descargas y acceso a documentos originales. | 2–3 |
| RF-AUD-014 | La auditoría debe filtrarse por usuario, cuenta, sucursal, máquina, fecha y tipo. | 1 |
| RF-AUD-015 | Los conflictos offline y su resolución deben quedar completamente trazados. | 2–5 |
| RF-AUD-016 | Debe distinguirse entre descargas públicas y privadas. | 3 |

### 8.23 PWA, offline y sincronización

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-PWA-001 | La aplicación debe ser instalable desde un navegador en la pantalla principal. | 1 |
| RF-PWA-002 | Debe ser responsiva en teléfono, tableta y computadora. | 1–7 |
| RF-PWA-003 | Debe incluir icono, pantalla de inicio y navegación con apariencia de aplicación. | 1 |
| RF-PWA-004 | Debe gestionar actualizaciones controladas y avisar cuando exista una versión nueva. | 1 |
| RF-OFF-001 | El técnico debe poder consultar y completar órdenes sincronizadas sin conexión. | 2 |
| RF-OFF-002 | El operador debe poder completar bitácoras, mediciones, fotos e incidencias sincronizadas sin conexión. | 2 |
| RF-OFF-003 | El repartidor debe poder continuar un pedido tomado y registrar recolección, ruta, entrega y evidencia sin conexión. | 5 |
| RF-OFF-004 | Tomar un pedido, crear usuarios, cambiar configuración, procesar Excel o generar reportes debe requerir conexión. | 1–5 |
| RF-OFF-005 | Al cerrar sesión, ser desactivado o cambiar de dispositivo, los datos offline sensibles deben eliminarse del almacenamiento local. | 1–5 |
| RF-OFF-006 | Una actividad descargada debe quedar En atención por un responsable. | 2–5 |
| RF-OFF-007 | Un conflicto concurrente no debe sobrescribirse; el sistema debe conservar ambas versiones y crear una tarea de revisión. | 2–5 |
| RF-OFF-008 | La sincronización debe mostrar estados Pendiente, Sincronizando, Cargada, Error, Conflicto y Resuelta. | 2–5 |
| RF-OFF-009 | Las transiciones críticas deben ser idempotentes para evitar duplicados por reintentos o conexión inestable. | 1–5 |

### 8.24 Archivos, integraciones y soporte técnico

| ID | Requerimiento | Etapa fuente |
|---|---|---|
| RF-FIL-001 | La fotografía debe admitir inicialmente hasta 10 MB por imagen y 15 imágenes por actividad de forma predeterminada. | 1–2 |
| RF-FIL-002 | Las fotografías deben comprimirse y conservar vista optimizada y original cuando aplique. | 1–2 |
| RF-FIL-003 | El PDF debe admitir inicialmente hasta 25 MB. | 1–2 |
| RF-FIL-004 | El Excel de ventas debe admitir inicialmente hasta 20 MB. | 4 |
| RF-FIL-005 | El video debe quedar fuera de la primera versión. | Futuro |
| RF-FIL-006 | Los archivos deben almacenarse en almacenamiento de objetos y no como Base64 dentro de la base de datos. | 1 |
| RF-FIL-007 | La base de datos debe conservar metadatos y referencias seguras de archivos. | 1 |
| RF-INT-001 | La integración con Stripe debe soportar checkout o portal, eventos de pago, cancelación y reactivación. | 1 |
| RF-INT-002 | El correo transaccional debe soportar alertas, recuperación y reportes PDF. | 1–3 |
| RF-INT-003 | La integración de mapas debe soportar GPS del navegador, cercanía, zonas, rutas aproximadas y tarifa por distancia. | 5 |
| RF-INT-004 | El almacenamiento de objetos debe proteger originales, versiones públicas y exportaciones. | 1–3 |
| RF-INT-005 | El generador PDF debe utilizar la misma plantilla que la vista previa. | 3 |
| RF-INT-006 | El portal de capacitación debe abrirse mediante redirección y credenciales independientes. | 1 o etapa por definir |
| RF-INT-007 | La aplicación de la máquina debe integrarse inicialmente mediante importación manual de Excel. | 4 |
| RF-INT-008 | El sistema debe soportar colas o tareas para PDF, correo, importaciones, reportes programados y escalamiento. | 1–3 |

## 9. Requerimientos no funcionales

### 9.1 Seguridad y privacidad

| ID | Requerimiento no funcional |
|---|---|
| RNF-SEC-001 | Todo tráfico debe utilizar cifrado en tránsito. |
| RNF-SEC-002 | Los datos y archivos deben mantenerse en almacenamiento protegido. |
| RNF-SEC-003 | La autorización debe aplicarse en servidor por organización, sucursal, máquina, módulo y acción; no debe depender solo de la interfaz. |
| RNF-SEC-004 | Los documentos privados deben utilizar URLs temporales o un mecanismo equivalente protegido. |
| RNF-SEC-005 | Los secretos de integración deben separarse de la base de datos y de los archivos. |
| RNF-SEC-006 | El sistema debe registrar intentos de acceso, recuperación, 2FA, cierre de sesiones y cambios de credenciales. |
| RNF-SEC-007 | Los datos públicos deben excluir información personal, firmas, comentarios internos y fotografías sensibles. |
| RNF-SEC-008 | El producto debe contemplar protección de datos personales conforme al marco mexicano aplicable; la implementación concreta requiere validación jurídica. |
| RNF-SEC-009 | Los archivos deben someterse a validaciones de tamaño, tipo, integridad y análisis de seguridad definido por ingeniería. |
| RNF-SEC-010 | Las dependencias y vulnerabilidades deben registrarse y actualizarse de forma continua. |

### 9.2 Integridad, trazabilidad y consistencia

| ID | Requerimiento no funcional |
|---|---|
| RNF-DAT-001 | Las correcciones no deben destruir el valor anterior. |
| RNF-DAT-002 | Los eventos de auditoría deben ser inmutables para usuarios de negocio. |
| RNF-DAT-003 | Cada archivo relevante debe conservar hash de integridad. |
| RNF-DAT-004 | Las transiciones críticas deben ser idempotentes. |
| RNF-DAT-005 | Los conflictos offline deben preservar todas las versiones. |
| RNF-DAT-006 | Los datos deben distinguir claramente estados como Sin datos, Pendiente, No evaluable y No conforme. |
| RNF-DAT-007 | Los identificadores técnicos internos deben ser únicos y no reutilizables; el código visible del equipo debe ser permanente. |
| RNF-DAT-008 | Vista previa y PDF deben provenir de una fuente de plantilla común. |

### 9.3 Disponibilidad, respaldo y recuperación

| ID | Requerimiento no funcional |
|---|---|
| RNF-REL-001 | Deben existir respaldos automáticos. |
| RNF-REL-002 | Deben ejecutarse pruebas periódicas de recuperación. |
| RNF-REL-003 | Las tareas asíncronas deben registrar estado, reintentos, error y correlación. |
| RNF-REL-004 | Los errores de integraciones no deben producir duplicados ni estados ambiguos. |
| RNF-REL-005 | Los objetivos cuantitativos de disponibilidad, RPO y RTO quedan pendientes de definición. |

### 9.4 Rendimiento y escalabilidad

| ID | Requerimiento no funcional |
|---|---|
| RNF-PER-001 | La arquitectura debe escalar almacenamiento de fotografías, PDFs, Excel y exportaciones sin alojarlos dentro de la base relacional. |
| RNF-PER-002 | Reportes pesados, importaciones y envíos deben procesarse mediante tareas desacopladas cuando corresponda. |
| RNF-PER-003 | Paneles, búsquedas, reportes y carga de archivos deben probarse con el volumen esperado. |
| RNF-PER-004 | Los tiempos objetivo, concurrencia y volúmenes de referencia quedan pendientes de definición. |
| RNF-PER-005 | La retención de logs técnicos debe ser configurable para controlar costo y volumen. |

### 9.5 Usabilidad, compatibilidad y accesibilidad

| ID | Requerimiento no funcional |
|---|---|
| RNF-UX-001 | La experiencia debe ser consistente entre módulos y no parecer un conjunto de productos desconectados. |
| RNF-UX-002 | La aplicación debe funcionar de forma responsiva en teléfono, tableta y computadora. |
| RNF-UX-003 | Los mensajes de validación, error, conflicto y estado deben ser comprensibles para usuarios no técnicos. |
| RNF-UX-004 | Los estados operativo, técnico, sanitario, suscripción y publicación deben presentarse de forma separada. |
| RNF-UX-005 | El producto debe contemplar pruebas de accesibilidad durante la etapa de endurecimiento; el estándar y nivel objetivo están pendientes. |
| RNF-UX-006 | El mercado inicial debe utilizar español, MXN, zona horaria correspondiente y formato DD/MM/AAAA. |

### 9.6 Offline y dispositivos

| ID | Requerimiento no funcional |
|---|---|
| RNF-OFF-001 | El almacenamiento local de datos offline debe estar protegido. |
| RNF-OFF-002 | Los datos locales sensibles deben eliminarse en cierre de sesión, desactivación o cambio de dispositivo. |
| RNF-OFF-003 | La interfaz debe mostrar el estado de sincronización de cada actividad. |
| RNF-OFF-004 | La aplicación no debe sobrescribir silenciosamente cambios concurrentes. |
| RNF-OFF-005 | La capacidad máxima de tareas, fotos y días offline queda pendiente de definición. |

### 9.7 Observabilidad y soporte

| ID | Requerimiento no funcional |
|---|---|
| RNF-OBS-001 | La plataforma debe registrar errores, rendimiento, colas, tareas programadas y salud de servicios. |
| RNF-OBS-002 | Las operaciones distribuidas deben compartir un identificador de correlación. |
| RNF-OBS-003 | Los logs de integración deben permitir investigar eventos de Stripe, correo, mapas, almacenamiento y PDF. |
| RNF-OBS-004 | La estrategia de alertas técnicas, tableros y responsables operativos debe definirse durante arquitectura. |

## 10. Restricciones

### 10.1 Restricciones de negocio

1. No existe registro público libre de cuentas titulares o equipos.
2. El propietario puede iniciar el alta de una máquina, pero ICE24 debe validarla, asignar plantilla y activarla.
3. Solo ICE24 administra plantillas oficiales, límites, frecuencias, ponderaciones y restricciones críticas.
4. Las actualizaciones de plantillas oficiales son obligatorias para actividades futuras.
5. El código ICE24 OS del equipo es permanente, único e inmutable.
6. El historial técnico y sanitario se transfiere obligatoriamente con la máquina.
7. La información comercial de una máquina solo puede transferirse con autorización documentada.
8. Los registros no se eliminan normalmente: se archivan, anulan, retiran o desactivan.
9. Una actividad vencida no deja de estar vencida por reprogramación.
10. Los resultados no conformes no se publican automáticamente.
11. El estado operativo de una máquina y su visibilidad pública son independientes.
12. El propietario no puede reducir obligaciones sanitarias, límites o escalamientos críticos.
13. Una tarjeta pertenece administrativamente a una sola máquina.
14. Un pedido de entrega solo puede incluir bolsas de hielo.
15. No se puede crear un pedido sin repartidor elegible.
16. El primer repartidor que toma el pedido obtiene asignación exclusiva.
17. Solo el propietario puede crear negocios consumidores; el repartidor no puede hacerlo.
18. Solo el propietario principal puede solicitar una exportación completa.
19. Los reportes programados solo se envían a usuarios registrados.
20. Un pago rechazado coloca la cuenta inmediatamente en modo lectura.

### 10.2 Restricciones técnicas

1. La solución debe ser una aplicación web progresiva, no una aplicación nativa obligatoria.
2. El trabajo offline se limita a actividades previamente sincronizadas.
3. Tomar pedidos, administrar usuarios, cambiar configuración, importar Excel y generar reportes requiere conexión.
4. Las fotografías no deben almacenarse como Base64 en la base de datos.
5. Los archivos deben residir en almacenamiento de objetos privado.
6. La primera versión no admite video.
7. La aplicación de la máquina se integra inicialmente mediante archivos Excel, no API.
8. La vista previa y el PDF deben compartir plantilla de generación.
9. La IP no puede utilizarse como fuente principal para calcular distancia de reparto.
10. Los conflictos de sincronización no pueden resolverse mediante sobrescritura automática silenciosa.

### 10.3 Restricciones comerciales y financieras

1. Stripe se utiliza únicamente para la suscripción del software.
2. ICE24 OS no procesa pagos de pedidos de hielo.
3. ICE24 OS no timbra facturas fiscales.
4. La plataforma no conoce automáticamente el saldo físico real de las tarjetas.
5. Las ganancias de repartidor son estimaciones y no utilidad contable.
6. El plan definido es único: $399 MXN mensuales por cuenta, con usuarios, sucursales y máquinas ilimitados; el valor debe poder configurarse por ICE24.

### 10.4 Restricciones regulatorias y de comunicación

1. Los indicadores, reportes y portales deben presentarse como herramientas de gestión y evidencia documental.
2. No deben presentarse como certificación, autorización, dictamen o garantía de cumplimiento sanitario.
3. Los catálogos, límites, frecuencias y formatos sanitarios requieren validación de ICE24 y, cuando corresponda, asesoría sanitaria o jurídica antes de producción.
4. La información pública debe cumplir controles de privacidad y protección de datos personales.

## 11. Criterios de aceptación

### 11.1 Definición de terminado por módulo

Un módulo se considera terminado únicamente cuando cumple todos los criterios aplicables:

- flujos aprobados por negocio y diseño;
- permisos implementados y probados;
- estados, precondiciones y transiciones controlados;
- eventos sensibles auditados;
- manejo de errores y mensajes comprensibles;
- diseño responsivo validado en teléfono, tableta y computadora;
- funciones offline y sincronización probadas cuando correspondan;
- reportes y exportaciones comparados contra la vista previa;
- aislamiento de datos entre cuentas verificado;
- documentación técnica y manual operativo disponibles;
- catálogos y configuración inicial documentados;
- respaldos e integraciones probados;
- criterios funcionales del módulo satisfechos.

### 11.2 Criterios transversales

| ID | Criterio de aceptación |
|---|---|
| CA-TR-001 | Un usuario no puede consultar ni modificar datos fuera de sus cuentas, sucursales, máquinas y permisos. |
| CA-TR-002 | Cada transición valida permisos, precondiciones y datos obligatorios antes de completarse. |
| CA-TR-003 | Cada transición registra estado anterior, estado nuevo, actor, fecha, motivo y entidad. |
| CA-TR-004 | Una corrección conserva el valor anterior y presenta comparación con la versión vigente. |
| CA-TR-005 | Un registro anulado o retirado deja de afectar la operación correspondiente, pero permanece consultable según permiso. |
| CA-TR-006 | Cada acción sensible genera auditoría con resultado y correlación. |
| CA-TR-007 | Los datos “sin información” no se muestran como “conforme” ni “no conforme”. |
| CA-TR-008 | Los archivos privados no son accesibles mediante URL pública permanente. |
| CA-TR-009 | Las operaciones reintentadas por conectividad inestable no generan duplicados. |
| CA-TR-010 | Los datos offline se eliminan localmente cuando el usuario cierra sesión, es desactivado o cambia de dispositivo. |

### 11.3 Administración, identidad y organizaciones

| ID | Criterio de aceptación |
|---|---|
| CA-ADM-001 | ICE24 puede crear una cuenta y entregar credenciales temporales al propietario. |
| CA-ADM-002 | Una solicitud de equipo no puede activarse sin validación y plantilla. |
| CA-ADM-003 | Toda restricción registra actor, fecha, motivo, evidencia y estado. |
| CA-ID-001 | El sistema impide duplicar correos y nombres de usuario globales. |
| CA-ID-002 | Un usuario puede cambiar de contexto sin volver a iniciar sesión. |
| CA-ID-003 | El propietario puede administrar usuarios, permisos y sesiones de su cuenta. |
| CA-ID-004 | Un administrador sin permiso financiero no puede acceder a costos, ingresos o márgenes. |
| CA-ORG-001 | Una sucursal archivada conserva máquinas, documentos e historial. |
| CA-ORG-002 | El teléfono público configurado puede utilizarse en portal y mensajes de WhatsApp. |

### 11.4 Equipos y plantillas

| ID | Criterio de aceptación |
|---|---|
| CA-EQP-001 | El propietario puede iniciar el alta, pero no activar el equipo ni elegir plantilla. |
| CA-EQP-002 | El código del equipo no cambia por traslado o transferencia. |
| CA-EQP-003 | El cambio de sucursal conserva la línea de tiempo de ubicaciones. |
| CA-EQP-004 | La transferencia separa historial técnico/sanitario obligatorio e información comercial opcional. |
| CA-TPL-001 | Una máquina aprobada recibe sistemas y componentes según plantilla. |
| CA-TPL-002 | ICE24 puede consultar las máquinas afectadas antes de publicar una plantilla. |
| CA-TPL-003 | La nueva plantilla no modifica registros históricos. |
| CA-TPL-004 | La versión publicada registra autor, fecha, vigencia y cambios. |

### 11.5 Mantenimiento, sanidad y laboratorio

| ID | Criterio de aceptación |
|---|---|
| CA-MNT-001 | El técnico puede completar una orden previamente sincronizada sin internet. |
| CA-MNT-002 | No se cierra una orden sin diagnóstico, actividades, responsable y evidencia requerida. |
| CA-MNT-003 | Un componente consumido se descuenta del inventario y queda asociado con máquina y orden. |
| CA-MNT-004 | Una actividad vencida continúa vencida hasta que se complete realmente. |
| CA-MNT-005 | Una edición concurrente genera conflicto y no sobrescribe datos. |
| CA-SAN-001 | Las bitácoras se generan según modelo, componente y frecuencia oficial. |
| CA-SAN-002 | El propietario no puede reducir obligaciones ni límites sanitarios. |
| CA-SAN-003 | Toda corrección conserva versión anterior y vigente. |
| CA-SAN-004 | El panel separa estado sanitario, técnico y operativo. |
| CA-LAB-001 | El sistema no publica automáticamente un resultado no conforme. |
| CA-LAB-002 | Una no conformidad genera alerta crítica, ticket y acción correctiva. |
| CA-LAB-003 | Documento original y datos estructurados permanecen vinculados. |
| CA-LAB-004 | La reactivación exige formulario, evidencia y aceptación. |
| CA-LAB-005 | ICE24 puede volver a restringir después de una reactivación. |

### 11.6 Inventario y documentos

| ID | Criterio de aceptación |
|---|---|
| CA-INV-001 | Solo el propietario puede modificar costos, proveedores, transferencias y ajustes manuales. |
| CA-INV-002 | El técnico puede consultar existencias y registrar consumo ligado con su orden. |
| CA-INV-003 | La instalación inicia historial y próximo mantenimiento. |
| CA-INV-004 | Las piezas retiradas permanecen en historial con condición y disposición. |
| CA-DOC-001 | Todo archivo sensible tiene control de acceso y descarga protegida. |
| CA-DOC-002 | El sistema registra quién descargó, qué versión y cuándo. |
| CA-DOC-003 | Un documento retirado deja de estar público sin desaparecer del expediente privado. |
| CA-DOC-004 | La versión pública omite datos confidenciales definidos. |
| CA-DOC-005 | El hash permite verificar que el archivo no fue sustituido silenciosamente. |

### 11.7 Reportes y portal público

| ID | Criterio de aceptación |
|---|---|
| CA-RPT-001 | El propietario puede asignar permisos por tipo de reporte. |
| CA-RPT-002 | Los reportes programados se envían como PDF solo a usuarios registrados. |
| CA-RPT-003 | Las descargas sensibles se registran sin exigir una confirmación adicional al usuario. |
| CA-RPT-004 | Vista previa y PDF coinciden en contenido, orden, tablas, imágenes y marcas. |
| CA-RPT-005 | Una exportación expira a los siete días y registra sus descargas. |
| CA-PUB-001 | El QR continúa válido después de cambio de propietario o sucursal. |
| CA-PUB-002 | El público solo consulta versiones publicadas y protegidas. |
| CA-PUB-003 | El portal no expone costos, inventario, datos personales, firmas o comentarios internos. |
| CA-PUB-004 | La marca y leyenda aclaran que ICE24 OS no es certificación. |
| CA-PUB-005 | La publicación y el retiro generan auditoría. |

### 11.8 Ventas, tarjetas y negocios

| ID | Criterio de aceptación |
|---|---|
| CA-VTA-001 | No se importan ventas sin vista previa y confirmación. |
| CA-VTA-002 | Los duplicados identificados no se contabilizan nuevamente. |
| CA-VTA-003 | La anulación conserva archivo, actor, fecha, motivo y registros afectados. |
| CA-VTA-004 | Un nuevo formato de Excel puede configurarse sin reconstruir el sistema completo. |
| CA-TAR-001 | Una tarjeta no puede estar asignada a dos máquinas. |
| CA-TAR-002 | La reasignación no atribuye movimientos históricos al nuevo titular. |
| CA-TAR-003 | Los paneles no denominan el total administrativo como saldo real. |
| CA-NEG-001 | Un negocio usa una sola identidad aun con varios propietarios. |
| CA-NEG-002 | El negocio solo consulta máquinas y productos autorizados. |
| CA-NEG-003 | Una asociación nueva requiere aprobación del propietario. |
| CA-NEG-004 | Un propietario no puede ver relaciones comerciales de otro propietario. |

### 11.9 Pedidos y repartidores

| ID | Criterio de aceptación |
|---|---|
| CA-PED-001 | No se permite pedido sin restaurante asociado, máquina disponible, producto activo y repartidor elegible. |
| CA-PED-002 | Un pedido pertenece a un solo propietario, sucursal y máquina. |
| CA-PED-003 | La toma es atómica y evita dos repartidores responsables. |
| CA-PED-004 | La entrega registra evidencia y código de entrega. |
| CA-PED-005 | Después de Producto recogido, una cancelación requiere autorización o incidencia. |
| CA-PED-006 | Una entrega parcial conserva explicación y aceptación. |
| CA-DEL-001 | El repartidor puede operar máquinas de distintos propietarios con una identidad. |
| CA-DEL-002 | Cada relación repartidor–máquina conserva tarjeta y condiciones propias. |
| CA-DEL-003 | Un pedido tomado puede completarse offline y sincronizarse después. |
| CA-DEL-004 | La ubicación del repartidor solo se expone conforme a la relación y estado definidos. |
| CA-DEL-005 | La ganancia se presenta explícitamente como estimada. |

### 11.10 Alertas, suscripción, auditoría y PWA

| ID | Criterio de aceptación |
|---|---|
| CA-ALT-001 | Una alerta crítica no desaparece al ser leída. |
| CA-ALT-002 | Cada escalamiento registra destinatario, envío, lectura y confirmación. |
| CA-ALT-003 | La resolución se vincula con una actividad correctiva. |
| CA-SUB-001 | Un pago rechazado activa modo lectura inmediatamente. |
| CA-SUB-002 | La reactivación ocurre automáticamente al confirmar Stripe el pago. |
| CA-SUB-003 | En modo lectura no se crean reportes ni registros nuevos. |
| CA-SUB-004 | La cuenta demo expira a los 14 días salvo extensión de ICE24. |
| CA-AUD-001 | Cada acción sensible genera evento antes de mostrarse como completada. |
| CA-AUD-002 | La auditoría se filtra por usuario, cuenta, sucursal, máquina, fecha y tipo. |
| CA-AUD-003 | Los eventos de auditoría no pueden editarse o eliminarse por usuarios. |
| CA-PWA-001 | La aplicación se instala y abre en modo autónomo desde la pantalla principal. |
| CA-PWA-002 | Las actividades offline muestran estado de sincronización. |
| CA-PWA-003 | El cierre de sesión elimina datos locales sensibles. |
| CA-PWA-004 | Un conflicto conserva ambas versiones y queda pendiente de resolución. |

## 12. Riesgos

| ID | Riesgo | Impacto potencial | Mitigación prevista en el documento fuente |
|---|---|---|---|
| RSK-01 | Alcance integral amplio | Retraso, sobrecosto, dispersión y retrabajo. | Construcción por etapas, dependencias, criterios de aceptación y priorización. |
| RSK-02 | Falta de definición de MVP | Dificultad para establecer la primera liberación comercial y fecha objetivo. | Resolver durante Etapa 0 sin eliminar la visión integral. |
| RSK-03 | Regulación sanitaria cambiante o interpretada incorrectamente | Parámetros incorrectos, comunicación engañosa o riesgo legal. | Versionar parámetros y validar fuentes oficiales con asesoría sanitaria/jurídica. |
| RSK-04 | Plantillas operativas incompletas | Calendarios, bitácoras y alertas no representarán la operación real. | Completar catálogos y validar por modelo antes de producción. |
| RSK-05 | Datos incompletos | Indicadores o reportes ambiguos. | Distinguir Sin datos, Pendiente, No evaluable y No conforme. |
| RSK-06 | Saldo físico no integrado | Diferencias entre control administrativo y tarjeta real. | Advertencias explícitas y evitar el término saldo real. |
| RSK-07 | Formatos Excel variables | Fallas de importación o duplicados. | Vista previa, adaptadores configurables y validación con archivos reales. |
| RSK-08 | Complejidad offline | Conflictos, duplicados, pérdida de datos o exposición local. | Limitar funciones, asignar responsables, idempotencia y resolución explícita. |
| RSK-09 | Crecimiento de archivos | Aumento de costos, lentitud y reportes pesados. | Límites, compresión, almacenamiento de objetos y monitoreo. |
| RSK-10 | Privacidad del portal público | Exposición de datos personales o sanitarios sensibles. | Versiones públicas, publicación deliberada, marcas de agua y auditoría. |
| RSK-11 | Reportes PDF pesados | Fallas de generación o entrega por correo. | Optimizar imágenes, usar tareas asíncronas y definir estrategia de adjuntos. |
| RSK-12 | Permisos muy granulares | Configuración incorrecta o acceso excesivo. | Roles base, límites ICE24, pruebas de aislamiento y auditoría. |
| RSK-13 | Eventos de Stripe tardíos o duplicados | Bloqueo o reactivación incorrecta. | Idempotencia, correlación, logs de integración y fuente de verdad Stripe. |
| RSK-14 | Geolocalización denegada o inexacta | Recomendaciones y elegibilidad de reparto deficientes. | GPS como fuente principal, IP solo como respaldo y reglas de excepción por definir. |
| RSK-15 | Interpretación del portal como certificación | Riesgo reputacional o regulatorio. | Leyenda obligatoria y categorías cualitativas. |
| RSK-16 | Retención indefinida sin política formal | Costos, incumplimiento de privacidad o dificultad de eliminación legítima. | Definir política jurídica y técnica de retención antes de producción. |
| RSK-17 | Dependencia de múltiples integraciones | Interrupciones en cobro, correo, mapas, PDF o almacenamiento. | Logs, colas, reintentos, monitoreo y desacoplamiento. |
| RSK-18 | Datos ficticios de demo confundidos con producción | Decisiones o reportes incorrectos. | Crear cuenta productiva limpia al contratar. |

## 13. Supuestos

| ID | Supuesto |
|---|---|
| SUP-01 | ICE24 MX será propietario funcional de las plantillas oficiales, ponderaciones y reglas críticas. |
| SUP-02 | Los propietarios proporcionarán información verdadera y evidencia suficiente para altas, actividades y reactivaciones. |
| SUP-03 | Los equipos no ofrecerán inicialmente una API estable para ventas o saldo de tarjetas. |
| SUP-04 | Los usuarios de campo dispondrán de un navegador moderno con capacidades PWA y almacenamiento local. |
| SUP-05 | Los técnicos, operadores y repartidores sincronizarán previamente las actividades que necesiten ejecutar offline. |
| SUP-06 | Stripe será la fuente de verdad del estado de pago de la suscripción. |
| SUP-07 | El correo electrónico será un canal disponible para recuperación, alertas críticas y reportes. |
| SUP-08 | El propietario mantendrá actualizados teléfonos, ubicaciones, productos, precios, disponibilidad y usuarios. |
| SUP-09 | Los laboratorios y responsables sanitarios proporcionarán PDFs y datos suficientes para captura estructurada. |
| SUP-10 | La publicación pública siempre será una decisión expresa del propietario o ICE24, no una consecuencia automática de completar un registro. |
| SUP-11 | Los reportes públicos utilizarán versiones diferentes de los originales cuando existan datos sensibles. |
| SUP-12 | La operación inicial será en español, México, MXN y formato DD/MM/AAAA. |
| SUP-13 | La arquitectura utilizará base relacional, almacenamiento de objetos, tareas en cola y observabilidad, aunque el proveedor específico no está decidido. |
| SUP-14 | Un plan único comercial puede convivir con módulos habilitados o deshabilitados por cuenta. |
| SUP-15 | La información comercial transferible de una máquina podrá separarse técnicamente de su expediente técnico y sanitario. |
| SUP-16 | La disponibilidad de hielo será manual o aproximada, porque no existe inventario en tiempo real. |
| SUP-17 | Las ganancias y saldos derivados de movimientos capturados serán siempre estimaciones administrativas. |

## 14. Dependencias

### 14.1 Dependencias funcionales

| Capacidad | Dependencias obligatorias |
|---|---|
| Mantenimiento | Equipos, modelos, componentes, usuarios, permisos, archivos y auditoría. |
| Sanidad | Plantillas, documentos, alertas, estados del equipo y auditoría. |
| Laboratorio | Sanidad, documentos, parámetros, alertas, restricciones y reportes. |
| Inventario | Cuentas, sucursales, productos, proveedores, órdenes y permisos. |
| Reportes | Datos de módulos, permisos, archivos, plantilla PDF y tareas. |
| Portal público | Equipos, documentos, publicación, versiones públicas, QR y analítica. |
| Ventas | Equipos, archivos, adaptadores Excel, deduplicación, reportes y analítica. |
| Tarjetas | Equipos, usuarios, negocios, repartidores y auditoría. |
| Pedidos | Negocios, máquinas, productos, precios, repartidores, tarjetas, mapas y notificaciones. |
| Ganancias estimadas | Recargas, pedidos o ventas externas y reglas de costo. |
| Predicción | Historial suficiente, consistente y georreferenciado. |
| Offline | PWA, permisos, almacenamiento local, sincronización, conflictos y auditoría. |

### 14.2 Dependencias externas

- Stripe.
- Proveedor de correo transaccional.
- Proveedor de mapas y geolocalización.
- Almacenamiento de objetos.
- Motor de generación de PDF.
- Portal externo de capacitación.
- Archivos Excel de la aplicación independiente de la máquina.
- Validación sanitaria y jurídica de reglas y contenidos.

## 15. Preguntas abiertas

### 15.1 Producto, alcance y priorización

1. ¿Cuál es la primera liberación utilizable o MVP comercial? El documento define etapas, pero no establece si la primera salida requiere solo Etapa 1, Etapas 1–2 o alguna combinación.
2. ¿Qué módulos estarán habilitados por defecto para cada cuenta y cuáles podrá deshabilitar ICE24?
3. ¿Qué usuarios y flujos deben entrar en un piloto inicial?
4. ¿Qué métricas cuantitativas definirán éxito: adopción, actividades a tiempo, reducción de vencimientos, tiempo de resolución, uso de reportes, retención o ingresos?
5. ¿Qué datos existentes deben migrarse al lanzar y desde qué fuentes?

### 15.2 Identidad, roles y permisos

6. ¿Cuál es la matriz exacta de permisos base por rol?
7. ¿Qué permisos especiales puede delegar el propietario y cuáles permanecen reservados a ICE24?
8. ¿Qué evidencia y pasos requiere la recuperación manual cuando el usuario pierde acceso al correo?
9. ¿Debe 2FA ser opcional para todos o obligatorio para roles críticos?
10. ¿Qué ocurre con una asociación pendiente si el usuario no la acepta o rechaza?
11. ¿Un usuario puede tener más de un propietario principal o rol equivalente en cuentas diferentes?
12. ¿Qué información exacta puede consultar el rol Consulta/Auditor interno?

### 15.3 Cuentas, sucursales y equipos

13. ¿Cuáles son los criterios formales para validar equipos externos y asignarles una plantilla compatible?
14. ¿Qué evidencia es obligatoria para aprobar cada tipo de equipo?
15. ¿Cuándo se requiere videollamada y cuándo visita técnica?
16. ¿Qué formato, longitud y reglas tendrá el Código ICE24 OS visible?
17. ¿Cómo se resuelve una discrepancia entre número de serie físico y registros históricos?
18. ¿Qué datos comerciales se transfieren por defecto y cuál es el formato de autorización del propietario anterior?
19. ¿Qué consecuencias exactas tiene cada estado operativo: Suspendida, Retirada, Fuera de servicio o Apagada?
20. ¿La temperatura ambiental de referencia o las lecturas manuales generan alertas o solo contexto?

### 15.4 Plantillas, mantenimiento y sanidad

21. ¿Cuáles son las plantillas finales de mantenimiento por modelo, sistema y componente?
22. ¿Cuáles son las ventanas de aviso, frecuencias, criticidad y escalamiento de cada actividad?
23. El documento indica que todos los mantenimientos permiten y requieren evidencia fotográfica, pero no fija un mínimo general: ¿debe exigirse al menos una fotografía siempre o solo cuando la plantilla defina un tipo obligatorio?
24. ¿Qué tipos de firma serán válidos y en qué actividades se requieren?
25. ¿Quién puede revisar, aprobar o reabrir una orden completada?
26. ¿Qué reglas determinan el estado técnico resumido de una máquina?
27. ¿Cuáles son las bitácoras sanitarias finales, campos, unidades, límites y responsables?
28. ¿Qué ponderaciones y reglas exactas determinan el indicador sanitario?
29. ¿Qué no conformidades deben generar restricción automática y cuáles requieren decisión de ICE24?
30. ¿La reactivación del propietario restablece pedidos inmediatamente o queda pendiente de revisión de ICE24?
31. ¿Qué plazo y evidencia se requieren para cerrar una acción correctiva?
32. ¿Qué datos de los últimos 24 meses se muestran públicamente después de resolver una no conformidad?

### 15.5 Laboratorio, normativa y publicación

33. ¿Cuál es el catálogo definitivo de análisis, parámetros, unidades, límites y fuentes normativas?
34. ¿Cómo se gestionan resultados expresados como texto, rangos, “no detectado” o por debajo del límite de cuantificación?
35. ¿Quién valida la captura estructurada contra el PDF original?
36. ¿Qué información del laboratorio puede mostrarse públicamente además de su nombre?
37. ¿Qué documentos o resultados requieren revisión de ICE24 antes de que el propietario pueda publicarlos?
38. ¿Qué procedimiento se seguirá cuando una norma o límite cambie?
39. ¿Qué versión de aviso legal y aviso de privacidad debe aprobar asesoría jurídica?

### 15.6 Inventario y refacciones

40. ¿Cuál es el catálogo inicial de refacciones, consumibles, compatibilidades, costos y fotografías?
41. ¿Los técnicos pueden consultar costos o solo existencias y compatibilidad?
42. ¿Cómo se manejan unidades fraccionarias, conversiones y productos por lote?
43. ¿Qué ocurre cuando una orden necesita una pieza sin existencia registrada?
44. ¿Se requiere aprobación del propietario antes de confirmar consumo o solo auditoría posterior?
45. ¿Cuál será el flujo de seguimiento después de generar la solicitud de WhatsApp a ICE24?

### 15.7 Documentos, reportes y exportaciones

46. ¿Cuáles documentos y reportes se consideran sensibles para registrar descarga?
47. ¿Cuáles usuarios pueden descargar originales sin marca de agua?
48. ¿Qué datos se eliminan u ocultan en cada tipo de versión pública?
49. ¿Cuál es la política exacta de retención de documentos, fotografías, exportaciones y auditoría?
50. ¿Qué formatos estructurados incluirá una exportación completa?
51. ¿Cuál es el tamaño máximo de un reporte PDF y qué sucede si excede el límite de adjunto del correo?
52. ¿Se enviará enlace temporal en lugar de adjunto cuando un reporte sea grande?
53. ¿Qué zona horaria se utiliza para reportes que agrupan varias sucursales?
54. ¿Qué niveles de personalización estarán disponibles en la primera liberación de reportes?
55. ¿Cómo se verifica públicamente la autenticidad de un reporte o folio?

### 15.8 Portal público, QR y analítica pública

56. ¿Cuántas etiquetas físicas se imprimirán finalmente por equipo y cuáles dimensiones, materiales e impresoras se utilizarán?
57. ¿La “rama pública unificada” utiliza un solo QR con secciones o dos QRs que apuntan a rutas de una misma rama?
58. ¿Qué estado visible debe mostrarse cuando la máquina está restringida o fuera de servicio?
59. ¿Qué documentos anteriores a 24 meses pueden descargarse y quién autoriza su publicación?
60. ¿Qué mecanismo de consentimiento y privacidad se aplicará para analítica de ubicación aproximada de escaneos?
61. ¿Se aplicarán controles contra indexación por buscadores o acceso automatizado?

### 15.9 Ventas e importación de Excel

62. ¿Cuáles son las columnas y formatos reales por modelo o versión de la aplicación de la máquina?
63. ¿Qué llave de deduplicación se confirma después de revisar archivos reales?
64. ¿Cómo se manejan zonas horarias, cambios de horario, filas corregidas y transacciones sin identificador?
65. ¿Quién puede anular una importación y se requiere aprobación adicional?
66. ¿Qué volumen máximo de filas se espera por archivo y por cuenta?
67. ¿Cómo se corrigen errores parciales sin anular toda la importación?

### 15.10 Tarjetas, negocios, pedidos y reparto

68. ¿Cómo se captura o valida el saldo inicial administrativo de una tarjeta?
69. ¿Qué usuario puede corregir un movimiento de tarjeta y qué aprobación necesita?
70. ¿Cuál es la fórmula exacta de costo efectivo, bonificación y ganancia estimada?
71. ¿Qué datos del titular de tarjeta puede consultar cada rol?
72. ¿Qué flujo exacto se utiliza para solicitudes de factura y quién recibe los datos fiscales?
73. ¿Cómo se resuelven pedidos cuando la disponibilidad de hielo es solo aproximada?
74. ¿Qué radio, zonas y reglas determinan la elegibilidad de un repartidor?
75. ¿Qué sucede si el usuario niega la geolocalización o el GPS es impreciso?
76. ¿Cómo se genera, comparte y valida el código de entrega?
77. ¿Qué evidencias son válidas para entrega: fotografía, firma, geolocalización u otras?
78. ¿Quién autoriza una cancelación después de Producto recogido?
79. ¿Cómo se gestiona el pago del restaurante fuera de ICE24 OS y qué dato se registra en el pedido?
80. ¿Qué información de clientes de ventas externas permanece privada para el repartidor y qué puede consultar el propietario?
81. ¿Qué límites exactos puede modificar el repartidor en la tarifa de entrega?

### 15.11 Suscripción, seguridad y operación técnica

82. ¿Stripe realizará reintentos de cobro? Si los realiza, ¿el modo lectura sigue siendo inmediato desde el primer rechazo?
83. ¿Cómo se manejan periodos de gracia, contracargos, pagos pendientes y reembolsos?
84. ¿Qué ocurre con los datos de una cuenta cancelada y por cuánto tiempo se conservan?
85. ¿Cuál es el proceso para acuerdos especiales de precio sin crear planes distintos?
86. ¿Cuáles son los objetivos de disponibilidad, rendimiento, RPO y RTO?
87. ¿Cuáles navegadores y versiones mínimas deben soportarse?
88. ¿Qué estándar y nivel de accesibilidad se adoptará?
89. ¿Cuántas tareas, fotografías y días de trabajo offline deben soportarse por dispositivo?
90. ¿Cuál será la política de cifrado y protección del almacenamiento local?
91. ¿Qué proveedor y estrategia se usarán para detección de malware en archivos?
92. ¿Cuánto tiempo se conservarán logs técnicos y quién puede acceder a ellos?
93. ¿Qué eventos y umbrales generan alertas técnicas para el equipo de soporte?
94. ¿Qué arquitectura y stack seleccionará ingeniería después de comparar costo, seguridad, offline, mantenibilidad y crecimiento?

## 16. Funcionalidades futuras

Esta sección solo incluye capacidades mencionadas o justificadas expresamente en el documento fuente como etapas posteriores, opciones futuras o ampliaciones. No constituye compromiso de primera liberación.

### 16.1 Funcionalidades posteriores por roadmap

| Funcionalidad | Justificación en el documento | Etapa o condición |
|---|---|---|
| Ventas importadas y paneles comerciales | Forma parte del alcance integral, pero depende de fundamentos y archivos reales. | Etapa 4 |
| Tarjetas, recargas, bonificaciones y transferencias | Control administrativo posterior a ventas y activos. | Etapa 4 |
| Negocios y restaurantes | Requiere identidad, máquinas, productos y asociaciones. | Etapa 5 |
| Pedidos y reparto | Requiere negocios, productos, precios, tarjetas, mapas y notificaciones. | Etapa 5 |
| Ventas externas de repartidores | Captura opcional dentro del módulo de reparto. | Etapa 5 |
| Ganancias estimadas | Depende de recargas, pedidos o ventas externas y reglas de costo. | Etapa 6 |
| Mapas de calor | Requiere historial georreferenciado. | Etapa 6 |
| Predicción de demanda | Solo cuando exista historial suficiente y consistente. | Etapa 6 |
| Reportes avanzados y comparaciones | Evolución del módulo de resultados y analítica. | Etapa 6 |
| Ubicación de inventario por técnico o vehículo | Se menciona como ubicación futura opcional. | Futuro, sin etapa fijada |
| Soporte de video | Expansión de la política de archivos; fuera de primera versión. | Futuro |
| Variables de clima, festivos, eventos y estacionalidad | Posibles variables para predicción de demanda. | Futuro, condicionado a datos |
| Integración API con aplicación de máquina | El alcance inicial es Excel manual; una integración automática sería evolución posterior. | Futuro, no comprometido |

### 16.2 Mejoras continuas de plataforma

- endurecimiento de rendimiento y seguridad;
- accesibilidad;
- observabilidad y soporte;
- migraciones;
- optimización de almacenamiento y reportes;
- ampliación de adaptadores de Excel;
- ajustes de plantillas, catálogos y ponderaciones versionadas.

## 17. Modelo conceptual de información

### 17.1 Entidades principales

| Dominio | Entidades |
|---|---|
| Identidad | Usuario, credencial, sesión, 2FA, rol, permiso, asociación. |
| Organización | Cuenta, sucursal, contacto, datos fiscales, suscripción, demo. |
| Activos | Máquina, código, serie, modelo, sistema, componente, ubicación, transferencia. |
| Plantillas | Versión, actividad, frecuencia, checklist, límite, evidencia, escalamiento. |
| Operación | Mantenimiento, ticket, orden, bitácora, incidencia, acción correctiva. |
| Sanidad | Análisis, parámetro, resultado, laboratorio, no conformidad, restricción. |
| Inventario | Producto, proveedor, lote, almacén, movimiento, componente instalado o retirado. |
| Documentos | Archivo, versión, visibilidad, publicación, descarga, autenticidad. |
| Reportes | Plantilla, configuración, generación, programación, destinatario, envío. |
| Comercial | Venta importada, tarjeta, recarga, negocio, producto, precio, pedido, entrega. |
| Analítica | Indicador, fórmula, ponderación, versión, resultado, serie histórica. |
| Auditoría | Evento, actor, entidad, cambio, correlación, dispositivo, resultado. |

### 17.2 Relaciones críticas

- Una cuenta contiene múltiples sucursales y asociaciones de usuario.
- Una sucursal contiene múltiples máquinas y puede contener un almacén.
- Una máquina utiliza una versión de plantilla y contiene sistemas y componentes.
- Una persona puede mantener múltiples roles y asociaciones.
- Un restaurante puede relacionarse con máquinas de diferentes propietarios.
- Un repartidor puede relacionarse con varias máquinas, con tarjeta distinta por máquina.
- Un pedido se relaciona con restaurante, sucursal consumidora, propietario, sucursal operativa, máquina y repartidor final.
- Todo evento sensible se relaciona con actor, contexto y entidad afectada.

## 18. Catálogos de estados

| Entidad | Estados |
|---|---|
| Solicitud de equipo | Borrador → Enviada → En revisión → Información faltante → Validada/Rechazada → Activa |
| Mantenimiento | Programado → Próximo → En atención → Completado/Con observaciones → Vencido/No conforme → Corregido/Anulado |
| Documento | Borrador → Pendiente de revisión → Completado/No conforme → Corregido/Anulado |
| Publicación | Privado → Pendiente → Publicado → Retirado/Sustituido |
| Pedido | Creado → Disponible → Tomado → Recogiendo → Recogido → En ruta → Entregado → Cerrado |
| Pedido alterno | Cancelado · Liberado · Parcial · No entregado · Con incidencia |
| Alerta | No leída → Leída → Enterado → En atención → Resuelta |
| Suscripción | Demo → Pendiente → Activa → Pago rechazado → Modo lectura → Cancelada/Reactivada |
| Exportación | Solicitada → Preparando → Disponible → Descargada → Expirada/Error |
| Sincronización | Pendiente → Sincronizando → Cargada → Error → Conflicto → Resuelta |
| Estado operativo de máquina | Disponible · Apagada · En mantenimiento · Fuera de servicio · Suspendida · Retirada |
| Estado técnico de máquina | Óptimo · Atención preventiva · Atención requerida · Crítico |
| Estado sanitario de máquina | Al día · Próximo a vencer · Atención requerida · Acción correctiva · Restringido |

## 19. Integraciones

| Integración | Uso dentro de ICE24 OS | Límite confirmado |
|---|---|---|
| Stripe | Suscripción, eventos de pago, cancelación y reactivación. | No procesa pedidos ni timbra facturas. |
| Correo transaccional | Recuperación, alertas críticas, reportes y comunicaciones operativas definidas. | Proveedor no seleccionado. |
| Mapas/geolocalización | Cercanía, zonas, rutas aproximadas y tarifas. | GPS principal; IP solo respaldo. |
| Almacenamiento de objetos | Fotografías, PDFs, Excel y exportaciones. | Debe ser privado y con accesos temporales. |
| Generador PDF | Vista previa y documentos descargables. | Debe compartir plantilla con la vista previa. |
| Portal de capacitación | Redirección a una plataforma independiente. | Credenciales separadas. |
| Aplicación de máquina | Importación de ventas. | Excel manual en alcance inicial. |

## 20. Pruebas mínimas requeridas

| Tipo | Cobertura mínima |
|---|---|
| Funcionales | Casos felices, validaciones, permisos, estados, correcciones, anulaciones y restricciones. |
| Aislamiento | Intentos de acceso cruzado entre cuentas, sucursales, máquinas y propietarios. |
| Auditoría | Presencia, inmutabilidad y exactitud de actor, valores y resultado. |
| Offline | Cierre inesperado, reintento, fotos pendientes, pérdida de conexión y conflicto. |
| Archivos | Tamaño, tipo, integridad, análisis de seguridad, versión y descarga. |
| PDF | Consistencia con vista previa, tablas, saltos, marca de agua y folio. |
| Integraciones | Stripe, correo, mapas, almacenamiento y tareas programadas. |
| Rendimiento | Paneles, búsquedas, reportes, importaciones y carga de archivos bajo volumen esperado. |
| Seguridad | Autenticación, sesiones, 2FA, permisos, URLs temporales y exposición pública. |
| Recuperación | Restauración de respaldos y continuidad de archivos y datos relacionados. |

## 21. Leyenda obligatoria para reportes y portal público

> Documento generado mediante ICE24 OS, plataforma de gestión operativa, mantenimiento y control documental. La información mostrada corresponde a registros proporcionados y gestionados por el responsable del equipo. Este documento no constituye una certificación, autorización ni dictamen emitido por una autoridad sanitaria.

## 22. Glosario

| Término | Definición |
|---|---|
| ICE24 OS | Plataforma de gestión operativa, técnica, sanitaria, comercial y documental. |
| Cuenta titular | Persona física o moral que contrata la plataforma. |
| Código ICE24 OS | Identificador visible y permanente asignado al validar una máquina. |
| Plantilla | Configuración oficial versionada de modelo, componentes, actividades, límites y reglas. |
| Bitácora | Registro recurrente estructurado de una actividad operativa o sanitaria. |
| No conformidad | Resultado fuera de un criterio definido que requiere seguimiento. |
| Acción correctiva | Actividades y evidencias destinadas a atender una no conformidad. |
| Publicación | Acción explícita de hacer visible información en el portal público. |
| Control administrativo de tarjeta | Movimientos registrados en ICE24 OS que no equivalen a saldo físico confirmado. |
| PWA | Aplicación web progresiva instalable con capacidades offline controladas. |
| Auditoría | Registro inmutable de acciones y cambios de negocio. |
| Log técnico | Registro operativo de servicios, errores, rendimiento e integraciones. |
| Modo lectura | Estado de cuenta que permite consultar y descargar datos existentes, pero no crear o modificar. |
| Versión pública | Copia protegida de un documento que excluye información confidencial. |

## 23. Próximo entregable recomendado

Convertir este PRD en un backlog ejecutable compuesto por:

- épicas por etapa y dominio;
- historias refinadas y priorizadas;
- mapas de flujo y arquitectura de información;
- inventario de pantallas;
- diccionario de campos;
- reglas de validación;
- matriz de roles y permisos;
- criterios de aceptación en formato Given/When/Then;
- dependencias técnicas;
- estimación por etapa;
- plan de pruebas;
- decisiones de arquitectura de la Etapa 0.

---

**Fin del PRD — ICE24 OS v1.0**
