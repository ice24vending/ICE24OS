+-----------------------------------------------------------------------+
| **ICE24 OS**                                                          |
|                                                                       |
| **DOCUMENTO MAESTRO DE REQUERIMIENTOS\                                |
| FUNCIONALES Y ESTRUCTURALES**                                         |
|                                                                       |
| Sistema integral de gestión operativa, técnica, sanitaria, comercial  |
| y documental para máquinas vending de hielo y agua                    |
|                                                                       |
| **Versión 1.0 · Agosto 2026**                                         |
+=======================================================================+

+-----------------------------------------------------------------------+
| **PROPÓSITO DEL DOCUMENTO**                                           |
|                                                                       |
| Definir el alcance integral de ICE24 OS, sus módulos, usuarios,       |
| reglas de negocio, flujos, información, requisitos no funcionales,    |
| dependencias y orden recomendado de construcción. Este documento      |
| constituye la base común para negocio, diseño, arquitectura y         |
| desarrollo.                                                           |
+=======================================================================+

**CONFIDENCIAL**

Esta información es propiedad intelectual de ICE24 MX. Queda prohibida
su reproducción total o parcial sin autorización escrita.

# **0.1 Control del documento**

  -----------------------------------------------------------------------
  **Nombre**                          ICE24 OS --- Documento Maestro de
                                      Requerimientos Funcionales y
                                      Estructurales
  ----------------------------------- -----------------------------------
  **Versión**                         2026-V1.0

  **Estado**                          Documento base para validación de
                                      negocio, definición técnica y
                                      planeación del desarrollo

  **Propietario**                     ICE24 MX

  **Audiencia**                       Dirección de ICE24, ingeniería de
                                      software, diseño UX/UI,
                                      responsables técnicos, responsables
                                      sanitarios y operación

  **Alcance temporal**                Diseño integral del producto;
                                      construcción por etapas

  **Idioma y mercado inicial**        Español, México, pesos mexicanos,
                                      formato de fecha DD/MM/AAAA
  -----------------------------------------------------------------------

## **Cómo utilizar este documento**

- **Negocio:** valida que los procesos, permisos y reglas correspondan a
  la operación real de ICE24.

- **Ingeniería:** lo utiliza para proponer arquitectura, modelo de
  datos, integraciones, estimaciones y secuencia de construcción.

- **Diseño UX/UI:** lo convierte en arquitectura de información, flujos
  y pantallas consistentes.

- **Calidad:** deriva casos de prueba y criterios de aceptación por
  módulo.

- **Operación:** define plantillas, catálogos, bitácoras, parámetros,
  permisos y contenido que deberá cargarse.

+-----------------------------------------------------------------------+
| **Criterio rector**                                                   |
|                                                                       |
| Todos los módulos quedan contemplados y documentados desde el inicio. |
| La implementación se realizará por etapas para respetar dependencias, |
| reducir retrabajo y permitir entregas verificables.                   |
+=======================================================================+

# **0.2 Contenido**

  -----------------------------------------------------------------------
  **Secciones 1--17**                 **Secciones 18--Anexos**
  ----------------------------------- -----------------------------------
  1\. Contexto, visión y alcance      2\. Principios rectores del
                                      producto

  3\. Usuarios, identidad y permisos  4\. Arquitectura de información y
                                      activos

  5\. Mapa maestro de módulos         6\. Reglas transversales de negocio

  7\. Administración central de ICE24 8\. Cuentas, sucursales, usuarios y
                                      asociaciones

  9\. Equipos: alta, validación,      10\. Modelos, sistemas, componentes
  identidad y transferencias          y plantillas

  11\. Mantenimiento, tickets y       12\. Control sanitario y bitácoras
  órdenes de trabajo                  

  13\. Análisis de laboratorio y no   14\. Inventario, refacciones y
  conformidades                       consumibles

  15\. Documentos, evidencias,        16\. Reportes y exportaciones
  versiones y publicación             

  17\. Portal público, etiquetas y    18\. Ventas e importación de Excel
  códigos QR                          

  19\. Tarjetas, recargas y control   20\. Negocios, restaurantes y datos
  administrativo                      fiscales

  21\. Productos, precios y           22\. Pedidos de hielo
  disponibilidad                      

  23\. Repartidores y entregas        24\. Analítica e indicadores

  25\. Notificaciones, alertas y      26\. Suscripción, Stripe y cuenta
  escalamiento                        demo

  27\. Auditoría y logs               28\. PWA, offline, seguridad y
                                      archivos

  29\. Integraciones y decisiones     30\. Modelo conceptual de datos
  tecnológicas                        

  31\. Catálogo de estados            32\. Orden de construcción

  33\. Criterios de aceptación y      34\. Riesgos, supuestos e
  definición de terminado             información pendiente

  A. Anexos y referencias             .
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **01**                                                                |
|                                                                       |
| **Contexto, visión y alcance**                                        |
|                                                                       |
| Por qué existe ICE24 OS y qué resultado debe producir.                |
+=======================================================================+

## **Contexto de negocio**

ICE24 es una empresa mexicana enfocada en soluciones automatizadas de
producción y venta de hielo purificado mediante máquinas vending,
incluyendo modelos de hielo y modelos combinados de hielo y agua. La
propuesta de ICE24 OS surge como extensión natural del acompañamiento
postventa: convertir el mantenimiento, el cumplimiento documental, la
operación, la trazabilidad y la relación comercial en procesos digitales
estandarizados.

En la operación actual, buena parte de la información puede quedar
dispersa entre manuales, archivos, fotografías, mensajes, aplicaciones
independientes, bitácoras físicas y conocimiento de las personas. ICE24
OS deberá consolidar esa información alrededor de cada equipo, sin
depender de que un usuario recuerde fechas, formatos o procedimientos.

## **Definición del producto**

+-----------------------------------------------------------------------+
| **DEFINICIÓN**                                                        |
|                                                                       |
| ICE24 OS es una plataforma web privada, instalable como aplicación    |
| web progresiva, que administra el ciclo de vida de máquinas vending   |
| de hielo y agua: identidad del equipo, mantenimiento, control         |
| sanitario, documentos, inventario, reportes, ventas importadas,       |
| tarjetas, clientes comerciales, pedidos y reparto.                    |
+=======================================================================+

## **Problemas que resuelve**

- Falta de un expediente único y trazable por máquina.

- Mantenimientos y obligaciones que dependen de recordatorios manuales.

- Bitácoras no estandarizadas o difíciles de presentar durante una
  revisión.

- Documentos de laboratorio y evidencias sin captura estructurada.

- Inventarios de refacciones y consumibles sin relación con los
  servicios realizados.

- Información de ventas difícil de analizar desde los archivos de la
  aplicación del equipo.

- Recargas de tarjetas físicas sin bitácora administrativa común.

- Pedidos y entregas sin una relación formal entre propietario, máquina,
  restaurante y repartidor.

- Falta de auditoría sobre cambios, descargas, publicaciones y
  decisiones críticas.

## **Objetivos**

  -----------------------------------------------------------------------
  **Objetivo**                        **Resultado esperado**
  ----------------------------------- -----------------------------------
  Control operativo                   El propietario conoce el estado de
                                      sus sucursales, máquinas,
                                      pendientes, alertas e inventarios.

  Estandarización                     Cada modelo y componente activa
                                      plantillas, mantenimientos y
                                      bitácoras oficiales definidas por
                                      ICE24.

  Trazabilidad                        Toda actividad relevante conserva
                                      responsable, fecha, evidencia,
                                      versión y motivo de corrección.

  Control sanitario documental        La información se organiza en
                                      bitácoras, análisis, documentos,
                                      alertas y acciones correctivas.

  Continuidad técnica                 Los mantenimientos, fallas, piezas
                                      instaladas y piezas retiradas
                                      forman el historial del equipo.

  Inteligencia comercial              Los archivos de ventas y los
                                      pedidos se transforman en paneles y
                                      reportes útiles.

  Ecosistema                          Propietarios, técnicos, operadores,
                                      restaurantes y repartidores
                                      trabajan con una identidad única y
                                      permisos controlados.
  -----------------------------------------------------------------------

## **Alcance integral**

El producto se diseña desde el inicio para incluir todos los módulos
descritos en este documento. El orden de construcción no representa una
eliminación de alcance: representa una secuencia técnica para construir
primero los fundamentos y después las funciones que dependen de ellos.

## **Fuera de alcance o límites del producto**

- ICE24 OS no controla físicamente la máquina ni reemplaza la aplicación
  remota original del fabricante.

- ICE24 OS no conoce automáticamente el saldo real de las tarjetas
  físicas; conserva un control administrativo de movimientos
  registrados.

- ICE24 OS no procesa el pago de pedidos de hielo. Stripe se utilizará
  únicamente para la suscripción del software.

- ICE24 OS no timbra facturas fiscales; almacena datos fiscales y puede
  registrar una solicitud de factura.

- ICE24 OS no constituye certificación, autorización o dictamen de una
  autoridad sanitaria.

- El portal externo de capacitación utiliza otra plataforma, usuario y
  contraseña; ICE24 OS solo incluirá un acceso de redirección.

- El accesorio Brain y su plataforma quedan fuera de este alcance
  actual.

## **Marco normativo de referencia**

El diseño del módulo sanitario deberá alinearse con la regulación
mexicana aplicable a agua y hielo para consumo humano, buenas prácticas
de higiene, trámites de establecimientos y protección de datos
personales. Los catálogos, límites, frecuencias y formatos deberán ser
validados por ICE24 y, cuando corresponda, por asesoría sanitaria o
jurídica antes de liberarse en producción.

  -----------------------------------------------------------------------
  **Referencia**                      **Uso dentro del producto**
  ----------------------------------- -----------------------------------
  NOM-201-SSA1-2015                   Referencia principal para agua y
                                      hielo de consumo humano, incluyendo
                                      máquinas automáticas,
                                      especificaciones y control
                                      sanitario.

  NOM-251-SSA1-2009                   Referencia para prácticas de
                                      higiene, limpieza, mantenimiento,
                                      personal, plagas y registros.

  Guías de autoverificación de        Apoyo para estructurar listas de
  COFEPRIS                            control y expedientes documentales.

  Aviso de funcionamiento aplicable   Registro y vencimiento documental
                                      según el tipo de establecimiento y
                                      situación.

  Ley Federal de Protección de Datos  Privacidad, avisos, finalidades,
  Personales en Posesión de los       control de acceso y protección de
  Particulares                        datos personales.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **AVISO LEGAL DEL PRODUCTO**                                          |
|                                                                       |
| Los indicadores, portales y reportes deben identificarse como         |
| herramientas de gestión y evidencia documental. Nunca deben           |
| presentarse como certificación oficial, autorización sanitaria o      |
| garantía de cumplimiento.                                             |
+=======================================================================+

+-----------------------------------------------------------------------+
| **02**                                                                |
|                                                                       |
| **Principios rectores del producto**                                  |
|                                                                       |
| Reglas de diseño que deben mantenerse en todas las decisiones         |
| funcionales y técnicas.                                               |
+=======================================================================+

  -----------------------------------------------------------------------
  **Principio**                       **Implicación**
  ----------------------------------- -----------------------------------
  Privado por diseño                  La plataforma no permite registro
                                      público libre. ICE24 crea o valida
                                      las cuentas principales y aprueba
                                      los equipos.

  Equipo como eje                     La identidad técnica y sanitaria
                                      gira alrededor del equipo, no del
                                      propietario temporal.

  Plantillas oficiales                Los modelos, componentes,
                                      mantenimientos, límites y bitácoras
                                      oficiales son controlados y
                                      versionados por ICE24.

  Trazabilidad antes que conveniencia Las correcciones, anulaciones,
                                      transferencias y reactivaciones
                                      conservan historia y motivo.

  Identidad única                     Cada persona utiliza una sola
                                      cuenta y se asocia con distintos
                                      roles, propietarios, sucursales o
                                      máquinas.

  Permisos mínimos                    El usuario solo accede a las
                                      organizaciones, sucursales, equipos
                                      y acciones que le fueron
                                      autorizados.

  Offline controlado                  El trabajo sin conexión se limita a
                                      actividades previamente
                                      sincronizadas; los conflictos
                                      requieren revisión.

  Publicación deliberada              La información interna no se
                                      publica automáticamente. Operación
                                      y visibilidad pública son estados
                                      separados.

  Alertas accionables                 Cada alerta debe indicar
                                      responsable, prioridad, fecha,
                                      escalamiento y acción requerida.

  Un solo diseño                      La experiencia debe sentirse
                                      limpia, consistente y construida
                                      como un solo producto, sin módulos
                                      visualmente desconectados.

  Datos reutilizables                 La información se captura de forma
                                      estructurada para alimentar
                                      reportes, indicadores y auditoría,
                                      no solo como archivos adjuntos.

  Arquitectura extensible             Todos los módulos se contemplan en
                                      el modelo de datos, aunque su
                                      liberación sea gradual.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **03**                                                                |
