# ICE24 OS — Project Rules

> **Confidencial.** Información propiedad intelectual de ICE24 MX. Su reproducción total o parcial requiere autorización escrita.

## Control del documento

| Campo | Valor |
|---|---|
| Proyecto | ICE24 OS |
| Documento | Constitución técnica y operativa del proyecto |
| Archivo | `PROJECT_RULES.md` |
| Versión | 1.0 |
| Fecha base | Agosto de 2026 |
| Estado | Línea base obligatoria para desarrollo; sujeta a las decisiones pendientes de Fase 0 |
| Audiencia | Producto, arquitectura, desarrollo, QA, seguridad, DevOps y agentes de IA |
| Fuentes | PRD, TRD, `Architecture.md`, `Database.md`, `API.md`, `UI_UX.md`, `AppFlow.md`, `Implementation_Plan.md` y `TASKS.md` |

---

## 1. Propósito

Este documento funciona como la **constitución del repositorio ICE24 OS**. Define las reglas técnicas y de colaboración que deben mantenerse durante todo el ciclo de vida del producto.

Sus objetivos son:

- impedir que distintas personas o agentes de IA implementen patrones incompatibles;
- proteger las decisiones de arquitectura, seguridad, datos y producto ya aprobadas;
- establecer límites claros entre módulos, aplicaciones y responsabilidades;
- asegurar que los cambios sean trazables, probados, revisables y reversibles;
- evitar soluciones locales que deterioren aislamiento multiempresa, auditoría, rendimiento u operación;
- convertir los criterios del PRD y TRD en reglas cotidianas de ingeniería.

Este documento no reemplaza las especificaciones funcionales o técnicas. Las complementa con reglas obligatorias para su implementación.

---

## 2. Lenguaje normativo

Los términos siguientes tienen carácter normativo:

- **DEBE / OBLIGATORIO:** no puede omitirse salvo excepción formal aprobada.
- **NO DEBE / PROHIBIDO:** no puede realizarse salvo excepción formal aprobada.
- **DEBERÍA / RECOMENDADO:** regla preferida; apartarse requiere justificación en el pull request.
- **PUEDE / OPCIONAL:** permitido cuando no contradiga otra regla.

Cuando una regla no pueda cumplirse, el cambio debe quedar **bloqueado** hasta obtener una decisión, ADR o excepción aprobada. No se permite continuar con un supuesto silencioso.

---

## 3. Orden de autoridad documental

Ante dudas o contradicciones se aplicará el siguiente orden:

1. **PRD:** alcance, actores, reglas de negocio, restricciones y criterios de aceptación.
2. **TRD y `Architecture.md`:** arquitectura, componentes, tecnología y límites técnicos.
3. **`Database.md`:** modelo lógico, relaciones, integridad, índices y auditoría de datos.
4. **`API.md`:** contratos HTTP, errores, idempotencia, concurrencia y recursos.
5. **`UI_UX.md` y `AppFlow.md`:** navegación, pantallas, estados visibles, accesibilidad y flujos alternativos.
6. **`Implementation_Plan.md`:** orden de ejecución, gates, riesgos y criterios de salida.
7. **`TASKS.md`:** alcance autorizado, dependencias y Definition of Done de cada paquete de trabajo.
8. **`PROJECT_RULES.md`:** reglas permanentes de implementación y colaboración.
9. **ADR aprobado más reciente:** decisión puntual que modifica o precisa arquitectura.

Si dos documentos de igual o mayor autoridad se contradicen:

- la tarea se marca bloqueada;
- se registra la contradicción;
- no se elige una interpretación por conveniencia;
- se emite una decisión formal y se actualizan todos los documentos afectados.

---

## 4. Invariantes del producto

Las siguientes reglas no pueden romperse mediante una implementación local.

### 4.1 Arquitectura

- El sistema comienza como **monolito modular con workers asíncronos**.
- La PWA privada, el portal público, la API, el worker general y el worker PDF son despliegues independientes.
- No se crearán microservicios sin evidencia operativa y ADR aprobado.
- El dominio no dependerá directamente de frameworks, SDKs cloud ni ORM.
- Las integraciones externas se accederán mediante puertos y adaptadores.

### 4.2 Multiempresa y autorización

- Toda operación privada DEBE resolver usuario, cuenta, ámbito y permiso.
- La autorización es **denegación por defecto**.
- Ningún endpoint, job, consulta, archivo o canal offline puede confiar solo en un identificador recibido del cliente.
- Las relaciones de cuenta, sucursal y máquina deben validarse en servidor.
- Se deben incluir pruebas negativas de acceso cruzado entre cuentas.

### 4.3 Datos e historia

- La máquina es un activo permanente independiente de su propietario o ubicación actual.
- El código ICE24 OS es estable e inmutable.
- El historial técnico y sanitario no se elimina al trasladar o transferir una máquina.
- Las entidades con trazabilidad no usan hard delete.
- Correcciones, anulaciones, transferencias y cambios críticos conservan versión, actor, fecha y motivo.
- Las plantillas publicadas son versionadas; no se modifica retrospectivamente la definición usada por registros históricos.

### 4.4 Estados y transiciones

- Los estados se modelan mediante catálogos o máquinas de estado explícitas.
- No se cambia un estado crítico con un `PATCH` genérico de campos.
- Cada transición valida estado anterior, permiso, precondiciones, campos obligatorios e idempotencia.
- Estado operativo, técnico, sanitario, de suscripción y de publicación permanecen separados.

### 4.5 Auditoría

- Toda acción sensible genera auditoría de negocio.
- La auditoría debe confirmarse dentro de la misma unidad de consistencia que la acción cuando ambas residan en la misma base transaccional.
- Los registros de auditoría son append-only y no editables por usuarios.
- Los logs técnicos nunca sustituyen la auditoría funcional.

### 4.6 Publicación

- Completar, aprobar o marcar conforme un registro no lo publica automáticamente.
- La publicación y el retiro son acciones deliberadas, autorizadas y auditadas.
- El portal público consume una proyección o versión pública protegida, no el documento privado original.
- Los resultados no conformes no se publican automáticamente.

### 4.7 Archivos

- Los binarios no se almacenan en Base64 dentro de PostgreSQL.
- Todo archivo privado reside en almacenamiento de objetos y se referencia mediante metadatos.
- Las descargas privadas utilizan autorización y URL temporal.
- Los archivos cargados permanecen en cuarentena hasta validación y análisis.
- Los originales y sus derivados públicos mantienen relación y versión.

### 4.8 Procesamiento asíncrono

- Reportes, PDF, importaciones, correos, exportaciones y tareas pesadas no bloquean el request interactivo.
- Los mensajes y jobs deben ser idempotentes y tolerar entrega repetida.
- Los cambios de negocio que originan mensajes usan patrón outbox o mecanismo equivalente de consistencia.
- Todo consumidor define reintentos, timeout, DLQ, métricas y procedimiento de reproceso.

### 4.9 Offline

- Solo son offline las operaciones expresamente permitidas en el PRD/TRD/AppFlow.
- Tomar pedidos, crear usuarios, cambiar configuración, importar Excel o generar reportes requiere conexión.
- Los cambios concurrentes no se sobrescriben silenciosamente.
- Cerrar sesión, perder permiso o desactivar al usuario debe eliminar los datos locales protegidos.

---

## 5. Stack tecnológico aprobado

Las versiones exactas se fijarán en el repositorio y lockfile. Se utilizarán versiones estables y soportadas, nunca variantes early access para componentes críticos.

| Capa | Tecnología o regla |
|---|---|
| Lenguaje | TypeScript estricto sobre una versión activa LTS de Node.js |
| Monorepo | pnpm workspaces + Turborepo |
| Aplicación privada | Next.js + React + App Router, con PWA y BFF |
| Portal público | Next.js en despliegue separado |
| API | NestJS modular |
| Contrato HTTP | REST + OpenAPI, versión mayor inicial `/v1` salvo ADR posterior |
| Base de datos | PostgreSQL, major soportado en producción |
| Geoespacial | PostGIS |
| Acceso a datos | Prisma estable, complementado con SQL explícito revisado |
| Identidad | Keycloak estable mediante OIDC |
| Base local PWA | IndexedDB mediante Dexie |
| Objetos | Amazon S3 o servicio compatible con S3 |
| Colas | Amazon SQS o servicio durable equivalente |
| Scheduler | EventBridge Scheduler o servicio administrado equivalente |
| PDF | Playwright + Chromium en worker dedicado |
| Observabilidad | OpenTelemetry |
| Contenedores | Docker |
| Infraestructura como código | Terraform |
| E2E | Playwright Test |
| Integración | Testcontainers |
| Unitarias | Elegir exactamente uno entre Vitest o Jest en Fase 0 |

### 5.1 Reglas del stack

- No se sustituye una tecnología aprobada sin ADR.
- No se agrega un segundo framework para resolver el mismo tipo de problema.
- Next.js no reemplaza la API de negocio mediante Server Actions.
- Prisma no limita el uso de capacidades nativas de PostgreSQL.
- Los SDKs de AWS o de otros proveedores solo se usan dentro de adaptadores de infraestructura.
- El dominio no importa NestJS, Prisma, Keycloak, S3, SQS ni librerías de UI.
- Toda dependencia crítica debe tener versión fijada y plan de actualización.

### 5.2 Decisiones todavía abiertas

Hasta que Fase 0 las cierre, no se deben decidir unilateralmente:

- Vitest o Jest;
- proveedor cloud definitivo, región y topología final;
- proveedor de correo, mapas y antivirus;
- objetivos comprometidos de disponibilidad, RPO y RTO;
- versiones exactas de Node.js, frameworks y servicios;
- política definitiva de retención;
- matriz final de navegadores y dispositivos;
- límites regulatorios o sanitarios;
- MVP comercial definitivo.

---

## 6. Estructura del repositorio

```text
/apps
  /private-web
  /public-portal
  /api
  /worker
  /pdf-worker
/packages
  /contracts
  /ui
  /domain
  /authorization
  /database
  /offline
  /config
  /observability
  /testing
/infra
  /terraform
  /containers
/docs
  /adr
  /diagrams
  /runbooks
  /security
  /product
  /api
  /data
  /ux
```

### 6.1 Propósito de cada área

| Ruta | Responsabilidad |
|---|---|
| `apps/private-web` | PWA privada, navegación autenticada y BFF del navegador |
| `apps/public-portal` | Portal público, rutas QR y proyecciones publicables |
| `apps/api` | Casos de uso y API transaccional del monolito modular |
| `apps/worker` | Jobs generales, correo, importaciones, alertas y reconciliaciones |
| `apps/pdf-worker` | Vista renderizada, generación y validación de PDF |
| `packages/contracts` | OpenAPI, DTOs, errores, eventos y esquemas compartidos |
| `packages/ui` | Tokens y componentes accesibles del sistema de diseño |
| `packages/domain` | Primitivas y lógica de dominio independiente de infraestructura |
| `packages/authorization` | Acciones, ámbitos, políticas RBAC/ABAC y evaluación |
| `packages/database` | Prisma, migraciones, SQL explícito, semillas y transacciones |
| `packages/offline` | Dexie, esquema local, cola y sincronización |
| `packages/config` | Configuración tipada y validada |
| `packages/observability` | Logs, trazas, métricas y correlación |
| `packages/testing` | Builders, fixtures, helpers, stubs y utilidades de aislamiento |
| `infra` | Terraform, políticas, imágenes y configuración de runtime |
| `docs` | ADR, contratos, diagramas, runbooks, seguridad y producto |