|                                                                       |
| **Usuarios, identidad y permisos**                                    |
|                                                                       |
| Una sola identidad; múltiples relaciones y funciones controladas.     |
+=======================================================================+

## **Modelo de identidad**

El usuario existe una sola vez en ICE24 OS. Su correo electrónico y
nombre de usuario son únicos a nivel global. Las capacidades que observa
dependen de sus asociaciones y permisos, no de crear cuentas duplicadas.

+-----------------------------------------------------------------------+
| **EJEMPLO**                                                           |
|                                                                       |
| Una misma persona puede ser propietario de una cuenta, operador de    |
| una sucursal, técnico de una máquina y repartidor de otra. Utiliza un |
| solo inicio de sesión y el sistema organiza sus contextos de acceso.  |
+=======================================================================+

## **Inicio de sesión y recuperación**

- Acceso mediante nombre de usuario o correo electrónico y contraseña.

- Contraseña temporal inicial y cambio obligatorio en el primer acceso.

- Recuperación de contraseña por correo electrónico.

- Si el usuario pierde acceso al correo, ICE24 realizará verificación
  manual antes de restablecerlo.

- El propietario puede cerrar sesiones de usuarios de su cuenta; ICE24
  puede cerrar sesiones globalmente.

- El propietario no puede cambiar directamente el correo de otro
  usuario.

- Autenticación de dos factores opcional para quien decida activarla.

## **Roles base**

  -----------------------------------------------------------------------
  **Rol**                             **Responsabilidad principal**
  ----------------------------------- -----------------------------------
  Superadministrador ICE24            Control global, seguridad,
                                      suscripciones y configuración
                                      crítica.

  Administrador técnico ICE24         Modelos, componentes,
                                      mantenimientos, restricciones
                                      técnicas y validaciones.

  Administrador sanitario ICE24       Plantillas sanitarias, límites,
                                      análisis, restricciones y
                                      publicaciones críticas.

  Personal ICE24                      Soporte y operación con permisos
                                      específicos.

  Propietario principal               Control completo de su cuenta,
                                      sucursales, equipos, usuarios,
                                      precios, inventario y
                                      publicaciones.

  Administrador del cliente           Gestión delegada; puede recibir
                                      permisos especiales como
                                      reactivación.

  Encargado de sucursal               Consulta y operación de sucursales
                                      asignadas, sin modificar
                                      información financiera o
                                      estructural salvo permiso.

  Operador                            Completa bitácoras, registra
                                      actividades e incidencias.

  Técnico                             Atiende órdenes, mantenimientos,
                                      componentes y evidencias.

  Responsable sanitario               Consulta y gestiona controles
                                      sanitarios según permisos.

  Repartidor                          Ve y toma pedidos de máquinas
                                      asociadas con tarjeta activa.

  Administrador de negocio consumidor Gestiona usuarios y sucursales de
                                      su negocio, sin autoasociarse con
                                      nuevas máquinas.

  Usuario de restaurante              Crea pedidos y consulta pedidos
                                      asociados.

  Consulta/Auditor interno            Solo lectura sobre información
                                      autorizada.
  -----------------------------------------------------------------------

## **Permisos**

Los permisos deben aplicarse en cuatro dimensiones: organización,
sucursal, máquina y acción. Un rol ofrece una base, pero el propietario
puede ajustar permisos individuales dentro de los límites establecidos
por ICE24.

- **Ámbito:** toda la cuenta, sucursales específicas o máquinas
  específicas.

- **Módulo:** mantenimiento, sanidad, inventario, reportes, ventas,
  pedidos, etc.

- **Acción:** ver, crear, editar, corregir, aprobar, publicar,
  descargar, restringir o administrar.

- **Datos sensibles:** costos, ingresos, márgenes, documentos
  sanitarios, información personal y auditoría.

+-----------------------------------------------------------------------+
| **04**                                                                |
|                                                                       |
| **Arquitectura de información y activos**                             |
|                                                                       |
| La jerarquía que organiza todo el producto.                           |
+=======================================================================+

![Jerarquía conceptual de cuenta, sucursales, máquinas, sistemas,
componentes y evidencias en ICE24
OS.](media/image1.png "Jerarquía conceptual de cuenta, sucursales, máquinas, sistemas, componentes y evidencias en ICE24 OS."){width="7.0in"
height="3.546666666666667in"}

## **Jerarquía principal**

- Cuenta titular: persona física o empresa que contrata ICE24 OS.

- Sucursal: ubicación operativa con dirección, zona horaria, teléfono
  público y variables ambientales.

- Máquina: activo físico identificado con código ICE24 OS y número de
  serie del fabricante.

- Sistema: conjunto funcional como producción de hielo, purificación,
  pagos, empaque o dispensado.

- Componente: pieza o consumible sujeto a mantenimiento, sustitución o
  inspección.

- Actividad: mantenimiento, bitácora, análisis, ticket, inspección o
  acción correctiva.

- Evidencia: fotografía, PDF, Excel, firma, lectura, lote o comentario
  que demuestra la actividad.

## **Reglas de pertenencia y transferencia**

  -----------------------------------------------------------------------
  **Elemento**                        **Regla**
  ----------------------------------- -----------------------------------
  Código ICE24 OS del equipo          Permanente, único e inmutable.

  Número de serie del fabricante      Se conserva durante la vida física
                                      del equipo.

  Propietario                         Puede cambiar mediante
                                      transferencia controlada por ICE24.

  Sucursal y ubicación                Pueden cambiar; el historial de
                                      ubicaciones se conserva.

  Historial técnico y sanitario       Se transfiere obligatoriamente con
                                      el equipo.

  Ventas, clientes, recargas y        La transferencia es opcional y
  pedidos                             requiere autorización documentada.

  Modelo y plantilla                  Solo ICE24 puede asignar o corregir
                                      la plantilla oficial.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **05**                                                                |
|                                                                       |
| **Mapa maestro de módulos**                                           |
|                                                                       |
| Vista completa del ecosistema y de sus dependencias.                  |
+=======================================================================+

![Mapa maestro de módulos y bloques funcionales de ICE24
OS.](media/image2.png "Mapa maestro de módulos y bloques funcionales de ICE24 OS."){width="7.0in"
height="4.59375in"}

## **Bloques del sistema**

  -----------------------------------------------------------------------
  **Bloque**                          **Módulos**
  ----------------------------------- -----------------------------------
  Gobierno y plataforma               Administración ICE24, identidad,
                                      permisos, suscripción, seguridad,
                                      auditoría y configuración.

  Activos y operación                 Cuentas, sucursales, equipos,
                                      modelos, sistemas, componentes y
                                      transferencias.

  Control principal                   Mantenimiento, tickets, bitácoras,
                                      sanidad, laboratorio e inventario.

  Documentación y confianza           Archivos, versiones, reportes,
                                      etiquetas, portal público, QR y
                                      autenticidad.

  Comercio y distribución             Ventas Excel, tarjetas, recargas,
                                      restaurantes, productos, pedidos y
                                      repartidores.

  Inteligencia                        Indicadores técnicos y sanitarios,
                                      ventas, márgenes, mapas de calor y
                                      predicción.
  -----------------------------------------------------------------------

## **Capacidades transversales**

- Notificaciones y escalamiento.

- Auditoría y logs.

- Permisos y seguridad.

- PWA, offline y sincronización.

- Documentos, archivos y versiones.

- Reportes, descargas y exportación.

- Integraciones con Stripe, correo y mapas.

+-----------------------------------------------------------------------+
| **06**                                                                |
|                                                                       |
| **Reglas transversales de negocio**                                   |
|                                                                       |
| Criterios que afectan a varios módulos.                               |
+=======================================================================+

## **Reglas generales**

  -----------------------------------------------------------------------
  **Regla**                           **Comportamiento**
  ----------------------------------- -----------------------------------
  Registro privado                    No existe registro público libre de
                                      propietarios o equipos.

  Alta de equipo                      El propietario puede iniciar la
                                      solicitud; ICE24 valida y activa.

  Plantillas                          No son personalizables por el
                                      propietario; las actualizaciones
                                      oficiales son obligatorias y
                                      automáticas.

  Actividades vencidas                Permanecen vencidas hasta su
                                      ejecución real; no se borran por
                                      reprogramar.

  Correcciones                        Requieren motivo y conservan valor
                                      anterior, usuario, fecha y versión.

  Publicación                         Estado operativo y visibilidad
                                      pública son independientes.

  No conformidad                      No se publica automáticamente;
                                      genera alerta y acción correctiva.

  Reactivación                        Propietario o administrador
                                      autorizado completa formulario;
                                      ICE24 puede volver a restringir.

  Datos                               No se eliminan normalmente; se
                                      archivan, anulan, retiran o
                                      desactivan.

  Marca                               Reportes y portales utilizan ICE24
                                      OS y aclaran que es software de
                                      gestión.

  Suscripción                         Un solo plan de \$399 MXN,
                                      máquinas, sucursales y usuarios
                                      ilimitados.

  Pago rechazado                      La cuenta pasa inmediatamente a
                                      modo lectura y se reactiva
                                      automáticamente con pago
                                      confirmado.
  -----------------------------------------------------------------------

## **Estados independientes del equipo**

  -----------------------------------------------------------------------
  **Dimensión**           **Estados base**        **Efecto**
  ----------------------- ----------------------- -----------------------
  Operativo               Disponible, apagada, en Define disponibilidad
                          mantenimiento, fuera de general y exposición
                          servicio, suspendida,   para pedidos.
                          retirada                

  Técnico                 Óptimo, atención        Resume salud técnica y
                          preventiva, atención    mantenimientos.
                          requerida, crítico      

  Sanitario               Al día, próximo a       Resume controles,
                          vencer, atención        análisis y riesgos
                          requerida, acción       sanitarios.
                          correctiva, restringido 
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **07**                                                                |
|                                                                       |
| **Administración central de ICE24**                                   |
|                                                                       |
| Panel de gobierno, configuración, validación y soporte global.        |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Permitir que ICE24 gobierne el
                                      ecosistema completo, sin mezclar
                                      funciones de negocio del cliente
                                      con funciones internas de
                                      plataforma.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Superadministrador, administrador
                                      técnico, administrador sanitario,
                                      soporte, administración comercial.

  **Dependencias**                    Identidad, permisos, auditoría,
                                      suscripción.

  **Etapa sugerida**                  Etapa 1 --- Fundacional
  -----------------------------------------------------------------------

## **Funciones principales**

- Panel global de cuentas, demos, equipos, suscripciones, alertas y
  restricciones.

- Creación de cuentas titulares y del propietario principal.

- Administración de roles internos y permisos especiales.

- Validación de solicitudes de equipos mediante documentos y
  fotografías.

- Asignación del código ICE24 OS del equipo y de la plantilla oficial.

- Creación y versionado de modelos, componentes, mantenimientos,
  bitácoras, límites sanitarios e indicadores.

- Aplicación de restricciones técnicas o sanitarias con motivo,
  evidencia y condiciones para levantarlas.

- Gestión de demos, extensión de vigencia y conversión a una cuenta
  productiva limpia.

- Consulta de auditoría global, logs de integraciones y actividad
  pública de QR.

- Habilitación o deshabilitación funcional de módulos por cuenta sin
  crear planes comerciales distintos.

## **Paneles requeridos**

  -----------------------------------------------------------------------
  **Panel**                           **Contenido mínimo**
  ----------------------------------- -----------------------------------
  Operación global                    Cuentas activas, modo lectura,
                                      demos, equipos activos,
                                      restricciones y alertas críticas.

  Validaciones                        Solicitudes de alta, documentos
                                      faltantes, responsable, estatus y
                                      resolución.

  Plantillas                          Modelos, versiones, fecha de
                                      vigencia, cambios y máquinas
                                      afectadas.

  Suscripciones                       Estado Stripe, próximo cobro, pago
                                      rechazado, cancelación y
                                      reactivación.

  Auditoría                           Eventos sensibles, filtros por
                                      cuenta, usuario, máquina, fecha y
                                      tipo.
  -----------------------------------------------------------------------