### 6.2 Estructura interna de un módulo backend

Cada módulo se organiza por dominio, no por tipo técnico global:

```text
/modules/<module-name>
  /domain
  /application
  /infrastructure
  /interface
  /tests
  README.md
```

Reglas:

- `domain` contiene invariantes, valores, estados y eventos.
- `application` contiene casos de uso, orquestación, transacciones y puertos.
- `infrastructure` contiene repositorios, SDKs, ORM y adaptadores.
- `interface` contiene controladores HTTP, consumidores y schedulers.
- No se crean carpetas globales que mezclen todos los `controllers`, `services` o `repositories`.
- Un controlador no accede directamente a Prisma.
- Un módulo no consulta tablas internas de otro módulo sin contrato aprobado.

---

## 7. Reglas de dependencias internas

### 7.1 Dirección permitida

La dirección conceptual es:

`Interface → Application → Domain`

`Infrastructure → Application/Domain mediante puertos`

El dominio no conoce las capas exteriores.

### 7.2 Reglas obligatorias

- Las aplicaciones pueden consumir paquetes compartidos; los paquetes no deben importar aplicaciones.
- `packages/contracts` no importa entidades Prisma.
- `packages/domain` no importa UI, ORM, HTTP o cloud.
- `packages/ui` no contiene reglas de negocio.
- `packages/database` no expone modelos ORM como contratos públicos.
- `packages/authorization` no depende de pantallas o controladores.
- Los módulos se comunican mediante casos de uso públicos, eventos o contratos; no mediante acceso lateral a repositorios privados.
- Las dependencias circulares están prohibidas.
- Las excepciones requieren ADR y prueba de arquitectura.

---

## 8. Estándares de código

### 8.1 TypeScript

- `strict` es obligatorio.
- No se permite `any` salvo boundary externo inevitable, validado inmediatamente y justificado.
- Se prefiere `unknown` para datos no confiables.
- No se usa type assertion para silenciar errores sin validación.
- Los contratos externos se validan en runtime.
- Los valores opcionales deben modelarse explícitamente; no se usan cadenas vacías como sustituto de ausencia.
- Los errores esperados se representan mediante tipos o excepciones de dominio normalizadas.

### 8.2 Nombres

| Elemento | Convención |
|---|---|
| Código, clases, funciones y variables | Inglés |
| UI y mensajes para usuario | Español inicialmente |
| Documentación de negocio | Español |
| Archivos TypeScript | `kebab-case` |
| Variables y funciones | `camelCase` |
| Clases, tipos, interfaces y componentes | `PascalCase` |
| Constantes globales reales | `UPPER_SNAKE_CASE` |
| Tablas y columnas | `snake_case` |
| Recursos HTTP | Plurales, vocabulario estable y en inglés |
| Eventos | Hecho en pasado, por ejemplo `MachineApproved` |
| IDs internos | Sufijo `Id`, nunca folio o código como PK |
| Booleanos | Prefijo semántico: `is`, `has`, `can`, `should` |

### 8.3 Funciones y clases

- Cada unidad debe tener una sola responsabilidad observable.
- Se prefieren funciones pequeñas con entradas y salidas claras.
- No se crean servicios “god object”.
- Un caso de uso no mezcla validación HTTP, persistencia y presentación.
- La lógica duplicada en dos módulos debe evaluarse antes de extraerla; no se crea abstracción prematura.
- Las dependencias se inyectan mediante interfaces o tokens definidos en la capa adecuada.

### 8.4 Comentarios

- Los comentarios explican **por qué**, restricciones o riesgos; no narran código obvio.
- Todo workaround incluye motivo, enlace a tarea y condición de retiro.
- No se aceptan comentarios desactualizados.
- La documentación pública de contratos debe indicar invariantes y errores relevantes.
- `TODO` y `FIXME` deben incluir ID de tarea o issue; no se admiten marcadores anónimos.

### 8.5 Formato y lint

- Todo archivo debe pasar el formatter y linter aprobados.
- No se deshabilita una regla global desde un archivo sin justificación específica.
- Las excepciones de lint deben ser de alcance mínimo.
- Imports no utilizados y código muerto son errores de CI.
- El orden de imports debe ser determinista.

### 8.6 Valores de dominio

- Fechas persistidas en UTC.
- Programaciones guardan hora local, zona IANA y siguiente ejecución UTC.
- La interfaz usa inicialmente `DD/MM/AAAA`.
- Dinero se almacena en enteros de centavos con código de moneda.
- No se usa punto flotante binario para dinero.
- Mediciones usan decimal, precisión y unidad explícita.
- IDs técnicos, códigos de negocio y folios son conceptos separados.
- Estados críticos no se derivan de texto libre.

---

## 9. Contratos de API

- Todo endpoint nuevo o modificado debe estar definido en OpenAPI.
- Toda entrada se valida y normaliza en servidor.
- Los DTOs son contratos; no son entidades ORM.
- Las respuestas de error siguen el formato normalizado de `API.md` y TRD.
- Los recursos se nombran en plural.
- Las listas de alto crecimiento usan cursor.
- Los filtros y ordenamientos permitidos se enumeran; no se aceptan expresiones arbitrarias.
- Las operaciones pesadas responden con un recurso de job y código asíncrono apropiado.
- Las mutaciones sensibles usan versión esperada o ETag.
- Las operaciones reintentables usan `Idempotency-Key`.
- Toda respuesta privada se filtra según permisos y clasificación de datos.
- No se expone información que permita confirmar la existencia de recursos no autorizados.

### 9.1 Todo endpoint privado DEBE incluir

- autenticación;
- resolución de contexto;
- autorización por objeto;
- validación de entrada;
- manejo de concurrencia cuando aplique;
- auditoría cuando la acción sea sensible;
- errores normalizados;
- correlación;
- pruebas positivas y negativas;
- actualización de OpenAPI.

### 9.2 Endpoints prohibidos

- endpoints que permitan escribir un estado crítico como campo arbitrario;
- endpoints sin límite o paginación sobre colecciones crecientes;
- endpoints administrativos ocultos sin contrato y autorización;
- endpoints que entreguen URLs permanentes de objetos privados;
- endpoints que acepten `account_id` como única prueba de acceso;
- endpoints que expongan payloads completos de proveedores externos.

---

## 10. Base de datos y migraciones

### 10.1 Modelado

- Todas las tablas usan PK técnica.
- Folios y códigos de negocio tienen restricciones únicas, pero no son PK.
- Se aplican `NOT NULL`, `UNIQUE`, `CHECK` y FK siempre que el dominio lo permita.
- Las entidades privadas incluyen contexto de cuenta o una relación verificable equivalente.
- Las FK compuestas se usan cuando sean necesarias para impedir referencias cruzadas entre cuentas.
- Los periodos activos que no pueden solaparse deben protegerse mediante restricciones adecuadas.
- JSONB solo se usa cuando la estructura dinámica está justificada y versionada.
- No se usa JSONB como sustituto de un modelo relacional conocido.

### 10.2 Acceso a datos

- Prisma se utiliza para acceso tipado cotidiano.
- SQL explícito es obligatorio cuando se requiera PostGIS, RLS, particiones, vistas, cargas masivas o consultas complejas.
- Toda consulta SQL explícita debe estar parametrizada, revisada y cubierta por prueba de integración.
- Se evita N+1.
- Se seleccionan únicamente las columnas necesarias.
- Los índices se justifican mediante patrones de consulta o medición.

### 10.3 Migraciones

- Una migración aplicada en producción nunca se modifica.
- Los cambios destructivos siguen expansión y contracción.
- Las migraciones deben ser compatibles con la versión anterior durante la ventana de despliegue.
- Los backfills grandes se ejecutan como jobs controlados, no dentro de una migración bloqueante.
- Todo cambio de alto riesgo requiere backup, dry run y plan de reversión.
- Toda migración incluye validación de integridad y tiempo esperado.
- No se desactivan constraints para “hacer pasar” una carga sin estrategia de reconciliación.

### 10.4 Datos de prueba y semillas

- Los datos semilla nunca contienen información real sensible.
- Los fixtures deben ser deterministas.
- Las cuentas de prueba incluyen al menos dos tenants para validar aislamiento.
- Los datos regulatorios ficticios deben marcarse como ficticios y no pueden llegar a producción.

---

## 11. Frontend, UI y accesibilidad

- La navegación se deriva de permisos y módulos habilitados.
- Ocultar una acción en UI no sustituye autorización en servidor.
- Todo componente consume tokens semánticos del sistema de diseño.
- No se asignan colores aislados directamente a estados de negocio.
- Los componentes deben soportar carga, vacío, error, éxito, modo lectura y offline cuando aplique.
- Las pantallas se diseñan para móvil, tableta y escritorio según `UI_UX.md`.
- Las tablas deben tener transformación responsive definida.
- Los formularios conservan valores ante errores recuperables.
- Los cambios no guardados deben advertirse.
- El foco se gestiona al abrir diálogos, cambiar rutas o mostrar errores.
- Los mensajes no dependen exclusivamente de color o icono.
- El objetivo mínimo es WCAG 2.2 AA.
- Toda pantalla modificada debe probar teclado, semántica, contraste, zoom y reflow según su alcance.
- Los componentes reutilizables se documentan en el catálogo visual.

### 11.1 PWA y estado cliente

- El estado del servidor no se duplica innecesariamente en stores globales.
- El caché no puede mostrar datos de un contexto anterior después de cambiar de cuenta.
- Los service workers y cachés deben versionarse y tener estrategia de actualización.
- Los datos sensibles offline se minimizan y tienen vigencia.
- La UI muestra claramente `pendiente`, `sincronizando`, `cargado`, `error` o `conflicto`.

---

## 12. Jobs, eventos e integraciones

### 12.1 Eventos

Todo evento incluye:

- `eventId`;
- tipo y versión;
- aggregate ID y versión;
- timestamp UTC;
- actor y contexto;
- correlation ID;
- causation ID;
- payload mínimo;
- clasificación de sensibilidad;
- identificador externo cuando provenga de un proveedor.

### 12.2 Consumidores

Todo consumidor debe:

- verificar idempotencia;
- validar versión de contrato;
- registrar inicio, resultado y duración;
- definir retry y backoff;
- enviar fallos terminales a DLQ;
- no registrar datos sensibles;
- exponer métricas;
- tener runbook de reproceso.

### 12.3 Integraciones externas

- Toda integración usa adapter.
- Debe definir timeout, retry, límites y comportamiento degradado.
- Los webhooks se verifican criptográficamente cuando el proveedor lo soporte.
- Los eventos externos se almacenan para idempotencia y reconciliación.
- Los errores del proveedor no se exponen directamente al usuario.
- Los SDKs externos no se propagan al dominio.
- No se asume entrega ordenada de webhooks o mensajes.

---

## 13. Autenticación y autorización

- Keycloak autentica; ICE24 OS mantiene perfiles, membresías, asociaciones y permisos de negocio.
- El navegador usa sesión BFF segura; los tokens no deben exponerse a JavaScript cuando el diseño de sesión permita evitarlo.
- Cookies de sesión: `Secure`, `HttpOnly` y política `SameSite` adecuada.
- Las mutaciones BFF deben protegerse contra CSRF.
- El 2FA usa mecanismos aprobados; los códigos nunca se registran.
- El cierre de sesión individual, por usuario o global debe revocar el acceso efectivo.
- Los permisos se evalúan con modelo híbrido RBAC/ABAC.
- La autorización se aplica por cuenta, sucursal, máquina, módulo, acción y sensibilidad.
- Los administradores no obtienen acceso implícito fuera de su ámbito.
- Los endpoints públicos usan allowlist de campos, no denylist.