## **Restricciones**

  -----------------------------------------------------------------------
  **Tipo**                **Consecuencia**        **Quién puede
                                                  aplicarla**
  ----------------------- ----------------------- -----------------------
  Técnica                 Bloquea pedidos;        ICE24 con permiso
                          permite mantenimiento y técnico.
                          documentación.          

  Sanitaria               Bloquea pedidos, activa ICE24 con permiso
                          estado crítico y exige  sanitario.
                          acción correctiva.      
  -----------------------------------------------------------------------

### **Criterios de aceptación funcional**

> **☐** ICE24 puede crear una cuenta y entregar credenciales temporales
> al propietario.
>
> **☐** Una solicitud de equipo no puede activarse sin validación y
> plantilla.
>
> **☐** Toda restricción registra actor, fecha, motivo, evidencia y
> estado.
>
> **☐** Las acciones administrativas sensibles aparecen en auditoría
> global.

---

+-----------------------------------------------------------------------+
| **08**                                                                |
|                                                                       |
| **Cuentas, sucursales, usuarios y asociaciones**                      |
|                                                                       |
| Estructura organizacional y acceso multiempresa.                      |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Representar personas físicas o
                                      empresas titulares, sus sucursales,
                                      usuarios y relaciones con terceros.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            ICE24, propietario,
                                      administradores, usuarios de
                                      cuenta, restaurantes, técnicos y
                                      repartidores.

  **Dependencias**                    Administración central e identidad.

  **Etapa sugerida**                  Etapa 1 --- Fundacional
  -----------------------------------------------------------------------

## **Cuenta titular**

- Puede ser persona física o persona moral.

- Un solo plan incluye usuarios, sucursales y máquinas ilimitadas.

- Tiene zona horaria principal, datos de contacto, datos fiscales y
  configuración de módulos.

- El propietario principal puede crear perfiles y asignar permisos de su
  responsabilidad.

## **Sucursal**

- Nombre, dirección, coordenadas, zona horaria, horario y teléfono
  público.

- Teléfono opcional del propietario, visible solo cuando este lo
  autorice.

- Temperatura ambiental de referencia y lecturas manuales opcionales.

- Una sucursal puede contener una o varias máquinas y un almacén local.

- Puede archivarse sin eliminar su historial.

## **Asociaciones globales**

Cuando el correo o nombre de usuario ya existe, no se crea una cuenta
duplicada. El sistema envía una solicitud de asociación al usuario
existente. Este principio aplica a repartidores, técnicos, responsables
sanitarios, restaurantes y empresas consumidoras.

  -----------------------------------------------------------------------
  **Relación**                        **Regla**
  ----------------------------------- -----------------------------------
  Usuario--cuenta                     Un usuario puede pertenecer a
                                      varias cuentas con distintos roles.

  Usuario--sucursal                   El acceso puede limitarse a
                                      sucursales específicas.

  Usuario--máquina                    El acceso técnico, sanitario o
                                      comercial puede limitarse por
                                      equipo.

  Restaurante--máquina                Un negocio puede asociarse con
                                      máquinas de distintos propietarios.

  Repartidor--máquina                 Requiere relación activa y tarjeta
                                      exclusiva de esa máquina.
  -----------------------------------------------------------------------

### **Criterios de aceptación funcional**

> **☐** El sistema impide duplicar correos y nombres de usuario
> globales.
>
> **☐** Un usuario puede cambiar de contexto sin volver a iniciar
> sesión.
>
> **☐** El propietario controla usuarios, permisos y cierre de sesiones
> de su cuenta.
>
> **☐** El teléfono público de la sucursal puede utilizarse en el portal
> QR y mensajes de WhatsApp.

---

+-----------------------------------------------------------------------+
| **09**                                                                |
|                                                                       |
| **Equipos: alta, validación, identidad y transferencias**             |
|                                                                       |
| Ciclo de vida físico y digital de cada máquina.                       |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Crear un expediente permanente y
                                      verificable por equipo, incluyendo
                                      máquinas ICE24, marcas privadas y
                                      purificadoras externas validadas.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            ICE24, propietario, administrador,
                                      técnico.

  **Dependencias**                    Cuentas, sucursales, modelos y
                                      documentos.

  **Etapa sugerida**                  Etapa 1 --- Fundacional
  -----------------------------------------------------------------------

## **Tipos de equipo contemplados**

- ICE24 450 kg --- hielo.

- ICE24 450 kg + agua.

- ICE24 900 kg --- hielo.

- Purificadora vending de agua.

- Equipos externos validados y asociados con una plantilla compatible.

- Equipos ICE24 con marca comercial del cliente.

## **Flujo de alta**

1.  El propietario crea una solicitud en borrador.

2.  Captura fabricante, modelo, serie, ubicación, capacidad,
    componentes, fotografías, manuales y mantenimiento previo.

3.  Envía la solicitud a ICE24.

4.  ICE24 elige validación documental, fotografías adicionales,
    videollamada o visita técnica cuando se requiera.

5.  ICE24 asigna la plantilla correcta y aprueba o rechaza.

6.  El sistema genera el Código ICE24 OS del equipo y las etiquetas.

7.  La máquina queda activa y genera sus calendarios iniciales.

## **Campos principales**

  -----------------------------------------------------------------------
  **Categoría**                       **Datos**
  ----------------------------------- -----------------------------------
  Identidad                           Código ICE24 OS, serie de
                                      fabricante, fabricante, modelo
                                      técnico, marca comercial, nombre
                                      interno.

  Ubicación                           Cuenta, sucursal, dirección,
                                      coordenadas, fecha de instalación,
                                      temperatura de referencia.

  Capacidad                           Producción y almacenamiento
                                      nominal; modificación reservada a
                                      ICE24.

  Configuración                       Tamaño de cubo, presentaciones,
                                      sistema de pagos, componentes y
                                      accesorios permitidos.

  Documentos                          Manual, factura, garantía,
                                      fotografías, certificados y
                                      validación.

  Estado                              Operativo, técnico, sanitario,
                                      suscripción y publicación.
  -----------------------------------------------------------------------

## **Transferencia**

La transferencia entre cuentas es ejecutada por ICE24. El código, la
serie física y el historial técnico y sanitario permanecen. La
información comercial puede transferirse de manera opcional con
autorización documentada del propietario anterior.

### **Criterios de aceptación funcional**

> **☐** El propietario puede iniciar el alta, pero no activar ni elegir
> una plantilla oficial.
>
> **☐** El código del equipo no cambia por traslado o venta.
>
> **☐** El cambio de sucursal conserva la línea de tiempo de
> ubicaciones.
>
> **☐** Las transferencias separan historial técnico obligatorio e
> información comercial opcional.

---

+-----------------------------------------------------------------------+
| **10**                                                                |
|                                                                       |
| **Modelos, sistemas, componentes y plantillas**                       |
|                                                                       |
| Configuración maestra que convierte un modelo en actividades          |
| concretas.                                                            |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Definir qué contiene cada modelo y
                                      qué debe revisarse, mantenerse,
                                      medirse o reemplazarse.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Administradores técnico y sanitario
                                      de ICE24; consulta para
                                      propietarios y técnicos.

  **Dependencias**                    Equipos, inventario, mantenimiento
                                      y sanidad.

  **Etapa sugerida**                  Etapa 1 --- Fundacional
  -----------------------------------------------------------------------

## **Estructura de plantilla**

  -----------------------------------------------------------------------
  **Nivel**               **Ejemplos**            **Información
                                                  controlada**
  ----------------------- ----------------------- -----------------------
  Modelo                  450 kg, 450 + agua, 900 Capacidad, sistemas,
                          kg, vending agua        dimensiones,
                                                  características y
                                                  versiones.

  Sistema                 Hielo, purificación,    Procedimientos,
                          empaque, dispensado,    criticidad y
                          pagos                   dependencias.

  Componente              Filtro, membrana,       Vida útil, refacción
                          bomba, compresor,       compatible, frecuencia
                          sensor                  y evidencia.

  Actividad               Revisión, limpieza,     Periodicidad,
                          cambio, calibración,    responsable, pasos,
                          análisis                alertas y reporte.
  -----------------------------------------------------------------------

## **Reglas de versionado**

- Solo ICE24 crea o modifica plantillas oficiales.

- Las actualizaciones son obligatorias y se aplican automáticamente.

- Las actividades históricas no cambian.

- Las actividades futuras se recalculan con la nueva versión.

- Cada registro conserva la versión que lo originó.

- El propietario puede modificar únicamente datos operativos
  expresamente permitidos, no frecuencias o procedimientos oficiales.

## **Características particulares**

Las diferencias como tamaño de cubo, cámara, sistema de pago o
accesorios se registran como características o componentes catalogados.
Si una característica activa mantenimiento adicional, la plantilla debe
incluir la regla correspondiente.

### **Criterios de aceptación funcional**

> **☐** Una máquina aprobada recibe sistemas y componentes según su
> plantilla.
>
> **☐** El sistema puede mostrar qué máquinas serán afectadas antes de
> publicar una actualización.
>
> **☐** La actualización queda registrada con versión, autor, fecha y
> resumen de cambios.

---

+-----------------------------------------------------------------------+
| **11**                                                                |
|                                                                       |
| **Mantenimiento, tickets y órdenes de trabajo**                       |
|                                                                       |
| Control preventivo, correctivo y técnico con evidencia.               |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Planificar y documentar todo
                                      trabajo sobre la máquina y sus
                                      componentes.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Propietario, administrador,
                                      técnico, operador, ICE24.

  **Dependencias**                    Modelos, componentes, inventario,
                                      archivos, alertas y offline.

  **Etapa sugerida**                  Etapa 2 --- Control principal
  -----------------------------------------------------------------------

## **Tipos de actividad**

- Mantenimiento preventivo, correctivo y sanitario.

- Inspección, limpieza, sanitización, calibración y verificación.

- Cambio de componente, refacción o consumible.

- Actividad por tiempo, uso, condición o evento.

## **Calendario**

El calendario se genera a partir de la plantilla, fecha de instalación,
último servicio y reglas particulares. Un mantenimiento vencido
permanece vencido hasta realizarse. El sistema registra días de atraso y
escalamiento.

## **Ticket y orden de trabajo**

8.  Un usuario reporta una incidencia y selecciona máquina, sistema,
    descripción y prioridad.

9.  El propietario o administrador asigna un técnico.

10. Se crea una orden de trabajo con checklist, procedimiento,
    refacciones y evidencia.

11. El técnico atiende en línea o sin conexión.

12. Registra diagnóstico, actividades, piezas, pruebas y recomendación.

13. La orden se cierra; el propietario puede revisar y corregir mediante
    historial versionado.

## **Evidencia**

- Todos los mantenimientos permiten y requieren evidencia fotográfica,
  sin un mínimo general fijo.

- La plantilla puede exigir tipos específicos: antes/después, pieza
  retirada, pieza instalada, lectura, lote o firma.

- Debe existir una casilla de confirmación de que la información
  corresponde al trabajo realizado.

## **Estados**

  -----------------------------------------------------------------------
  **Estado**                          **Descripción**
  ----------------------------------- -----------------------------------
  Programado                          Generado por calendario y aún no
                                      iniciado.

  Próximo                             Dentro de ventana de aviso.

  En atención                         Responsable activo; puede estar
                                      descargado offline.

  Completado                          Checklist, evidencia y resultado
                                      finalizados.

  Con observaciones                   Completado, pero requiere
                                      seguimiento.

  Vencido                             Fecha límite superada.

  No conforme                         Resultado técnico o sanitario fuera
                                      de criterio.

  Anulado                             Registro invalidado con motivo y
                                      auditoría.
  -----------------------------------------------------------------------

### **Criterios de aceptación funcional**

> **☐** El técnico puede completar una orden previamente sincronizada
> sin internet.
>
> **☐** Un componente consumido se descuenta del inventario y se asocia
> a la máquina.
>
> **☐** No se cierra una orden sin diagnóstico, actividades, responsable
> y evidencia requerida.
>
> **☐** Si dos usuarios modifican el mismo registro, se genera conflicto
> para revisión.

---

+-----------------------------------------------------------------------+
| **12**                                                                |
|                                                                       |
| **Control sanitario y bitácoras**                                     |
|                                                                       |
| Programa documental y operativo definido por ICE24.                   |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Estandarizar las actividades
                                      sanitarias, vencimientos,
                                      evidencias y acciones correctivas
                                      por máquina y sucursal.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Propietario, responsable sanitario,
                                      operador, ICE24 sanitario.

  **Dependencias**                    Plantillas, análisis, documentos,
                                      alertas, portal público.

  **Etapa sugerida**                  Etapa 2 --- Control principal
  -----------------------------------------------------------------------