---

## 14. Seguridad

La línea base recomendada es OWASP ASVS nivel 2, con controles adicionales en multiempresa, archivos, publicación, sanidad, pagos y exportación.

### 14.1 Reglas obligatorias

- HTTPS y HSTS en producción.
- CSP restrictiva.
- CORS limitado a orígenes explícitos.
- Rate limiting por IP, sesión, usuario y ruta sensible.
- Validación y normalización en servidor.
- Codificación de salida según contexto.
- Protección contra IDOR mediante autorización por objeto.
- Escaneo estático, dependencias, secretos e imágenes en CI.
- Contenedores sin root cuando sea viable.
- IAM de privilegio mínimo.
- Producción separada de no producción.
- Acceso administrativo individual con MFA.
- Backups protegidos contra eliminación accidental.

### 14.2 Secretos

- Nunca se guardan secretos en Git, `.env` versionados, logs, fixtures o documentación.
- Los secretos viven en un gestor aprobado.
- Cada entorno usa credenciales separadas.
- Los secretos deben rotarse.
- Las credenciales de base se separan por función cuando corresponda: aplicación, migración y operación.
- Un secreto expuesto se revoca; no basta con eliminarlo del commit más reciente.

### 14.3 Archivos

- Se valida extensión, MIME y firma real.
- Límites iniciales: imagen 10 MB, PDF 25 MB, Excel 20 MB, salvo cambio versionado.
- Todo archivo pasa por cuarentena y antimalware.
- Los nombres físicos son aleatorios.
- No se sirve contenido activo desde el dominio principal.
- PDF y Excel se procesan en workers aislados.
- Las URLs temporales usan expiración y alcance mínimos.

### 14.4 Datos sensibles

Todo dato se clasifica como:

- público;
- interno;
- confidencial;
- sensible sanitario o financiero;
- secreto técnico.

La clasificación determina acceso, cifrado, retención, logging, offline, publicación y exportación.

---

## 15. Configuración y entornos

- Toda configuración tiene esquema tipado y validación al arrancar.
- La aplicación debe fallar rápido ante configuración obligatoria inválida.
- No existen valores secretos por defecto.
- La configuración de negocio versionable vive en base de datos, no en variables de entorno.
- La configuración por entorno vive fuera del código.
- Los feature flags tienen propietario, propósito y condición de retiro.
- Los ambientes mínimos son `development`, `test`, `staging` y `production`.
- Staging debe reproducir identidad, colas, objetos, PDF y webhooks con credenciales de prueba.
- Los valores de producción no se copian a entornos locales.
- Los agentes de IA no pueden inventar claves o valores de infraestructura.

---

## 16. Logging, auditoría y observabilidad

### 16.1 Logging técnico

Todos los servicios producen logs estructurados con:

- timestamp UTC;
- nivel;
- servicio, versión y entorno;
- correlation ID;
- trace ID y span ID;
- request ID o job ID;
- módulo;
- resultado y duración;
- código de error normalizado;
- cuenta y usuario pseudonimizados cuando sea necesario.

### 16.2 Datos prohibidos en logs

- contraseñas;
- OTP;
- tokens, cookies o claves API;
- secretos de webhooks;
- documentos completos;
- payloads binarios;
- datos fiscales completos;
- resultados sanitarios detallados sin razón operativa;
- direcciones o teléfonos completos sin aprobación.

### 16.3 Niveles

- `error`: fallo que afecta la operación o requiere investigación.
- `warn`: condición degradada, reintento o recuperación relevante.
- `info`: eventos técnicos significativos de bajo volumen.
- `debug`: deshabilitado normalmente en producción.
- `trace`: excepcional y muestreado.

### 16.4 Métricas mínimas

- latencia y error por endpoint;
- consultas lentas;
- profundidad y edad de colas;
- jobs exitosos y fallidos;
- PDF e importaciones;
- carga y escaneo de archivos;
- webhooks recibidos, duplicados y fallidos;
- correos exitosos y fallidos;
- conflictos offline;
- errores agregados de autenticación/autorización;
- caché del portal;
- almacenamiento consumido.

### 16.5 Correlación

El correlation ID debe atravesar request, transacción, evento, job, integración y log. No se generan identificadores inconexos que impidan seguir una operación extremo a extremo.

---

## 17. Rendimiento y escalabilidad

### 17.1 Principios

- Los requests interactivos no esperan trabajos pesados.
- Toda lista creciente se pagina.
- Los archivos se cargan directamente al almacenamiento de objetos.
- El portal público usa CDN y caché.
- Las imágenes se sirven en dimensiones adecuadas.
- Las importaciones masivas y reportes se procesan de forma asíncrona.
- Web, API y workers deben ser stateless respecto a sesión persistente.
- El worker PDF escala de manera independiente.
- No se introduce sharding en las primeras etapas.

### 17.2 Presupuestos iniciales propuestos

Estos objetivos son provisionales hasta validación de Fase 0:

| Operación | Objetivo inicial |
|---|---:|
| Lectura API común | p95 ≤ 500 ms, sin red del usuario |
| Escritura API común | p95 ≤ 800 ms, sin efectos asíncronos |
| Autorización de carga directa | p95 ≤ 1 s |
| Portal público cacheado, origen | p95 ≤ 300 ms |
| Página privada principal | LCP ≤ 2.5 s en dispositivo/red acordados |
| Encolado de alerta crítica | ≤ 60 s desde confirmación |
| Inicio de job en operación normal | p95 ≤ 30 s |
| Reporte estándar | ≤ 2 min |
| Sincronización sin archivo | ≤ 2 s con conexión estable |

### 17.3 Reglas de optimización