## **Familias de control**

  -----------------------------------------------------------------------
  **Control**                         **Información mínima**
  ----------------------------------- -----------------------------------
  Agua y proceso                      Lecturas, puntos de muestreo,
                                      condiciones y control del agua.

  Limpieza y sanitización             Área, procedimiento, producto,
                                      concentración, horario, responsable
                                      y evidencia.

  Filtros y purificación              Instalación, cambio, condición,
                                      lote, próximo servicio y
                                      parámetros.

  Control de plagas                   Proveedor, licencia, visita,
                                      producto, hallazgos, croquis y
                                      certificado.

  Higiene del personal                Uniforme, protección, lavado de
                                      manos, salud y capacitación.

  Capacitación                        Tema, asistentes, fecha, evidencia
                                      y vigencia.

  Químicos y residuos                 Inventario, identificación,
                                      almacenamiento y disposición.

  Acciones correctivas                Origen, riesgo, responsable,
                                      evidencia, verificación y cierre.
  -----------------------------------------------------------------------

## **Bitácoras dinámicas**

Las bitácoras no deben ser formularios rígidos escritos directamente en
el código. ICE24 administrará plantillas con tipos de campo,
obligatoriedad, unidades, límites, evidencia y frecuencia. El
propietario no podrá modificar la plantilla oficial.

## **Corrección de registros**

Cualquier bitácora puede corregirse, pero el usuario deberá explicar el
motivo. El sistema conserva la versión original, el valor corregido, la
fecha y el actor. Los registros anulados no se eliminan.

## **Indicador sanitario**

ICE24 define las ponderaciones y versiones del indicador. Un evento
crítico domina el resultado numérico; por ejemplo, una no conformidad
microbiológica activa el estado "Control sanitario crítico" aunque otras
actividades estén al día.

### **Criterios de aceptación funcional**

> **☐** Las bitácoras se generan según modelo, componente y frecuencia
> oficial.
>
> **☐** El propietario no puede reducir obligaciones o límites
> sanitarios.
>
> **☐** Toda corrección conserva una comparación entre versión anterior
> y vigente.
>
> **☐** El panel separa estado sanitario, estado técnico y estado
> operativo.

---

+-----------------------------------------------------------------------+
| **13**                                                                |
|                                                                       |
| **Análisis de laboratorio y no conformidades**                        |
|                                                                       |
| Documento original más captura estructurada y seguimiento.            |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Registrar resultados de laboratorio
                                      en campos analizables, preservar
                                      documentos y activar acciones
                                      cuando un parámetro no cumple.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Propietario, responsable sanitario,
                                      ICE24 sanitario, consulta pública
                                      controlada.

  **Dependencias**                    Control sanitario, documentos,
                                      alertas, restricciones, reportes.

  **Etapa sugerida**                  Etapa 2 --- Control principal
  -----------------------------------------------------------------------

## **Registro de análisis**

  -----------------------------------------------------------------------
  **Grupo**                           **Campos**
  ----------------------------------- -----------------------------------
  Identificación                      Máquina, producto, punto de toma,
                                      laboratorio, folio y tipo de
                                      análisis.

  Fechas                              Muestreo, recepción, resultado,
                                      vigencia y próxima revisión.

  Parámetros                          Nombre, unidad, resultado, límite
                                      inferior/superior y criterio.

  Resultado                           Conforme, no conforme, pendiente o
                                      no evaluable.

  Documento                           PDF original, versión pública,
                                      fotografías y anexos.

  Seguimiento                         Alerta, ticket, acción correctiva,
                                      responsable y nuevo análisis.
  -----------------------------------------------------------------------

## **Plantillas**

- Microbiológicos.

- Fisicoquímicos.

- Metales y metaloides.

- Agua de entrada, agua tratada, hielo terminado y otros puntos
  definidos.

- Parámetros, unidades y límites administrados exclusivamente por ICE24.

![Flujo de atención de un resultado sanitario no conforme y acción
correctiva.](media/image3.png "Flujo de atención de un resultado sanitario no conforme y acción correctiva."){width="7.0in"
height="3.36in"}

## **Reactivación**

El propietario principal o un administrador con permiso especial puede
reactivar mediante formulario: acción realizada, motivo, responsable,
evidencia, fecha, próximo análisis y aceptación de responsabilidad.
ICE24 recibe la alerta y puede volver a restringir.

### **Criterios de aceptación funcional**

> **☐** El sistema no publica automáticamente un resultado no conforme.
>
> **☐** Una no conformidad genera alerta crítica, ticket y acción
> correctiva.
>
> **☐** El documento original y los datos estructurados permanecen
> vinculados.
>
> **☐** El cierre exige evidencia y mantiene el historial del evento
> dentro de los últimos 24 meses públicos cuando se publique su
> resolución.

---

+-----------------------------------------------------------------------+
| **14**                                                                |
|                                                                       |
| **Inventario, refacciones y consumibles**                             |
|                                                                       |
| Existencias, costos y trazabilidad de piezas instaladas y retiradas.  |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Controlar materiales disponibles y
                                      su consumo real en cada servicio.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Propietario, administrador
                                      autorizado, técnico y operador con
                                      permisos limitados.

  **Dependencias**                    Sucursales, máquinas, componentes,
                                      mantenimiento, proveedores.

  **Etapa sugerida**                  Etapa 2 --- Control principal
  -----------------------------------------------------------------------

## **Ubicaciones de inventario**

- Almacén general de la cuenta.

- Almacén por sucursal.

- Componentes y consumibles instalados en la máquina.

- Técnico o vehículo como ubicación futura opcional.

## **Datos de producto**

- Código, categoría, descripción, fotografía y compatibilidad.

- Proveedor, costo, lote, caducidad y unidad de medida.

- Existencia, mínimo, máximo y ubicación.

- Vida útil estimada y mantenimiento relacionado.

## **Movimientos**

  -----------------------------------------------------------------------
  **Movimiento**                      **Regla**
  ----------------------------------- -----------------------------------
  Entrada/compra                      Solo propietario; registra
                                      proveedor, costo, lote y evidencia.

  Salida/consumo                      Puede originarse desde orden de
                                      trabajo; técnico u operador
                                      registra cantidad.

  Transferencia                       Solo propietario entre almacenes y
                                      sucursales.

  Ajuste manual                       Solo propietario, con motivo y
                                      auditoría.

  Pieza instalada                     Sale del inventario y se vuelve
                                      componente activo de una máquina.

  Pieza retirada                      Conserva condición, fotografía,
                                      motivo, costo y disposición.
  -----------------------------------------------------------------------

## **Solicitud de refacciones**

El propietario arma un carrito de productos, cantidades y máquina
destino. ICE24 OS guarda la solicitud y genera un mensaje de WhatsApp
listo para enviar. La cotización y pago se realizan fuera de la
plataforma, pero el folio y seguimiento permanecen.

### **Criterios de aceptación funcional**

> **☐** Solo el propietario puede modificar costos, proveedores y
> ajustes.
>
> **☐** El técnico puede consultar existencias y registrar consumo
> ligado a su orden.
>
> **☐** La instalación de una pieza inicia su historial y próximo
> mantenimiento.
>
> **☐** Las piezas retiradas permanecen en un historial consultable.

---

+-----------------------------------------------------------------------+
| **15**                                                                |
|                                                                       |
| **Documentos, evidencias, versiones y publicación**                   |
|                                                                       |
| Repositorio protegido con metadatos, integridad y visibilidad         |
| controlada.                                                           |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Gestionar archivos como activos
                                      auditables y no como adjuntos sin
                                      contexto.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Todos los perfiles según permisos.

  **Dependencias**                    Archivos, auditoría, reportes,
                                      portal público.

  **Etapa sugerida**                  Etapa 2 --- Control principal
  -----------------------------------------------------------------------

## **Metadatos obligatorios**

- Tipo, título, descripción, emisor, folio y fechas.

- Cuenta, sucursal, máquina y registro relacionado.

- Usuario que cargó, fecha, versión y hash de integridad.

- Estado operativo y estado de visibilidad pública.

- Vigencia, sustitución, corrección o anulación.

## **Estados duales**

  -----------------------------------------------------------------------
  **Estado operativo**                **Visibilidad pública**
  ----------------------------------- -----------------------------------
  Borrador                            Privado

  Pendiente de revisión               Pendiente de publicación

  Completado                          Publicado

  No conforme                         Retirado

  En acción correctiva                Sustituido

  Corregido                           ---

  Anulado                             ---
  -----------------------------------------------------------------------

## **Descargas y versiones**

- El propietario puede descargar el original con o sin marca de agua.

- Las descargas de reportes y documentos sensibles se registran.

- Los documentos corregidos crean una nueva versión; la anterior se
  conserva internamente.

- Las versiones públicas protegen datos personales, firmas, comentarios
  internos y otra información confidencial.

### **Criterios de aceptación funcional**

> **☐** Todo archivo sensible tiene control de acceso y URL temporal o
> mecanismo protegido de descarga.
>
> **☐** El sistema registra quién descargó, qué versión y cuándo.
>
> **☐** Un documento retirado deja de estar público sin desaparecer del
> expediente privado.

---

+-----------------------------------------------------------------------+
| **16**                                                                |
|                                                                       |
| **Reportes y exportaciones**                                          |
|                                                                       |
| Generación consistente, configurable, programable y auditable.        |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Transformar la información
                                      operativa, sanitaria, comercial y
                                      financiera en documentos
                                      verificables.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Propietario y usuarios con permiso
                                      por tipo de reporte.

  **Dependencias**                    Todos los módulos de datos,
                                      documentos, correo y auditoría.

  **Etapa sugerida**                  Etapa 3 --- Resultados y acceso
                                      público
  -----------------------------------------------------------------------

## **Tipos de reporte**

- Predeterminados: máquina, mantenimiento, sanidad, laboratorio,
  sucursal, cuenta global, inventario, ventas, pedidos y reparto.

- Personalizados: selección de periodo, secciones, sucursales, máquinas,
  anexos, fotografías y nivel de privacidad.

- Programados: semanal, mensual, trimestral o anual; enviados por correo
  a usuarios registrados.

## **Vista previa y PDF**

+-----------------------------------------------------------------------+
| **REQUISITO DE CONSISTENCIA**                                         |
|                                                                       |
| La vista previa y el PDF deben generarse desde la misma plantilla. El |
| contenido, orden, tablas, gráficas, fotografías, encabezados, marcas  |
| de agua y saltos deben coincidir.                                     |
+=======================================================================+

## **Opciones de generación**

- Periodo, cuenta, sucursal y máquina.

- Secciones, anexos y fotografías.

- Versión pública o privada.

- Con o sin marca de agua, según permiso.

- Datos financieros visibles u ocultos.

- Destinatarios registrados para reportes programados.

## **Información de ventas**

Si el módulo de ventas tiene información, el reporte la presenta. Si
está activo sin datos, muestra "Sin datos disponibles todavía". Si no
está habilitado, muestra "Módulo de ventas no habilitado".

## **Exportación completa**

Solo el propietario principal puede solicitarla. ICE24 OS prepara un
paquete con archivos estructurados, PDFs, documentos, análisis,
fotografías y auditoría. El paquete permanece disponible siete días,
registra descargas y después expira.

### **Criterios de aceptación funcional**

> **☐** El propietario decide permisos individuales por tipo de reporte.
>
> **☐** Los reportes programados se envían como PDF adjunto únicamente a
> usuarios registrados.
>
> **☐** Todas las descargas sensibles se registran sin interrumpir al
> usuario.
>
> **☐** La vista previa representa fielmente el PDF final.

---

+-----------------------------------------------------------------------+
| **17**                                                                |
|                                                                       |
| **Portal público, etiquetas y códigos QR**                            |
|                                                                       |
| Identificación, transparencia documental y acceso controlado.         |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Permitir consulta pública de
                                      información publicada sobre
                                      mantenimiento y sanidad, sin
                                      exponer información privada.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Público, propietario, ICE24.

  **Dependencias**                    Equipos, documentos, reportes,
                                      publicación y analítica.

  **Etapa sugerida**                  Etapa 3 --- Resultados y acceso
                                      público
  -----------------------------------------------------------------------

## **Etiquetas generadas**

  -----------------------------------------------------------------------
  **Elemento**                        **Contenido y finalidad**
  ----------------------------------- -----------------------------------
  Etiqueta exterior de identificación Marca ICE24 OS y Código ICE24 OS
                                      del equipo; lectura rápida.

  Etiqueta técnica con QR             Código, serie, modelo general y QR
                                      que abre el expediente autenticado
                                      o pantalla de acceso.

  QR público de mantenimiento         Abre la sección pública de
                                      historial y reportes técnicos.

  QR público sanitario                Abre la sección pública de
                                      controles, análisis y reportes
                                      autorizados.
  -----------------------------------------------------------------------

## **Portal público unificado**

Existe una sola rama pública por equipo con dos accesos directos.
Muestra los últimos 24 meses y permite descargar reportes anteriores
autorizados. No existe acceso especial de autoridad; la información
adicional permanece en el portal privado del propietario.

## **Contenido público**

- Código, modelo general, marca comercial, fecha de actualización y
  estado visible.

- Resumen técnico, mantenimientos publicados y botones de descarga.

- Resumen sanitario, nombre del laboratorio, análisis publicados y
  acciones correctivas cerradas.

- Teléfono público de la sucursal y teléfono opcional del propietario.

- Botón de WhatsApp con mensaje prellenado que incluye el código del
  equipo.

## **Protección**

- No se publican costos, inventarios, datos personales, firmas,
  comentarios internos o fotografías sensibles.

- Los reportes públicos llevan marca de agua, folio, versión y
  verificación de autenticidad.

- Los resultados no conformes nunca se publican automáticamente.

- El propietario e ICE24 pueden publicar o retirar contenido; toda
  acción queda auditada.

## **Analítica pública**

- Escaneos por equipo y tipo de QR.

- Fecha y hora.

- Documento descargado y número de descargas.

- Dispositivo o navegador general y ubicación aproximada cuando sea
  técnicamente posible y legítimo.

### **Criterios de aceptación funcional**

> **☐** El QR permanece válido aunque cambie el propietario o la
> sucursal.
>
> **☐** El público solo ve versiones publicadas y protegidas.
>
> **☐** La marca y leyenda dejan claro que ICE24 OS es software de
> gestión, no certificación.

---

+-----------------------------------------------------------------------+
| **18**                                                                |
|                                                                       |
| **Ventas e importación de Excel**                                     |
|                                                                       |
| Procesamiento de archivos de la aplicación independiente de la        |
| máquina.                                                              |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Importar, validar y analizar las
                                      ventas descargadas desde la
                                      aplicación del equipo.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Propietario, administrador
                                      financiero autorizado, ICE24
                                      soporte.

  **Dependencias**                    Equipos, archivos, reportes,
                                      analítica.

  **Etapa sugerida**                  Etapa 4 --- Ventas y monederos
  -----------------------------------------------------------------------

## **Flujo de importación**

14. El usuario selecciona la máquina y carga el archivo Excel.

15. ICE24 OS valida formato, columnas, periodo y consistencia.

16. Muestra vista previa con registros nuevos, duplicados y errores.

17. El usuario confirma o cancela antes de importar.

18. Se guarda el archivo original, el resumen y los registros
    procesados.

19. El usuario puede anular una importación confirmada; los datos se
    retiran de paneles, pero el historial permanece.

## **Datos esperados**

- Fecha y hora.

- Tipo de pago.

- Producto u opción despachada.

- Cantidad e importe.

- Identificador de máquina y, si existe, identificador de transacción.

## **Duplicados**

El sistema debe evitar duplicar periodos o transacciones. Si el archivo
no incluye un identificador único, se construirá una llave con máquina,
fecha, hora, producto, importe y método de pago, sujeta a validación
cuando se obtenga un archivo real.

## **Resultados**

- Ventas e ingresos por día, hora, producto, máquina y método de pago.

- Comparación entre periodos y sucursales.

- Días y horarios con mayor o menor actividad.

- Reportes y gráficas descargables.

### **Criterios de aceptación funcional**

> **☐** No se importan datos sin vista previa y confirmación.
>
> **☐** Los duplicados se identifican y no se suman nuevamente.
>
> **☐** La anulación conserva archivo, usuario, fecha, motivo y cantidad
> de registros afectados.
>
> **☐** El módulo puede configurarse para nuevos formatos de Excel sin
> rehacer el resto del sistema.

---

+-----------------------------------------------------------------------+
| **19**                                                                |
|                                                                       |
| **Tarjetas, recargas y control administrativo**                       |
|                                                                       |
| Bitácora de movimientos físicos vinculados exclusivamente a una       |
| máquina.                                                              |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Documentar tarjetas, recargas,
                                      bonificaciones, retiros y
                                      transferencias realizadas con
                                      dispositivos físicos.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Propietario, administrador
                                      autorizado, titulares de tarjeta
                                      con consulta limitada.

  **Dependencias**                    Máquinas, usuarios, restaurantes,
                                      repartidores, auditoría.

  **Etapa sugerida**                  Etapa 4 --- Ventas y monederos
  -----------------------------------------------------------------------

## **Principio del módulo**

+-----------------------------------------------------------------------+
| **LIMITACIÓN CONOCIDA**                                               |
|                                                                       |
| ICE24 OS no conoce el saldo real de la tarjeta. El dispositivo físico |
| no registra ni comunica los movimientos. La plataforma muestra        |
| únicamente movimientos administrativos capturados por los usuarios.   |
+=======================================================================+

## **Tarjeta**

- Folio impreso e identificador interno.

- Compatibilidad exclusiva con una máquina.

- Titular actual y periodos históricos de asignación.

- Puede asignarse a persona, empresa, restaurante, propietario, operador
  o repartidor.

- No permite saldo negativo ni tiene vencimiento.

## **Movimientos**

  -----------------------------------------------------------------------
  **Movimiento**                      **Datos**
  ----------------------------------- -----------------------------------
  Recarga                             Dinero recibido, saldo cargado,
                                      bonificación, responsable, fecha y
                                      evidencia.

  Retiro                              Cantidad retirada, motivo,
                                      responsable y evidencia.

  Transferencia misma máquina         Tarjeta origen, tarjeta destino,
                                      cantidad retirada/cargada y
                                      responsable.

  Movimiento entre máquinas           Se documenta como retiro en una
                                      máquina y recarga en otra, cada una
                                      con su dispositivo.

  Reasignación                        Cierra titular anterior, abre nuevo
                                      periodo y conserva historial
                                      previo.
  -----------------------------------------------------------------------

## **Ganancia estimada**

El módulo puede calcular equivalencias entre dinero pagado y saldo
cargado. Las ganancias del repartidor se estiman usando recargas
registradas y pedidos o ventas externas capturadas; siempre debe
mostrarse una advertencia de que los movimientos físicos no registrados
pueden alterar el resultado.

### **Criterios de aceptación funcional**

> **☐** Una tarjeta no puede utilizarse en dos máquinas dentro del
> sistema.
>
> **☐** La reasignación no atribuye movimientos pasados al nuevo
> titular.
>
> **☐** Las transferencias quedan documentadas, aunque el dispositivo no
> se integre.
>
> **☐** Los paneles evitan llamar "saldo real" al total administrativo.

---

+-----------------------------------------------------------------------+
| **20**                                                                |
|                                                                       |
| **Negocios, restaurantes y datos fiscales**                           |
|                                                                       |
| Clientes comerciales asociados de manera controlada a propietarios y  |
| máquinas.                                                             |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Administrar negocios consumidores
                                      de hielo, sus sucursales, usuarios,
                                      datos fiscales y asociaciones.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Propietario, administrador de
                                      negocio, usuarios de restaurante,
                                      ICE24.

  **Dependencias**                    Identidad, sucursales, máquinas,
                                      productos, pedidos.

  **Etapa sugerida**                  Etapa 5 --- Clientes y reparto
  -----------------------------------------------------------------------

## **Alta y propiedad**

- El restaurante o negocio solo puede ser creado por el propietario de
  una máquina, no por el repartidor.

- La empresa consumidora puede tener varias sucursales y usuarios
  propios.

- Su administrador puede crear usuarios internos, pero no asociarse por
  sí mismo con nuevas máquinas.

- Un negocio puede asociarse con máquinas de uno o varios propietarios.

## **Modalidades**

  -----------------------------------------------------------------------
  **Modalidad**                       **Funcionamiento**
  ----------------------------------- -----------------------------------
  Autoservicio                        El negocio acude a la máquina
                                      vending y compra con su tarjeta; no
                                      necesita crear un pedido.

  Entrega                             El negocio crea un pedido si existe
                                      al menos un repartidor activo y
                                      elegible.

  Mixta                               El mismo negocio puede utilizar
                                      autoservicio o entrega según
                                      necesidad.
  -----------------------------------------------------------------------

## **Datos fiscales**

- RFC, razón social, régimen, código postal, uso de CFDI y correo de
  contacto, según información necesaria.

- ICE24 OS no timbra facturas; puede registrar una solicitud y enviar
  los datos al responsable correspondiente.

## **Privacidad entre propietarios**

Cada propietario ve únicamente la relación del negocio con sus máquinas.
No puede consultar precios, pedidos, repartidores o información
comercial de otros propietarios.

### **Criterios de aceptación funcional**

> **☐** El negocio utiliza una sola identidad aunque esté asociado con
> varios propietarios.
>
> **☐** Solo ve máquinas autorizadas y productos disponibles en cada
> una.
>
> **☐** La asociación con una máquina requiere aprobación del
> propietario correspondiente.

---

+-----------------------------------------------------------------------+
| **21**                                                                |
|                                                                       |
| **Productos, precios y disponibilidad**                               |
|                                                                       |
| Catálogo de hielo para autoservicio y entrega.                        |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Definir qué opciones ofrece cada
                                      máquina y qué precios aplican a
                                      restaurantes y repartidores.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Propietario, restaurante,
                                      repartidor.

  **Dependencias**                    Máquinas, ventas, pedidos,
                                      tarjetas.

  **Etapa sugerida**                  Etapa 5 --- Clientes y reparto
  -----------------------------------------------------------------------

## **Alcance**

Los pedidos de entrega se limitan a bolsas de hielo. Las funciones de
agua permanecen dentro de la gestión del equipo, pero no se consideran
para entrega porque requieren recipientes y un flujo diferente.

## **Datos de producto**

- Nombre, presentación, kilogramos, fotografía estándar y estado activo.

- Precio de máquina o valor que se descuenta de la tarjeta.

- Precio comercial para restaurante fijado por el propietario.

- Cantidad máxima por pedido y disponibilidad manual.

- Precios especiales por cliente cuando el propietario lo configure.

## **Disponibilidad**

La máquina produce continuamente, pero ICE24 OS no conoce inventario de
hielo en tiempo real. El propietario puede activar o desactivar
productos o marcar disponibilidad aproximada. El estado operativo,
técnico o sanitario puede bloquear automáticamente los pedidos.

## **Entrega**

  -----------------------------------------------------------------------
  **Regla**                           **Opciones**
  ----------------------------------- -----------------------------------
  Tarifa                              Fija, por zona, por distancia,
                                      aproximada o gratuita.

  Edición                             El repartidor puede ajustar dentro
                                      de límites definidos; no debe
                                      exceder el máximo del propietario.

  Presentación al cliente             Producto, tarifa de entrega y total
                                      se muestran antes de confirmar.
  -----------------------------------------------------------------------

### **Criterios de aceptación funcional**

> **☐** El propietario controla catálogo, precios y disponibilidad por
> máquina.
>
> **☐** El repartidor no cambia libremente el precio del producto.
>
> **☐** La tarifa de entrega puede ser cero o mostrarse como gratuita.

---

+-----------------------------------------------------------------------+
| **22**                                                                |
|                                                                       |
| **Pedidos de hielo**                                                  |
|                                                                       |
| Solicitud, recomendación, toma, surtido, entrega e incidencias.       |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Conectar restaurantes registrados
                                      con máquinas asociadas y
                                      repartidores elegibles.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Restaurante, propietario,
                                      repartidor, administrador.

  **Dependencias**                    Negocios, máquinas, productos,
                                      precios, mapas y notificaciones.

  **Etapa sugerida**                  Etapa 5 --- Clientes y reparto
  -----------------------------------------------------------------------

![Flujo de pedido de hielo desde el restaurante hasta la entrega por el
repartidor.](media/image4.png "Flujo de pedido de hielo desde el restaurante hasta la entrega por el repartidor."){width="7.0in"
height="3.92in"}