- Medir antes de optimizar.
- No se aprueba una consulta crítica sin revisar su plan cuando el volumen lo justifique.
- Evitar N+1 y overfetching.
- Usar índices compuestos alineados con cuenta, estado y fecha.
- No consultar JSONB sin estrategia de índice.
- Los dashboards complejos pueden usar proyecciones o agregados.
- Una caché debe definir clave, ámbito, TTL, invalidación y protección multiempresa.

### 17.4 Separación futura de servicios

Un módulo solo puede extraerse si existe evidencia de escalamiento, disponibilidad, aislamiento tecnológico o propiedad de equipo que lo justifique. La separación requiere ADR y contrato maduro.

---

## 18. Estrategia de pruebas

### 18.1 Regla general

Todo comportamiento nuevo debe probarse en el nivel más bajo que demuestre la regla y complementarse con pruebas de integración o E2E cuando atraviese boundaries reales.

### 18.2 Tipos de prueba

| Nivel | Cobertura obligatoria |
|---|---|
| Unitarias | Invariantes, valores, fórmulas, transiciones, autorización y deduplicación |
| Integración | PostgreSQL/PostGIS, repositorios, constraints, transacciones, outbox, objetos, colas e identidad |
| Contrato | OpenAPI, eventos, errores, webhooks, Excel y compatibilidad de versiones |
| E2E | Flujos críticos por rol y dispositivo |
| Aislamiento | Acceso cruzado entre cuentas, sucursales y máquinas |
| Seguridad | IDOR, elevación, CSRF, XSS, CORS, carga maliciosa, sesiones y URLs temporales |
| Offline | Descarga, reintento, cierre inesperado, conflicto, revocación y limpieza local |
| PDF | Fidelidad, paginación, marca de agua, folio, imágenes y tamaño |
| Rendimiento | Endpoints, dashboards, importaciones, jobs y portal |
| Recuperación | Backup, restore, DLQ, reconciliación y rollback |
| Accesibilidad | Teclado, foco, semántica, contraste, zoom y reflow |
| UAT | Procesos reales validados por responsables funcionales |

### 18.3 Reglas de pruebas

- No se escriben pruebas que dependan del orden de ejecución.
- No se usan delays arbitrarios cuando puede observarse una condición.
- Las pruebas de integración usan dependencias reales efímeras mediante Testcontainers cuando sea aplicable.
- Los mocks se limitan a boundaries externos; no se mockea la lógica que se intenta validar.
- Los errores y rutas negativas son obligatorios.
- Los módulos privados deben tener al menos dos cuentas en escenarios de aislamiento.
- Los bugs de producción requieren una prueba de regresión cuando sea técnicamente viable.
- No se reduce una aserción para hacer pasar una implementación defectuosa.
- La cobertura numérica es un indicador, no una sustitución de casos relevantes.

### 18.4 Quality gates

Todo pull request debe superar, según aplique:

1. formatter y lint;
2. TypeScript y build;
3. pruebas unitarias;
4. pruebas de integración;
5. contratos;
6. validación de migraciones;
7. aislamiento y autorización;
8. idempotencia y auditoría;
9. análisis de secretos y dependencias;
10. E2E crítico;
11. accesibilidad de UI modificada;
12. observabilidad y documentación.

---

## 19. Convenciones de Git

### 19.1 Ramas

- `main` es la rama principal protegida y siempre debe ser desplegable.
- No se hace push directo a `main`.
- No se requiere una rama `develop` permanente salvo decisión posterior.
- Cada tarea usa una rama corta basada en su ID.

Formato recomendado:

```text
<type>/<task-id>-<short-description>
```

Tipos permitidos:

- `feat`
- `fix`
- `refactor`
- `test`
- `docs`
- `chore`
- `infra`
- `security`

Ejemplos:

```text
feat/task-f4-07-machine-registration-draft
fix/task-f7-12-sync-idempotency
security/task-f3-13-tenant-isolation-tests
```

Reglas:

- una rama representa una tarea o paquete coherente;
- las ramas deben ser de corta duración;
- no se mezclan refactors amplios con funcionalidad no relacionada;
- los cambios de contratos y consumidores deben viajar juntos o mediante estrategia compatible;
- toda rama se actualiza con `main` antes de merge cuando exista conflicto material.

### 19.2 Commits

Se adopta **Conventional Commits**.

Formato:

```text
<type>(<scope>): <imperative summary>
```

Tipos principales:

- `feat`
- `fix`
- `refactor`
- `test`
- `docs`
- `chore`
- `build`
- `ci`
- `perf`
- `security`
- `revert`

Reglas:

- el resumen se escribe en inglés, en imperativo y sin punto final;
- el scope corresponde a app, package o módulo;
- el cuerpo explica motivación y decisiones cuando el cambio no es trivial;
- el footer referencia tarea, issue y breaking change;
- no se usan mensajes como `changes`, `fix stuff`, `wip` o `update` en commits finales;
- cada commit debe dejar el repositorio en un estado razonablemente consistente;
- secretos, archivos generados innecesarios y binarios no se incluyen.

Ejemplo:

```text
feat(machines): add registration draft workflow

Implements TASK-F4-07 and preserves tenant-scoped ownership checks.

Refs: TASK-F4-07
```

### 19.3 Pull requests

Todo PR debe incluir:

- ID de tarea;
- propósito y alcance;
- archivos y módulos modificados;
- requisitos y contratos cubiertos;
- migraciones y compatibilidad;
- pruebas ejecutadas y resultados;
- impacto en seguridad, aislamiento y datos;
- impacto en rendimiento;
- capturas o evidencia visual cuando aplique;
- ADR o decisión asociada;
- riesgos, deuda y pasos manuales;
- checklist de Definition of Done.

Revisión humana obligatoria para:

- autenticación y autorización;
- aislamiento multiempresa;
- migraciones y SQL explícito;
- publicación pública;
- sanidad y restricciones;
- suscripciones, pagos y webhooks;
- archivos y exportaciones;
- criptografía, secretos e infraestructura productiva;
- cambios al presente documento.