## **Recomendación de máquina**

ICE24 OS ordena únicamente las máquinas asociadas al restaurante. La
cercanía es el criterio principal, junto con disponibilidad, producto,
precio y existencia de repartidores. El restaurante toma la decisión
final.

## **Condiciones para crear un pedido**

- Restaurante asociado a la máquina.

- Máquina disponible y sin restricción técnica o sanitaria.

- Producto activo.

- Al menos un repartidor disponible, dentro de zona y con tarjeta activa
  de esa máquina.

## **Toma y ejecución**

El pedido aparece a todos los repartidores elegibles. El primero que lo
toma se vuelve responsable y lo bloquea para los demás. Tomar el pedido
requiere internet; después puede ejecutarse sin conexión.

## **Confirmaciones obligatorias**

- Pedido tomado.

- Inicio de recolección.

- Producto recogido.

- Cantidad surtida e importe de tarjeta utilizado.

- En ruta.

- Entrega con nombre, hora, ubicación, código de entrega y evidencia.

## **Cancelaciones e incidencias**

El restaurante puede cancelar antes de que el repartidor compre el
hielo. Después de "Producto recogido", la cancelación requiere
autorización o se registra como incidencia. Se permiten entregas
parciales con explicación y aceptación.

### **Criterios de aceptación funcional**

> **☐** Un pedido pertenece a un solo propietario, sucursal y máquina.
>
> **☐** No se permite pedido de entrega sin repartidor elegible.
>
> **☐** La toma es atómica y evita dos repartidores responsables.
>
> **☐** El cierre registra evidencia y código de entrega.

---

+-----------------------------------------------------------------------+
| **23**                                                                |
|                                                                       |
| **Repartidores y entregas**                                           |
|                                                                       |
| Disponibilidad, ubicación, tarjetas, pedidos y ventas externas.       |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Permitir que propietarios,
                                      repartidores propios e
                                      independientes atiendan pedidos de
                                      máquinas autorizadas.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Propietario, repartidor,
                                      restaurante.

  **Dependencias**                    Usuarios, máquinas, tarjetas,
                                      pedidos, GPS y offline.

  **Etapa sugerida**                  Etapa 5 --- Clientes y reparto
  -----------------------------------------------------------------------

## **Elegibilidad**

- Asociación activa con la máquina.

- Tarjeta asignada y exclusiva de esa máquina.

- Estado disponible.

- Ubicación dentro de la zona permitida, cuando se configure.

- Máquina y producto disponibles.

## **Estados del repartidor**

- Disponible

- Ocupado

- No disponible temporalmente

- Fuera de servicio

- Vacaciones

## **Ubicación**

El navegador solicita geolocalización del teléfono o dispositivo. El
propietario puede ver la ubicación durante un pedido activo y utilizarla
para recomendaciones cuando el repartidor está disponible. La IP solo
puede ser respaldo aproximado, no fuente principal de distancia.

## **Venta externa opcional**

El repartidor puede registrar ventas a clientes que prospectó por su
cuenta. La captura es opcional y privada en cuanto al cliente; permite
registrar máquina, cantidad, saldo utilizado, precio, entrega y ganancia
estimada.

## **Ganancia estimada**

Se calcula con el costo efectivo estimado del saldo utilizado, precio
del producto y tarifa de entrega. Debe distinguirse de una utilidad
contable real porque ICE24 OS no conoce movimientos físicos no
registrados ni otros gastos del repartidor.

### **Criterios de aceptación funcional**

> **☐** El repartidor puede trabajar con máquinas de distintos
> propietarios usando una sola cuenta.
>
> **☐** Cada relación repartidor--máquina tiene su propia tarjeta y
> condiciones.
>
> **☐** La entrega puede completarse offline y sincronizarse después.
>
> **☐** El propietario ve los pedidos de sus negocios registrados; las
> ventas externas conservan privacidad definida.

---

+-----------------------------------------------------------------------+
| **24**                                                                |
|                                                                       |
| **Analítica e indicadores**                                           |
|                                                                       |
| Información para decidir, priorizar y detectar riesgos.               |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Consolidar datos técnicos,
                                      sanitarios, comerciales y
                                      operativos en paneles y tendencias.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Propietario, ICE24, administradores
                                      autorizados, repartidores para su
                                      información privada.

  **Dependencias**                    Todos los módulos de datos.

  **Etapa sugerida**                  Etapa 6 --- Inteligencia
  -----------------------------------------------------------------------

## **Indicadores principales**

  -----------------------------------------------------------------------
  **Indicador**                       **Contenido**
  ----------------------------------- -----------------------------------
  Estado técnico                      Mantenimientos al día, vencidos,
                                      tickets, componentes críticos y
                                      tiempo fuera de servicio.

  Control sanitario                   Bitácoras, análisis vigentes,
                                      resultados, acciones correctivas y
                                      restricciones.

  Resumen global                      Prioriza alertas críticas y combina
                                      dimensiones sin ocultar riesgos.

  Ventas e ingresos                   Importes, productos, horas, métodos
                                      de pago y comparaciones.

  Inventario                          Consumo, costo, faltantes,
                                      caducidad y próximas necesidades.

  Pedidos y reparto                   Volumen, tiempos, entregas,
                                      cancelaciones y ganancias
                                      estimadas.
  -----------------------------------------------------------------------

## **Ponderaciones**

Las ponderaciones son exclusivas de ICE24, versionadas y no editables
por el propietario. Los eventos críticos anulan visualmente un
porcentaje favorable. El portal público muestra categorías cualitativas,
no una supuesta calificación oficial.

## **Mapas de calor y demanda**

- Ubicación de clientes y pedidos.

- Volumen por zona, día y hora.

- Cobertura y disponibilidad de repartidores.

- Predicción de demanda cuando exista suficiente historial consistente.

- Posibles variables futuras: clima, festivos, eventos y estacionalidad.

### **Criterios de aceptación funcional**

> **☐** Cada indicador explica qué factores afectan su resultado.
>
> **☐** Los cálculos conservan versión de fórmula y fecha.
>
> **☐** Un usuario solo ve métricas de las cuentas y relaciones
> autorizadas.

---

+-----------------------------------------------------------------------+
| **25**                                                                |
|                                                                       |
| **Notificaciones, alertas y escalamiento**                            |
|                                                                       |
| Avisos persistentes, responsables y seguimiento verificable.          |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Asegurar que los vencimientos y
                                      riesgos lleguen a las personas
                                      correctas y no desaparezcan sin
                                      atención.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Todos los perfiles según evento.

  **Dependencias**                    Calendarios, mantenimiento,
                                      sanidad, pedidos, suscripción,
                                      correo.

  **Etapa sugerida**                  Etapa 2 --- Transversal desde
                                      primera liberación
  -----------------------------------------------------------------------

## **Canales**

- Centro de notificaciones dentro de ICE24 OS.

- Notificaciones del navegador cuando el usuario las autorice.

- Correo electrónico para alertas críticas y reportes programados.

- WhatsApp como botón de contacto, no como automatización inicial de
  alertas.

## **Estados**

  -----------------------------------------------------------------------
  **Estado**                          **Significado**
  ----------------------------------- -----------------------------------
  No leída                            El usuario no abrió el aviso.

  Leída                               Abrió el aviso.

  Enterado                            Confirmó que conoce la situación.

  En atención                         Existe actividad o ticket
                                      relacionado.

  Resuelta                            La condición fue cerrada con
                                      evidencia.
  -----------------------------------------------------------------------

## **Alertas críticas**

Permanecen fijadas en el panel hasta que el responsable marque
"Enterado". Esto no resuelve el problema. Las restricciones, no
conformidades, mantenimientos críticos vencidos, pagos rechazados y
escalamientos se envían también por correo.

## **Escalamiento**

ICE24 define el mínimo obligatorio en las plantillas; el propietario
puede añadir avisos, pero no eliminar escalamientos críticos. Cada
evento define anticipación, responsables, repetición y nivel superior.

  -----------------------------------------------------------------------
  **Ejemplo**                         **Secuencia**
  ----------------------------------- -----------------------------------
  Mantenimiento                       7 días antes: operador · 3 días
                                      antes: encargado · vencimiento:
                                      propietario · 7 días vencido:
                                      ICE24.

  No conformidad                      Inmediato: propietario e ICE24 · 24
                                      h sin enterado: administradores ·
                                      48 h sin acción: responsable
                                      sanitario y técnico.
  -----------------------------------------------------------------------

### **Criterios de aceptación funcional**

> **☐** Las alertas críticas no desaparecen al leerse.
>
> **☐** Cada escalamiento registra destinatario, envío, lectura y
> confirmación.
>
> **☐** La resolución se vincula con mantenimiento, ticket o acción
> correctiva.

---

+-----------------------------------------------------------------------+
| **26**                                                                |
|                                                                       |
| **Suscripción, Stripe y cuenta demo**                                 |
|                                                                       |
| Cobro recurrente, bloqueo, reactivación y experiencia comercial.      |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Administrar el acceso comercial a
                                      ICE24 OS con un plan único.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            ICE24, propietario, Stripe.

  **Dependencias**                    Cuentas, correo, auditoría.

  **Etapa sugerida**                  Etapa 1 --- Fundacional
  -----------------------------------------------------------------------

## **Plan**

+-----------------------------------------------------------------------+
| **PLAN ÚNICO**                                                        |
|                                                                       |
| \$399 MXN mensuales por cuenta, con usuarios, sucursales y máquinas   |
| ilimitados. El precio y condiciones deben ser configurables por ICE24 |
| para futuros ajustes o acuerdos especiales.                           |
+=======================================================================+

## **Stripe**

- Se utiliza exclusivamente para cobrar la suscripción de ICE24 OS.

- Cobro mensual en la fecha de activación, ajustado al último día en
  meses más cortos cuando corresponda.

- Stripe emite comprobante; ICE24 OS no timbra factura fiscal.

- El cliente puede solicitar cancelación desde ICE24 OS; la renovación
  se detiene al final del periodo pagado.

## **Estados**

  -----------------------------------------------------------------------
  **Estado**                          **Comportamiento**
  ----------------------------------- -----------------------------------
  Demo                                Acceso temporal con datos
                                      ficticios.

  Pendiente de activación             Cuenta creada sin suscripción
                                      confirmada.

  Activa                              Acceso completo.

  Pago rechazado                      Bloqueo inmediato y aviso.

  Modo lectura                        Puede consultar y descargar
                                      documentos ya generados; no crear
                                      ni modificar.

  Cancelación programada              Acceso hasta fin del periodo
                                      pagado.

  Cancelada                           Modo lectura; datos conservados.

  Reactivada                          Acceso automático al confirmarse el
                                      pago.
  -----------------------------------------------------------------------

## **Cuenta demo**

- Copia independiente de una plantilla maestra.

- Datos ficticios de dos o tres meses.

- Vigencia de 14 días, ampliable por ICE24.

- Al contratar se crea una cuenta productiva limpia.

### **Criterios de aceptación funcional**

> **☐** Un pago rechazado activa modo lectura inmediatamente.
>
> **☐** La reactivación es automática cuando Stripe confirma el pago.
>
> **☐** En modo lectura no se generan reportes nuevos; sí se descargan
> documentos existentes.
>
> **☐** La información se conserva indefinidamente según la política
> actual.

---

+-----------------------------------------------------------------------+
| **27**                                                                |
|                                                                       |
| **Auditoría y logs**                                                  |
|                                                                       |
| Trazabilidad de negocio, seguridad, integraciones y operación         |
| técnica.                                                              |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Responder quién hizo qué, cuándo,
                                      desde dónde, sobre qué dato y con
                                      qué resultado.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            ICE24, propietario, administradores
                                      con permiso, equipo técnico.

  **Dependencias**                    Todos los módulos.

  **Etapa sugerida**                  Etapa 1 --- Fundacional y
                                      transversal
  -----------------------------------------------------------------------