### 19.4 Merge

- Solo se permite merge con CI verde y aprobaciones requeridas.
- Se recomienda squash merge para mantener una unidad por tarea, salvo que la historia de commits tenga valor técnico explícito.
- El título final del PR debe cumplir Conventional Commits.
- No se hace force push a ramas protegidas.
- Un cambio urgente posterior a producción sigue el mismo proceso, con revisión acelerada pero no omitida.

---

## 20. CI/CD y despliegues

### 20.1 Pipeline mínimo

1. instalar dependencias desde lockfile;
2. verificar formato y lint;
3. compilar y verificar tipos;
4. ejecutar pruebas unitarias;
5. ejecutar pruebas de integración relevantes;
6. validar contratos y migraciones;
7. escanear secretos y dependencias;
8. construir imágenes;
9. escanear imágenes;
10. desplegar a entorno efímero o staging;
11. ejecutar E2E y pruebas de seguridad aplicables;
12. solicitar aprobación para producción.

### 20.2 Despliegues

- Los despliegues son repetibles y automatizados.
- El artefacto promovido entre entornos debe ser el mismo.
- La configuración se inyecta por ambiente.
- La aplicación debe tener rollback independiente de migraciones.
- Las migraciones deben ser backward compatible durante el rollout.
- Los módulos incompletos se protegen con feature flags.
- Producción requiere aprobación humana y evidencia de gates.
- Un deploy no se considera completo hasta verificar health checks y métricas.

---

## 21. Política de dependencias de software

### 21.1 Adición de librerías

No se agrega una librería sin evaluar:

- necesidad real;
- alternativas ya presentes;
- mantenimiento y actividad del proyecto;
- licencia;
- vulnerabilidades conocidas;
- tamaño e impacto de runtime;
- compatibilidad con el stack;
- capacidad de reemplazo;
- soporte de TypeScript;
- efecto en frontend, server o worker.

### 21.2 Reglas

- El lockfile es obligatorio y se versiona.
- No se usa `latest` sin versión resuelta por lockfile.
- No se agregan dos librerías para el mismo propósito sin ADR.
- No se adoptan versiones alpha, beta, RC o experimental en componentes críticos.
- Los cambios mayores requieren ADR o plan de compatibilidad.
- Las actualizaciones pequeñas y frecuentes son preferibles a saltos grandes.
- El inventario de dependencias y licencias debe mantenerse actualizado.
- Las dependencias no usadas se eliminan.
- El código copiado de fuentes externas requiere licencia compatible y atribución.

### 21.3 Aprobación requerida

Requieren aprobación del Tech Lead o ADR:

- framework, ORM, auth, cola, base o cloud nuevo;
- librería que ejecute código nativo;
- librería que procese archivos no confiables;
- dependencia con acceso a secretos o red;
- dependencia sin mantenimiento activo;
- SDK que acople el dominio a un proveedor;
- librería que afecte el bundle principal de forma significativa.

---

## 22. Documentación y ADR

- Toda decisión arquitectónica relevante se registra en `/docs/adr`.
- Los ADR son inmutables una vez aceptados; una nueva decisión los reemplaza mediante otro ADR.
- Todo módulo tiene `README.md` con propósito, ownership, entidades, estados, puertos, eventos, permisos y métricas.
- Toda API modifica OpenAPI en el mismo cambio.
- Todo evento modifica su contrato y versión cuando corresponda.
- Toda migración relevante actualiza documentación de datos.
- Todo flujo visible nuevo actualiza UI/UX o AppFlow si cambia el contrato aprobado.
- Todo job o integración crítica tiene runbook.
- Toda funcionalidad con riesgo de seguridad actualiza threat model.
- La documentación no debe afirmar que una propuesta abierta ya fue aprobada.

---

## 23. Reglas para agentes de IA

### 23.1 Antes de modificar

La IA DEBE:

1. leer la tarea y sus dependencias;
2. leer las secciones fuente indicadas;
3. confirmar que la tarea está en estado `Lista`;
4. identificar archivos permitidos y prohibidos;
5. detectar contradicciones o decisiones abiertas;
6. detenerse si falta una decisión material;
7. proponer un plan limitado al alcance.

### 23.2 Durante la implementación

La IA DEBE:

- trabajar solo dentro de la tarea asignada;
- conservar contratos, permisos, estados y auditoría;
- actualizar datos antes de consumidores cuando aplique;
- agregar pruebas junto con el comportamiento;
- mantener compatibilidad durante migraciones y despliegues;
- registrar cualquier deuda o workaround;
- no cambiar documentos de autoridad para justificar una implementación distinta.

### 23.3 Prohibiciones para IA

La IA NO DEBE:

- inventar funcionalidades;
- inventar límites sanitarios, parámetros regulatorios o reglas legales;
- elegir proveedores o versiones pendientes sin aprobación;
- ampliar el alcance “aprovechando” una tarea;
- modificar archivos fuera del alcance autorizado;
- exponer modelos ORM al frontend;
- omitir autorización por considerar una ruta interna;
- desactivar pruebas o restricciones para completar una tarea;
- reemplazar un error por un fallback silencioso;
- realizar migraciones destructivas directas;
- registrar secretos o datos personales;
- afirmar que ejecutó pruebas que no ejecutó;
- ocultar riesgos, fallos o trabajo incompleto.

### 23.4 Reporte obligatorio de finalización

Toda tarea ejecutada por IA debe informar:

- tarea y estado;
- archivos creados, modificados y eliminados;
- requisitos y criterios cubiertos;
- contratos y migraciones;
- pruebas ejecutadas y resultados reales;
- validaciones no ejecutadas;
- impacto en seguridad y aislamiento;
- impacto en rendimiento;
- decisiones y ADR;
- riesgos nuevos;
- deuda técnica;
- pasos de validación manual;
- trabajo pendiente.