## **Tipos de registro**

  -----------------------------------------------------------------------
  **Categoría**                       **Eventos**
  ----------------------------------- -----------------------------------
  Auditoría de negocio                Altas, cambios, correcciones,
                                      anulaciones, transferencias,
                                      publicaciones, restricciones,
                                      reactivaciones y permisos.

  Seguridad                           Inicios de sesión, intentos
                                      fallidos, recuperación, 2FA, cierre
                                      de sesiones y cambios de
                                      credenciales.

  Documentos y reportes               Carga, versión, publicación,
                                      retiro, vista previa, generación,
                                      envío y descarga.

  Inventario y dinero administrativo  Entradas, salidas, ajustes,
                                      recargas, retiros, transferencias y
                                      cambios de precio.

  Integraciones                       Stripe, correo, mapas,
                                      almacenamiento, generación de PDF y
                                      otros servicios.

  Offline y sincronización            Descarga de tareas, cambios
                                      locales, reintentos, conflictos y
                                      resolución.

  Portal público                      Escaneos, páginas consultadas y
                                      descargas públicas.

  Logs técnicos                       Errores, rendimiento, colas, tareas
                                      programadas y salud de servicios.
  -----------------------------------------------------------------------

## **Campos mínimos de auditoría**

- ID del evento y marca de tiempo técnica.

- Fecha y hora local, zona horaria, usuario y contexto de cuenta.

- Entidad afectada y valores anterior/nuevo cuando aplique.

- Acción, motivo, origen, dispositivo/IP aproximada y resultado.

- Identificador de correlación para seguir una operación entre
  servicios.

## **Acceso y retención**

- El propietario consulta auditoría de su cuenta; el administrador según
  permiso; ICE24 consulta auditoría global.

- Ningún usuario puede editar o eliminar registros de auditoría.

- La auditoría de negocio y documentos se conserva durante la vida de la
  cuenta según política vigente.

- Los logs técnicos pueden utilizar una retención diferenciada
  configurable para controlar costo y volumen.

## **Eventos obligatorios**

  -----------------------------------------------------------------------
  **Área**                            **Eventos sensibles**
  ----------------------------------- -----------------------------------
  Usuarios                            Creación, desactivación, cambio de
                                      rol, permisos y cierre de sesión.

  Equipos                             Alta, validación, traslado,
                                      transferencia y retiro.

  Sanidad                             Corrección, no conformidad,
                                      restricción, reactivación y
                                      publicación.

  Comercial                           Precios, importaciones, pedidos,
                                      recargas y ganancias estimadas.

  Datos                               Exportaciones, descargas y acceso a
                                      documentos originales.
  -----------------------------------------------------------------------

### **Criterios de aceptación funcional**

> **☐** Cada acción sensible genera un evento antes de confirmarse al
> usuario.
>
> **☐** La auditoría permite filtrar por usuario, cuenta, sucursal,
> máquina, fecha y tipo.
>
> **☐** Los conflictos offline y sus resoluciones quedan completamente
> trazados.
>
> **☐** Las descargas públicas y privadas pueden distinguirse.

---

+-----------------------------------------------------------------------+
| **28**                                                                |
|                                                                       |
| **PWA, offline, seguridad y archivos**                                |
|                                                                       |
| Requisitos no funcionales para operar de manera confiable.            |
+=======================================================================+

  -----------------------------------------------------------------------
  **Objetivo**                        Proporcionar una aplicación
                                      instalable, segura, rápida y capaz
                                      de operar en ubicaciones con
                                      conectividad limitada.
  ----------------------------------- -----------------------------------
  **Usuarios principales**            Todos los usuarios; mayor énfasis
                                      en técnicos, operadores y
                                      repartidores.

  **Dependencias**                    Arquitectura técnica e
                                      integraciones.

  **Etapa sugerida**                  Etapa 1 y endurecimiento continuo
  -----------------------------------------------------------------------

## **Aplicación web progresiva**

- Instalable en pantalla principal desde navegador.

- Diseño responsivo para teléfono, tableta y computadora.

- Icono, pantalla de inicio y navegación con apariencia de aplicación.

- Actualización controlada y aviso cuando exista una versión nueva.

## **Offline**

  -----------------------------------------------------------------------
  **Perfil**                          **Funciones sin conexión**
  ----------------------------------- -----------------------------------
  Técnico                             Consultar órdenes sincronizadas,
                                      completar checklist, diagnóstico,
                                      piezas, fotos y firma.

  Operador                            Completar bitácoras descargadas,
                                      mediciones, fotos e incidencias.

  Repartidor                          Consultar pedido tomado, marcar
                                      recolección, ruta, entrega y
                                      evidencia.
  -----------------------------------------------------------------------

Tomar un pedido, crear usuarios, modificar configuración, procesar Excel
o generar reportes requiere conexión. Al cerrar sesión, ser desactivado
o cambiar de dispositivo, los datos offline protegidos deben eliminarse
del almacenamiento local.

## **Conflictos**

Una actividad descargada queda "en atención" por un responsable. Si
aparece una modificación concurrente, el sistema no sobrescribe:
conserva ambas versiones y crea una tarea de revisión para propietario o
administrador autorizado.

## **Política inicial de archivos**

  -----------------------------------------------------------------------
  **Tipo**                **Límite inicial**      **Tratamiento**
  ----------------------- ----------------------- -----------------------
  Fotografía              10 MB por imagen; 15    Compresión automática,
                          por actividad de forma  vista optimizada y
                          predeterminada          original cuando
                                                  aplique.

  PDF                     25 MB                   Almacenamiento privado,
                                                  versión pública
                                                  opcional.

  Excel de ventas         20 MB                   Validación antes de
                                                  procesamiento.

  Video                   Fuera de la primera     Posible ampliación
                          versión                 futura.
  -----------------------------------------------------------------------

No se recomienda almacenar imágenes en Base64 dentro de la base de
datos. Los archivos deben residir en almacenamiento de objetos y la base
de datos debe guardar metadatos y referencias seguras.

## **Seguridad**

- Cifrado en tránsito y almacenamiento protegido.

- Control de acceso por organización, sucursal, máquina y acción.

- Enlaces de descarga temporales para documentos privados.

- Backups automáticos y pruebas periódicas de recuperación.

- Separación entre base de datos, archivos y secretos de integración.

- Registro de vulnerabilidades, dependencias y actualizaciones de
  seguridad.

### **Criterios de aceptación funcional**

> **☐** La aplicación se instala y abre en modo autónomo desde la
> pantalla principal.
>
> **☐** Las actividades offline muestran estados: pendiente,
> sincronizando, cargada o error.
>
> **☐** El cierre de sesión elimina datos locales sensibles.
>
> **☐** Los archivos no son accesibles mediante URL pública permanente.

---

+-----------------------------------------------------------------------+
| **29**                                                                |
|                                                                       |
| **Integraciones y decisiones tecnológicas**                           |
|                                                                       |
| Servicios externos y criterios para seleccionar la plataforma.        |
+=======================================================================+

## **Integraciones definidas**

  -----------------------------------------------------------------------
  **Servicio**            **Finalidad**           **Alcance**
  ----------------------- ----------------------- -----------------------
  Stripe                  Cobro de suscripción    Checkout/portal de
                                                  pago, eventos de pago,
                                                  cancelación y
                                                  reactivación.

  Correo transaccional    Alertas críticas y      Adjuntos PDF,
                          reportes                recuperación de
                                                  contraseña y
                                                  comprobantes.

  Mapas/geolocalización   Cercanía, zonas y       GPS del navegador,
                          entregas                rutas aproximadas y
                                                  tarifa por distancia.

  Almacenamiento de       Fotografías, PDFs,      Acceso privado y
  objetos                 Excel y exportaciones   versiones optimizadas.

  Generador PDF           Vista previa y          Misma plantilla para
                          documentos              HTML/vista y PDF.

  Portal de capacitación  Acceso externo          Botón de redirección;
                                                  credenciales
                                                  independientes.

  Aplicación de máquina   Importación manual      Excel descargado, sin
                                                  integración API
                                                  inicial.
  -----------------------------------------------------------------------

## **Criterios para elegir stack**

- Soporte sólido para PWA y offline.

- Modelo multiempresa con permisos detallados.

- Base de datos relacional para trazabilidad y reportes.

- Procesamiento de archivos y tareas en segundo plano.

- Generación consistente de PDF.

- Escalabilidad de almacenamiento de evidencias.

- Observabilidad, auditoría y manejo de integraciones.

- Capacidad del equipo de desarrollo para mantenerlo.

+-----------------------------------------------------------------------+
| **DECISIÓN PENDIENTE**                                                |
|                                                                       |
| Este documento no impone todavía un framework o proveedor específico. |
| El ingeniero deberá presentar una propuesta de arquitectura           |
| comparando costo, velocidad, seguridad, soporte offline,              |
| mantenibilidad y capacidad de crecimiento.                            |
+=======================================================================+

## **Arquitectura lógica recomendada**

  -----------------------------------------------------------------------
  **Capa**                            **Responsabilidad**
  ----------------------------------- -----------------------------------
  Cliente PWA                         Interfaz, caché offline,
                                      sincronización y captura local.

  API de negocio                      Reglas, permisos, estados,
                                      auditoría e integraciones.

  Base relacional                     Cuentas, equipos, actividades,
                                      pedidos, precios y logs de negocio.

  Almacenamiento de objetos           Archivos originales, versiones
                                      públicas y exportaciones.

  Colas y tareas                      PDF, correos, importaciones,
                                      reportes programados y
                                      escalamiento.

  Observabilidad                      Logs técnicos, métricas, errores y
                                      alertas de servicio.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **30**                                                                |
|                                                                       |
| **Modelo conceptual de datos**                                        |
|                                                                       |
| Entidades y relaciones que deben existir desde la arquitectura        |
| inicial.                                                              |
+=======================================================================+

  -----------------------------------------------------------------------
  **Dominio**                         **Entidades principales**
  ----------------------------------- -----------------------------------
  Identidad                           Usuario, credencial, sesión, 2FA,
                                      rol, permiso, asociación.

  Organización                        Cuenta titular, sucursal, contacto,
                                      datos fiscales, suscripción, demo.

  Activos                             Máquina, código, serie, modelo,
                                      sistema, componente, ubicación,
                                      transferencia.

  Plantillas                          Versión, actividad, frecuencia,
                                      checklist, límite, evidencia y
                                      escalamiento.

  Operación                           Mantenimiento, ticket, orden,
                                      bitácora, incidencia, acción
                                      correctiva.

  Sanidad                             Análisis, parámetro, resultado,
                                      laboratorio, no conformidad y
                                      restricción.

  Inventario                          Producto, proveedor, lote, almacén,
                                      movimiento, componente
                                      instalado/retirado.

  Documentos                          Archivo, versión, visibilidad,
                                      publicación, descarga,
                                      autenticidad.

  Reportes                            Plantilla, configuración,
                                      generación, programación,
                                      destinatario y envío.

  Comercial                           Venta importada, tarjeta, recarga,
                                      negocio, producto, precio, pedido,
                                      entrega.

  Analítica                           Indicador, fórmula, ponderación,
                                      versión, resultado y serie
                                      histórica.

  Auditoría                           Evento, actor, entidad, cambios,
                                      correlación, dispositivo y
                                      resultado.
  -----------------------------------------------------------------------

## **Relaciones críticas**

- Una cuenta tiene muchas sucursales y usuarios asociados.

- Una sucursal tiene muchas máquinas y puede tener un almacén.

- Una máquina usa una versión de plantilla y contiene sistemas y
  componentes.

- Una persona puede tener múltiples roles y asociaciones.

- Un restaurante puede asociarse con máquinas de diferentes
  propietarios.

- Un repartidor puede asociarse con varias máquinas, con una tarjeta
  distinta por máquina.

- Un pedido pertenece a un restaurante, una sucursal consumidora, un
  propietario, una sucursal operativa, una máquina y un repartidor
  final.

- Todo evento sensible genera auditoría vinculada con actor y entidad.

## **Identificadores**

  -----------------------------------------------------------------------
  **Identificador**                   **Uso**
  ----------------------------------- -----------------------------------
  ID técnico interno                  UUID o equivalente; nunca visible
                                      ni reutilizable.

  Código ICE24 OS del equipo          Código visible, permanente y
                                      verificable.

  Número de serie                     Identidad física del fabricante.

  Folios                              Solicitudes, órdenes, reportes,
                                      documentos, pedidos y
                                      exportaciones.

  Hash                                Verificación de integridad de
                                      archivos y documentos.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **31**                                                                |
|                                                                       |
| **Catálogo de estados**                                               |
|                                                                       |
| Máquinas de estado para controlar transiciones y evitar ambigüedad.   |
+=======================================================================+

  -----------------------------------------------------------------------
  **Entidad**                         **Estados y transiciones**
  ----------------------------------- -----------------------------------
  Solicitud de equipo                 Borrador → Enviada → En revisión →
                                      Información faltante →
                                      Validada/Rechazada → Activa

  Mantenimiento                       Programado → Próximo → En atención
                                      → Completado/Con observaciones →
                                      Vencido/No conforme →
                                      Corregido/Anulado

  Documento                           Borrador → Pendiente de revisión →
                                      Completado/No conforme →
                                      Corregido/Anulado

  Publicación                         Privado → Pendiente → Publicado →
                                      Retirado/Sustituido

  Pedido                              Creado → Disponible → Tomado →
                                      Recogiendo → Recogido → En ruta →
                                      Entregado → Cerrado

  Pedido alterno                      Cancelado · Liberado · Parcial · No
                                      entregado · Con incidencia

  Alerta                              No leída → Leída → Enterado → En
                                      atención → Resuelta

  Suscripción                         Demo → Pendiente → Activa → Pago
                                      rechazado → Modo lectura →
                                      Cancelada/Reactivada

  Exportación                         Solicitada → Preparando →
                                      Disponible → Descargada →
                                      Expirada/Error

  Sincronización                      Pendiente → Sincronizando → Cargada
                                      → Error → Conflicto → Resuelta
  -----------------------------------------------------------------------

## **Regla de transición**

Cada cambio de estado debe validar permisos, precondiciones y datos
obligatorios. El sistema registra transición anterior, nueva, usuario,
fecha, motivo y entidad relacionada. Las transiciones críticas deben ser
idempotentes para evitar duplicados por reintentos o conexión inestable.

+-----------------------------------------------------------------------+
| **32**                                                                |
|                                                                       |
| **Orden recomendado de construcción**                                 |
|                                                                       |
| Secuencia de dependencias para entregar valor sin rehacer la          |
| arquitectura.                                                         |
+=======================================================================+

  -----------------------------------------------------------------------
  **Etapa**                           **Entregables**
  ----------------------------------- -----------------------------------
  Etapa 0 --- Descubrimiento y        Validación de este documento,
  arquitectura                        prototipos, stack, modelo de datos,
                                      seguridad, UX y plan de pruebas.

  Etapa 1 --- Fundamentos             Identidad, cuentas, sucursales,
                                      permisos, equipos, modelos,
                                      componentes, suscripción, auditoría
                                      y PWA base.

  Etapa 2 --- Control principal       Mantenimiento, tickets, bitácoras,
                                      sanidad, laboratorio,
                                      restricciones, inventario, archivos
                                      y alertas.

  Etapa 3 --- Resultados y portal     Reportes, vista previa, PDF,
                                      programación, etiquetas, QR, portal
                                      público e indicadores iniciales.

  Etapa 4 --- Ventas y monederos      Importación Excel, ventas,
                                      ingresos, tarjetas, recargas,
                                      bonificaciones y transferencias.

  Etapa 5 --- Clientes y reparto      Restaurantes, productos, precios,
                                      pedidos, repartidores, GPS,
                                      entregas y ventas externas.

  Etapa 6 --- Inteligencia            Ganancias estimadas, comparaciones,
                                      mapas de calor, demanda y reportes
                                      avanzados.

  Etapa 7 --- Endurecimiento y        Rendimiento, seguridad, respaldo,
  lanzamiento                         accesibilidad, observabilidad,
                                      soporte y migraciones.
  -----------------------------------------------------------------------

## **Estados de desarrollo por módulo**

- Documentado.

- Pendiente de información.

- Listo para diseño UX/UI.

- Listo para arquitectura técnica.

- En desarrollo.

- En pruebas.

- Liberado.

- En mejora continua.

## **Dependencias clave**

  -----------------------------------------------------------------------
  **Módulo**                          **Debe existir antes**
  ----------------------------------- -----------------------------------
  Mantenimiento                       Equipos, modelos, componentes,
                                      usuarios y permisos.

  Sanidad                             Plantillas, documentos, alertas y
                                      estados del equipo.

  Reportes                            Datos de módulos, permisos,
                                      archivos y generador PDF.

  Pedidos                             Restaurantes, máquinas, productos,
                                      precios, repartidores y mapas.

  Ganancias                           Recargas, pedidos o ventas externas
                                      y reglas de costo estimado.

  Predicción                          Historial suficiente, consistente y
                                      georreferenciado.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **33**                                                                |
|                                                                       |
| **Criterios de aceptación y definición de terminado**                 |
|                                                                       |
| Cómo validar cada entrega funcional.                                  |
+=======================================================================+

## **Definición de terminado por módulo**

- Flujos aprobados por negocio y diseño.

- Reglas de permisos implementadas y probadas.

- Estados y transiciones controlados.

- Auditoría de eventos sensibles activa.

- Manejo de errores y mensajes comprensibles.

- Diseño responsivo probado en teléfono, tableta y computadora.

- Pruebas de offline y sincronización cuando aplique.

- Reportes y exportaciones comparados contra la vista previa.

- Pruebas de seguridad, privacidad y acceso entre cuentas.

- Documentación técnica, manual operativo y catálogo de configuración.

## **Pruebas mínimas**

  -----------------------------------------------------------------------
  **Tipo**                            **Ejemplos**
  ----------------------------------- -----------------------------------
  Funcionales                         Casos felices, validaciones,
                                      estados, permisos y correcciones.

  Aislamiento de datos                Un propietario no puede ver
                                      información de otro.

  Auditoría                           Cada evento sensible aparece con
                                      valores y actor correctos.

  Offline                             Cierre inesperado, reintento, fotos
                                      pendientes y conflicto.

  Archivos                            Tamaño, tipo, virus, integridad,
                                      versión y descarga.

  PDF                                 Vista previa idéntica, saltos,
                                      tablas, marca de agua y folio.

  Integraciones                       Stripe, correo, mapas,
                                      almacenamiento y tareas
                                      programadas.

  Rendimiento                         Paneles, búsquedas, reportes y
                                      carga de archivos bajo volumen
                                      esperado.
  -----------------------------------------------------------------------

## **Criterio de liberación**

Ningún módulo debe considerarse listo únicamente porque "funciona en la
pantalla". Debe funcionar con permisos, auditoría, datos reales, errores
controlados, documentación, respaldo y pruebas en los dispositivos
previstos.

+-----------------------------------------------------------------------+
| **34**                                                                |
|                                                                       |
| **Riesgos, supuestos e información pendiente**                        |
|                                                                       |
| Elementos que deben resolverse durante el refinamiento.               |
+=======================================================================+

## **Información pendiente no bloqueante**

  -----------------------------------------------------------------------
  **Entrada**                         **Trabajo requerido**
  ----------------------------------- -----------------------------------
  Excel real de ventas                Validar columnas, identificadores,
                                      periodos, formatos por modelo y
                                      duplicados.

  Plantillas de mantenimiento         Actividades, frecuencias, evidencia
                                      y criticidad por modelo y
                                      componente.

  Bitácoras sanitarias                Preguntas, campos, unidades,
                                      límites, frecuencia y responsables.

  Catálogo de análisis                Parámetros, límites y fuentes
                                      normativas aplicables.

  Catálogo de inventario              Refacciones, filtros, consumibles,
                                      costos, compatibilidades y
                                      fotografías.

  Etiquetas                           Dimensiones, material, arte final,
                                      impresora y proceso de colocación.

  Dominio y correo                    URL de aplicación, portal público y
                                      remitente transaccional.

  Portal de capacitación              URL definitiva y reglas de
                                      redirección.

  Precios y reglas de entrega         Configuración inicial de tarifas,
                                      zonas y ejemplos.
  -----------------------------------------------------------------------

## **Riesgos principales**

  -----------------------------------------------------------------------
  **Riesgo**                          **Mitigación**
  ----------------------------------- -----------------------------------
  Alcance amplio                      Gestionar mediante etapas,
                                      criterios de aceptación y
                                      priorización por dependencias.

  Regulación cambiante                Versionar parámetros y revisar
                                      fuentes oficiales antes de publicar
                                      actualizaciones.

  Datos incompletos                   Distinguir "sin datos" de "no
                                      conforme" y no inventar resultados.

  Saldo físico no integrado           Mostrar siempre que el control de
                                      tarjeta es administrativo.

  Offline complejo                    Limitar funciones, asignar
                                      responsables y diseñar resolución
                                      de conflictos.

  Crecimiento de archivos             Compresión, límites, almacenamiento
                                      de objetos y monitoreo de costos.

  Privacidad pública                  Versiones protegidas, control de
                                      publicación y aviso de privacidad.

  Reportes pesados                    Optimización de imágenes, división
                                      de adjuntos y tareas asíncronas.
  -----------------------------------------------------------------------

## **Decisiones que deberá presentar ingeniería**

- Arquitectura y stack propuesto con alternativas y justificación.

- Modelo multiempresa y estrategia de permisos.

- Diseño offline y mecanismo de sincronización.

- Motor de plantillas y formularios dinámicos.

- Motor de reportes y PDF.

- Almacenamiento y política de respaldos.

- Estrategia de auditoría y observabilidad.

- Estimación por etapa, dependencias, equipo y riesgos.

+-----------------------------------------------------------------------+
| **A**                                                                 |
|                                                                       |
| **Anexos y referencias**                                              |
|                                                                       |
| Glosario, leyendas y referencias de consulta.                         |
+=======================================================================+

## **Glosario**

  -----------------------------------------------------------------------
  **Término**                         **Definición**
  ----------------------------------- -----------------------------------
  ICE24 OS                            Plataforma de gestión definida en
                                      este documento.

  Cuenta titular                      Persona física o empresa que
                                      contrata la plataforma.

  Código ICE24 OS del equipo          Identificador permanente asignado
                                      al validar una máquina.

  Plantilla                           Configuración oficial versionada de
                                      modelo, componentes, actividades y
                                      reglas.

  Bitácora                            Registro recurrente estructurado de
                                      una actividad operativa o
                                      sanitaria.

  No conformidad                      Resultado fuera de un criterio
                                      definido que exige seguimiento.

  Acción correctiva                   Conjunto de actividades y
                                      evidencias para atender una no
                                      conformidad.

  Publicación                         Decisión explícita de hacer visible
                                      un registro en el portal público.

  Control administrativo de tarjeta   Movimientos registrados en ICE24
                                      OS, no saldo físico confirmado.

  PWA                                 Aplicación web progresiva
                                      instalable y con capacidades
                                      offline controladas.

  Auditoría                           Registro inmutable de acciones y
                                      cambios de negocio.

  Log técnico                         Registro operativo de servicios,
                                      errores e integraciones.
  -----------------------------------------------------------------------

## **Leyenda recomendada para reportes y portal público**

+-----------------------------------------------------------------------+
| **LEYENDA**                                                           |
|                                                                       |
| Documento generado mediante ICE24 OS, plataforma de gestión           |
| operativa, mantenimiento y control documental. La información         |
| mostrada corresponde a registros proporcionados y gestionados por el  |
| responsable del equipo. Este documento no constituye una              |
| certificación, autorización ni dictamen emitido por una autoridad     |
| sanitaria.                                                            |
+=======================================================================+

## **Referencias internas**

- Documento de presentación y contexto ICE24 MX.

- Manuales de máquinas ICE24 450 kg, 450 kg + agua y 900 kg.

- Fichas técnicas, cartas de mantenimiento, catálogos de refacciones y
  materiales compartidos por ICE24.

- Definiciones y decisiones de producto recopiladas durante las sesiones
  de diseño de ICE24 OS.

## **Referencias normativas de consulta**

- NOM-201-SSA1-2015: Agua y hielo para consumo humano, envasados y a
  granel. Especificaciones sanitarias.

- NOM-251-SSA1-2009: Prácticas de higiene para el proceso de alimentos,
  bebidas o suplementos alimenticios.

- Guías de autoverificación de COFEPRIS para establecimientos que
  procesan agua y hielo.

- Aviso de funcionamiento y trámites aplicables de productos y
  servicios.

- Ley Federal de Protección de Datos Personales en Posesión de los
  Particulares y su reglamentación aplicable.

## **Próximo paso recomendado**

+-----------------------------------------------------------------------+
| **SIGUIENTE ENTREGABLE**                                              |
|                                                                       |
| Convertir este documento en un backlog de producto: épicas, historias |
| de usuario, pantallas, campos, reglas, criterios de aceptación y      |
| estimación por etapa. La primera sesión técnica debe comenzar por     |
| Etapa 0 y Etapa 1, sin perder la visión integral de los módulos       |
| posteriores.                                                          |
+=======================================================================+

**ICE24 OS**

**FIN DEL DOCUMENTO MAESTRO · VERSIÓN 2026-V1.0**