---

## 24. Permitido y prohibido

### 24.1 Permitido

- refactorizar dentro del alcance cuando no cambie contratos o comportamiento sin aprobación;
- usar SQL explícito cuando Prisma no cubra correctamente el caso;
- crear adaptadores sustituibles para proveedores;
- agregar índices sustentados por consultas o pruebas;
- usar feature flags para módulos incompletos;
- crear proyecciones de lectura para mejorar paneles;
- dividir una tarea demasiado grande antes de implementarla;
- registrar una decisión abierta y bloquear el trabajo;
- proponer un ADR antes de cambiar arquitectura.

### 24.2 Prohibido

- usar librerías nuevas sin evaluación y aprobación;
- hacer push directo a `main`;
- fusionar con CI fallido;
- omitir validación de entrada en endpoints;
- omitir autorización por objeto;
- usar hard delete donde se exige historia;
- almacenar dinero en `float`;
- depender de la zona horaria del servidor;
- guardar archivos binarios en la base relacional;
- servir objetos privados con URL permanente;
- usar logs técnicos como auditoría;
- publicar automáticamente información interna;
- procesar trabajos pesados dentro del request;
- confiar en el cliente para estados, cuenta o permisos;
- reutilizar entidades Prisma como DTO;
- modificar una migración ya aplicada;
- usar datos reales sensibles en pruebas;
- dejar secretos en repositorio o logs;
- agregar microservicios sin ADR y evidencia;
- aceptar una dependencia experimental para un componente crítico;
- omitir estados de carga, vacío y error en UI;
- cerrar una tarea sin pruebas ni evidencia.

---

## 25. Definition of Ready

Una tarea está lista únicamente cuando:

- tiene ID y objetivo concreto;
- sus dependencias están terminadas;
- los documentos fuente no se contradicen;
- el alcance de archivos está definido;
- las entidades, endpoints, pantallas o jobs afectados están identificados;
- los permisos y estados están definidos;
- los criterios de aceptación son verificables;
- no depende de una decisión abierta material;
- los datos o fixtures necesarios existen;
- se conocen los tipos de pruebas requeridos;
- existe responsable para las aprobaciones humanas necesarias.

Si falta cualquiera de estos elementos, la tarea permanece bloqueada.

---

## 26. Definition of Done global

Una tarea se considera terminada cuando, según aplique:

- cumple todos sus criterios de aceptación;
- respeta el PRD, TRD y documentos derivados;
- no introduce funcionalidad fuera de alcance;
- los contratos están actualizados;
- las migraciones son compatibles y verificadas;
- las reglas viven en Domain/Application, no solo en UI o controller;
- la autorización y el aislamiento están probados;
- la auditoría e idempotencia están probadas;
- los errores son normalizados;
- existen pruebas unitarias, integración, contrato y E2E pertinentes;
- la UI es responsive y accesible;
- logs, métricas y trazas permiten operar el cambio;
- no se introducen vulnerabilidades críticas conocidas;
- CI está verde;
- la documentación y runbooks están actualizados;
- la revisión humana requerida fue aprobada;
- los riesgos y deuda están declarados;
- existe evidencia reproducible de validación.

“Funciona en mi máquina” no constituye Definition of Done.

---

## 27. Excepciones y modificación de estas reglas

Una excepción requiere:

1. descripción de la regla afectada;
2. problema que impide cumplirla;
3. alternativas evaluadas;
4. impacto en seguridad, datos, operación y deuda;
5. alcance y duración de la excepción;
6. responsable;
7. plan y fecha de retiro;
8. aprobación del Tech Lead;
9. aprobación adicional de seguridad, producto, sanitario o jurídico cuando corresponda;
10. ADR si la excepción cambia arquitectura.

Este documento se modifica únicamente mediante pull request independiente o claramente identificado, con revisión del Tech Lead. Los cambios no son retroactivos sobre decisiones históricas sin un plan explícito de migración.

---

## 28. Checklist rápido para cada cambio

### Arquitectura

- [ ] ¿Respeta monolito modular y límites de módulos?
- [ ] ¿Usa puertos/adaptadores para infraestructura externa?
- [ ] ¿Evita dependencias circulares?

### Datos

- [ ] ¿Conserva contexto multiempresa?
- [ ] ¿Mantiene historial y auditoría?
- [ ] ¿La migración es compatible y reversible operativamente?
- [ ] ¿Los índices responden a patrones reales?

### API

- [ ] ¿OpenAPI está actualizado?
- [ ] ¿Valida entrada y autorización por objeto?
- [ ] ¿Maneja concurrencia e idempotencia?
- [ ] ¿Usa errores normalizados?

### Seguridad

- [ ] ¿No expone secretos o datos sensibles?
- [ ] ¿Tiene pruebas negativas de acceso?
- [ ] ¿Los archivos usan cuarentena y URLs temporales?
- [ ] ¿Los logs están sanitizados?

### UI/UX

- [ ] ¿Tiene carga, vacío, error y éxito?
- [ ] ¿Es responsive y accesible?
- [ ] ¿La navegación refleja permisos sin sustituir autorización?
- [ ] ¿Muestra claramente offline, lectura y conflictos?

### Operación

- [ ] ¿Tiene logs, métricas y correlación?
- [ ] ¿Los jobs tienen retry, idempotencia y DLQ?
- [ ] ¿Existe runbook para fallos relevantes?

### Calidad

- [ ] ¿Las pruebas relevantes pasan?
- [ ] ¿CI está verde?
- [ ] ¿La documentación está actualizada?
- [ ] ¿La tarea cumple Definition of Done?

---

## 29. Principio final

> ICE24 OS debe evolucionar mediante cambios pequeños, trazables y verificables. Ninguna conveniencia local justifica romper aislamiento, auditoría, integridad histórica, seguridad, accesibilidad o contratos aprobados.
