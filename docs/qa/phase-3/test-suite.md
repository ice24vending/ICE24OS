# Suite completa de casos de prueba — Fase 3

> **Corrida vigente F3-20260914-SCOPE-03 — COMPLETADA Y APROBADA:** los resultados del alcance individual ajustado están en el [registro de ejecución](execution-register.md) y el [expediente de evidencia](evidence/F3-20260914-SCOPE-03/README.md). Las notas `F3-20260908-AUTO-02` dentro de cada caso son históricas. El pentest externo, la evaluación formal de accesibilidad y las firmas departamentales se registran como `NO_APLICA / EXIMIDO PARA ALCANCE DE ENTREGA`. El responsable confirmó la validación visual multi-cuenta A/B sin mezcla de datos el 14/09/2026.

Estado inicial de TODOS los casos: **NO_EJECUTADO**. Usar [guía](README.md), [datos y recetas](test-data.md) y [ficha de evidencia](evidence-template.md). Los resultados son requisitos a contrastar, no afirmaciones de funcionamiento actual. Registrar una ficha por variante. Toda prueba de mutación negativa incluye observación SIN-EFECTOS; no se aprueba por HTTP aislado.

Las referencias R-ACCOUNT, R-CONTEXT, R-MEMBER, R-TRANSITION, R-RECOVERY, R-APPROVAL, R-SESSION y R-PROFILE se definen con bodies y cabeceras en test-data.md. Las rutas abreviadas de API llevan prefijo `/v1`; las rutas `/api/auth/*` pertenecen al BFF en puerto 3000. `N1` y `N2` son clientes separados, no Cuenta A/B.

## Sección 1 — Validación del entorno técnico local

### ENV-01 — Identificar versión y herramientas

**Prerrequisitos:** Repositorio disponible; RUN abierto.

**Pasos:**

1. Ejecutar git rev-parse HEAD y git status --short; adjuntar resumen de diferencias.
2. Ejecutar git --version, node --version y pnpm --version.
3. Comparar Node con .nvmrc y pnpm con packageManager del package.json, registrar ejecutable utilizado.

**Resultado esperado exacto:** Comandos con salida 0; Node 24.19.0 según baseline y pnpm 11.24.0 fijado en packageManager revisado, o cambio versionado documentado. Una versión sólo dentro de engines no acredita reproducción exacta; ninguna diferencia local queda oculta.

### ENV-02 — Docker cliente y servidor

**Prerrequisitos:** Docker Desktop instalado; entorno local sin datos reales.

**Pasos:**

1. Iniciar Docker Desktop y esperar disponibilidad.
2. Ejecutar docker version.
3. Registrar versiones cliente/servidor y comprobar disponibilidad antes de Testcontainers.

**Resultado esperado exacto:** docker version sale 0 con cliente y servidor. Ausencia de daemon es BLOQUEADO para pruebas de contenedor; no sustituirlas por mocks.

### ENV-03 — Instalación reproducible

**Prerrequisitos:** ENV-01 aprobado; acceso a dependencias.

**Pasos:**

1. Ejecutar pnpm install --frozen-lockfile.
2. Registrar código de salida y errores.
3. Revisar git status --short para detectar cambios inesperados del lockfile.

**Resultado esperado exacto:** Salida 0; lockfile no modificado. No quitar --frozen-lockfile para aprobar; fallo de instalación impide los casos dependientes.

### ENV-04 — Quality gate y referencia de 33 pruebas

**Prerrequisitos:** ENV-03 aprobado.

**Pasos:**

1. Ejecutar pnpm check.
2. Comprobar formato, lint, tipos, boundaries, infra, identity y unitarias en la salida completa.
3. Registrar archivos/tests aprobados, fallidos y omitidos, y tareas Turbo recuperadas.

**Resultado esperado exacto:** Salida 0 en todos los pasos. Baseline conocido: 33 pruebas en 11 archivos; toda variación debe explicarse por el commit. Un skip obligatorio o fallo no se compensa con el total.

### ENV-05 — Build de superficies

**Prerrequisitos:** ENV-04 aprobado.

**Pasos:**

1. Ejecutar pnpm build.
2. Registrar éxito de 14 workspaces del baseline y rutas generadas.
3. Identificar tareas de caché; si se requiere build fresco, Ingeniería ejecuta pnpm build --force y documenta ese intento separado.

**Resultado esperado exacto:** Todas las tareas requeridas salen 0; API, PWA y portal tienen artefactos válidos. El expediente distingue compilación fresca de caché.

### ENV-06 — Integración PostgreSQL/PostGIS

**Prerrequisitos:** ENV-02/03 aprobados; puertos disponibles.

**Pasos:**

1. Ejecutar pnpm test:integration.
2. Comprobar arranque real del contenedor PostGIS y ejecución de la aserción.
3. Registrar resultado y que el contenedor efímero se cierre al terminar.

**Resultado esperado exacto:** Suite sale 0 con la prueba ejecutada, no omitida. Could not find a working container runtime strategy es bloqueo de preparación, no validación de PostgreSQL.

### ENV-07 — Arranque Supabase y reset local

**Prerrequisitos:** Docker disponible; base identificada como local desechable; fixtures aún no creados.

**Pasos:**

1. Ejecutar pnpm exec supabase start.
2. Verificar destino local y guardar confirmación de que se puede descartar su contenido.
3. Ejecutar pnpm exec supabase db reset --local --no-seed.
4. Verificar aplicación de migraciones de plataforma e identidad.

**Resultado esperado exacto:** Ambos comandos salen 0; esquema reconstruido desde migraciones. No se contacta base remota para reset. Sanitizar cualquier credencial emitida por start.

### ENV-08 — Lint SQL

**Prerrequisitos:** ENV-07 aprobado.

**Pasos:**

1. Ejecutar pnpm exec supabase db lint --local --level error.
2. Guardar salida y revisar cada diagnóstico.

**Resultado esperado exacto:** Salida 0 y ningún error SQL del nivel requerido. Advertencias se registran y se evalúan, no se borran del log.

### ENV-09 — pgTAP de plataforma e identidad

**Prerrequisitos:** ENV-08 aprobado.

**Pasos:**

1. Ejecutar pnpm exec supabase test db.
2. Verificar que se ejecutaron ambos archivos de supabase/tests/database.
3. En phase3_identity_test.sql comprobar plan de 18 y ausencia de not ok; registrar total global separado.

**Resultado esperado exacto:** Todas las aserciones ejecutadas pasan. Las 18 son sólo del archivo Fase 3; no describen toda la suite ni prueban el reset final de recuperación.

### ENV-10 — Configuración, arranque y bootstrap

**Prerrequisitos:** ENV-09 aprobado; Ingeniería disponible; recetas de test-data.md.

**Pasos:**

1. Configurar variables de .env.example en cada proceso, sin imprimir secretos.
2. Preparar CTRL/ADMIN mediante bootstrap revisado y registrar IDs.
3. Arrancar pnpm dev:api y pnpm dev:private en terminales distintas.
4. Abrir /v1/health, /v1/docs y UI; obtener sesión válida de ADMIN y consultar /me.

**Resultado esperado exacto:** Health/documentación/UI accesibles y /me 200 con identidad ADMIN correcta. Un health 200 por sí solo no acredita Auth, DB ni BFF. Preparación faltante queda BLOQUEADA.

### ENV-11 — Compatibilidad OIDC/SMTP y políticas de ensayo

**Prerrequisitos:** ENV-10; proyecto de pruebas y buzones controlados; tabla de políticas.

**Pasos:**

1. Obtener discovery del issuer configurado y verificar issuer/JWKS/algoritmo frente al verificador RS256.
2. Registrar cliente OIDC, redirect permitido y audiencia sin secretos.
3. Comprobar que existe SMTP/buzón local o remoto según RUN.
4. Completar valores de TTL, AAL, ventanas TOTP, límites y responsables de la tabla de datos.

**Resultado esperado exacto:** Identidad válida es verificable por la API; no se omite verificación para compatibilidad. Buzón remoto real diferenciado del local. Parámetros sin decisión se señalan como bloqueo de aceptación de sus casos.

## Sección 2 — Acceso, invitación, autenticación y MFA

### AUTH-01 — Alta e invitación A/B vía API

**Prerrequisitos:** ENV-10/11; ADMIN aal2 en CTRL; A/B todavía no existen.

**Pasos:**

1. Enviar R-ACCOUNT con clave de idempotencia nueva para A.
2. Guardar respuesta original, accountId, usuario/invitación y correlación; revisar persistencia y buzón.
3. Repetir para B con nombre, email y clave diferentes.

**Resultado esperado exacto:** HTTP 201 en cada alta exitosa; una cuenta y propietario por solicitud, invitación al correo correcto y ACCOUNT_CREATED sin secretos. Si filas existen pero correo falla, alta integral FALLIDA; conservar evidencia del estado parcial.

### AUTH-02 — Idempotencia y validación del alta

**Prerrequisitos:** AUTH-01; misma solicitud conservada sanitizada.

**Pasos:**

1. Repetir exactamente R-ACCOUNT y su Idempotency-Key.
2. Comparar IDs y conteos; revisar invitaciones duplicadas.
3. Enviar variante sin clave y otra con email malformado usando claves nuevas.

**Resultado esperado exacto:** Reintento no duplica cuenta, propietario ni efectos externos de invitación; devuelve el mismo resultado de negocio. Entradas inválidas se rechazan con 400 normalizado y SIN-EFECTOS; un 500 se registra como defecto.

### AUTH-03 — Primer ingreso por invitación

**Prerrequisitos:** AUTH-01; invitación nueva, propietario aún no activado.

**Pasos:**

1. Abrir link desde el buzón en un perfil limpio.
2. Completar la pantalla de primer ingreso y definir PASS_VALID.
3. Completar MFA cuando lo exige el rol y elegir su cuenta.
4. Consultar /me; comparar sub del proveedor con identity_subject observado.

**Resultado esperado exacto:** El link inicia el recorrido sin login manual previo ni edición SQL de apoyo; propietario activo, vinculado al sub correcto y sólo a su cuenta. No se expone token en evidencia ni se crea perfil duplicado.

### AUTH-04 — Invitación usada, expirada y alta pública

**Prerrequisitos:** INVITE_TTL registrado; invitaciones sintéticas separadas.

**Pasos:**

1. Reabrir una invitación consumida en perfil limpio.
2. Emitir otra y probar después de su TTL/tolerancia, registrando horas.
3. Intentar alta pública con otro correo mediante el flujo del proveedor configurado para el ambiente.

**Resultado esperado exacto:** Enlaces consumidos/vencidos no permiten nueva activación ni cambian credenciales. Alta pública no autorizada se rechaza. Si no existe TTL aprobado, su aceptación queda bloqueada.

### AUTH-05 — Cierre y nuevo login válido

**Prerrequisitos:** AUTH-03; propietario activo.

**Pasos:**

1. Cerrar sesión por UI.
2. Abrir /profile y confirmar salida del área privada.
3. Iniciar con email y PASS_VALID; completar MFA y contexto.
4. Consultar perfil y cuenta elegida.

**Resultado esperado exacto:** Se obtiene una sesión nueva y acceso a la cuenta autorizada. No se restaura la cookie previa ni aparecen datos de otra identidad.

### AUTH-06 — Contraseña errónea

**Prerrequisitos:** AUTH-05; usuario activo, PASS_WRONG de longitud válida.

**Pasos:**

1. Enviar login correcto como control y cerrar.
2. Enviar el mismo email con PASS_WRONG desde UI.
3. Registrar HTTP original, destino, mensaje y auditoría; comprobar ausencia de sesión autenticada.

**Resultado esperado exacto:** Credenciales incorrectas no autentican. Mensaje: No fue posible iniciar sesión. Revisa tus datos o espera antes de intentar otra vez. No se muestra nombre, cuenta ni existencia confirmada; LOGIN_FAILED sin contraseña.

### AUTH-07 — Usuario inexistente y no enumeración

**Prerrequisitos:** AUTH-06; UNKNOWN inexistente; umbral temporal acordado.

**Pasos:**

1. Repetir login con UNKNOWN y la misma PASS_WRONG.
2. Comparar mensaje, HTTP y redirecciones con AUTH-06.
3. Ejecutar pares existentes/inexistentes dentro del límite aprobado; registrar tiempos y comparar con criterio temporal predefinido.

**Resultado esperado exacto:** Mismo mensaje público y comportamiento no identificante; sin perfiles creados para UNKNOWN. No hay diferencia temporal reproducible que incumpla el umbral acordado. Sin umbral, registrar medición sin afirmar protección temporal completa.

### AUTH-08 — Contraseña débil y límite en servidor

**Prerrequisitos:** Usuario en primer ingreso o recuperación válida.

**Pasos:**

1. Introducir PASS_WEAK_SHORT en UI y guardar validación.
2. Enviar la solicitud de cambio directamente al BFF con sesión, Origin y csrfToken válidos para eludir sólo la restricción HTML.
3. Repetir con PASS_VALID; si hay regla adicional aprobada, probar PASS_WEAK_POLICY.

**Resultado esperado exacto:** Clave corta rechazada en cliente y servidor; la vigente no cambia. Clave válida se acepta. No se inventa caducidad por edad ni complejidad no definida.

### AUTH-09 — OIDC Authorization Code + PKCE

**Prerrequisitos:** ENV-11; cliente OIDC/redirect registrados; usuario existente.

**Pasos:**

1. Desde perfil limpio pulsar Continuar con acceso OIDC + PKCE.
2. Verificar petición de autorización con state y code_challenge_method=S256, sin guardar verifier/code.
3. Completar autenticación del proveedor; volver al callback y activar contexto.
4. Comparar /me con la identidad esperada.

**Resultado esperado exacto:** Callback válido crea sesión BFF y acceso autorizado; se usa intercambio de código en servidor con verifier. No hay nueva identidad por cambiar el método de login ni refresh token en almacenamiento JS.

### AUTH-10 — Manipulación de state y replay OIDC

**Prerrequisitos:** AUTH-09; flujos independientes desechables.

**Pasos:**

1. Repetir autorización y alterar únicamente state del callback.
2. En otro intento quitar cookie de flujo; en otro alterar su firma.
3. Reutilizar un código ya consumido en un contexto nuevo.
4. Tras cada intento comprobar /profile y cookie autenticada.

**Resultado esperado exacto:** Todos los callbacks inválidos terminan en acceso rechazado sin nueva sesión ni asociación. Un flujo válido separado sigue funcionando; no confundir caída del proveedor con rechazo de state.

### AUTH-11 — Enrolamiento TOTP real

**Prerrequisitos:** Usuario sin factor; sesión válida; app autenticadora local.

**Pasos:**

1. Abrir /access/mfa e iniciar enrolamiento.
2. Escanear el QR sólo en el autenticador del tester; guardar referencia al factor y no la semilla en evidencia.
3. Introducir código válido y completar verificación.
4. Obtener contexto/sesión elevada y revisar MFA_ENROLLED.

**Resultado esperado exacto:** Factor queda verificado para el usuario correcto; sesión emitida después del challenge alcanza aal2. Tener un factor enrolado sin challenge no eleva por sí solo cualquier sesión anterior.

### AUTH-12 — TOTP correcto

**Prerrequisitos:** AUTH-11; sesión nueva aal1, reloj sincronizado.

**Pasos:**

1. Acceder al challenge del factor propio.
2. Introducir TOTP_VALID dentro de su ventana.
3. Intentar una acción administrativa autorizada por el rol usando token emitido tras la verificación.

**Resultado esperado exacto:** Verificación exitosa, aal2 y operación autorizada funciona. Registrar tiempos/AAL sin código ni semilla.

### AUTH-13 — TOTP incorrecto

**Prerrequisitos:** Factor verificado; sesión aal1; código distinto al actual.

**Pasos:**

1. Enviar TOTP_WRONG al challenge propio.
2. Consultar estado de sesión y repetir acción crítica.
3. Después realizar control con código válido en challenge permitido.

**Resultado esperado exacto:** Código inválido se rechaza, no eleva AAL ni permite acción crítica; evento MFA_CHALLENGE_FAILED sin código. Control válido demuestra que el factor/servicio funciona.

### AUTH-14 — TOTP vencido

**Prerrequisitos:** TOTP_PERIOD/SKEW registrados; factor propio.

**Pasos:**

1. Obtener código local y esperar hasta estar fuera de ventana y tolerancia del proveedor.
2. Enviar ese código a un challenge vigente, para aislar vencimiento del código.
3. Enviar código actual en un nuevo challenge cuando corresponda.

**Resultado esperado exacto:** Código antiguo rechazado y actual aceptado; no elevar AAL en el intento vencido. Si no se puede separar caducidad del challenge, registrar limitación y no atribuirla sólo al TOTP.

### AUTH-15 — MFA antes/después en acción crítica

**Prerrequisitos:** ADMIN con permiso accounts.create, token aal1 y token aal2 del mismo usuario; contextos válidos.

**Pasos:**

1. Con aal1 enviar R-ACCOUNT nuevo y válido.
2. Comprobar que no se creó cuenta/invitación.
3. Completar MFA y repetir con aal2 y clave nueva.
4. Como control negativo, repetir con READ aal2 sin permiso.

**Resultado esperado exacto:** ADMIN aal1 recibe 403 y SIN-EFECTOS; ADMIN aal2 201. READ aal2 recibe 403: MFA no otorga permiso de negocio.

### AUTH-16 — Rutas directas sin sesión

**Prerrequisitos:** Perfil limpio sin cookies.

**Pasos:**

1. Abrir directamente /profile.
2. Abrir directamente /access/context en otro intento limpio.
3. Inspeccionar HTML/cuerpo/redirecciones; enviar GET /v1/me sin bearer.

**Resultado esperado exacto:** Las páginas llevan al acceso y no contienen datos privados, incluso en HTML inicial. API sin bearer devuelve 401.

### AUTH-17 — Rutas con sesión expirada

**Prerrequisitos:** Sesión válida dejada vencer según su expiración efectiva; no alterar reloj global.

**Pasos:**

1. Comprobar acceso antes del vencimiento.
2. Después abrir directamente /profile y /access/context.
3. Repetir GET /v1/me con token original vencido.

**Resultado esperado exacto:** UI obliga a autenticar nuevamente y no muestra perfil/contextos protegidos; API devuelve 401 para el token expirado. Registrar diferencia entre vencimiento de token y cookie.

### AUTH-18 — Identidad pendiente/desactivada y control de intentos

**Prerrequisitos:** PENDING, DISABLED y usuario activo; límites aprobados.

**Pasos:**

1. Probar identidad no activada y usuario desactivado por fixture, con credenciales/token antes válidos.
2. Probar login repetido inválido sólo hasta el límite del entorno.
3. Esperar ventana definida y comprobar recuperación normal de acceso de la identidad activa.

**Resultado esperado exacto:** Perfiles no activos no obtienen acceso privado; no se habilita membresía pendiente. Protección progresiva/bloqueo corresponde a política sin revelar existencia; sin política sólo diagnóstico, no aprobación.

## Sección 3 — Permisos, multi-tenancy y aislamiento

### TEN-01 — Propietarios exclusivos en UI

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Se conservan IA/A y OW-B/B humanos. API OW/OW probada; falta OW-A en navegador y HTML/respuestas.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Estado de ejecución:** `EN_CURSO` en LOCAL durante `F3-20260908-01`. Se aprobaron las variantes
suplementarias IA/A y OW-B/B: cada perfil mostró exclusivamente su cuenta y no reveló información
de la otra. La variante obligatoria OW-A/A continúa `NO_EJECUTADA`, porque la matriz local confirma
que A pertenece actualmente a `qa-admin` con rol `IA` y no existe `qa-owner-a`. Véase
[la ficha de evidencia de TEN-01](evidence/F3-20260908-01-TEN-01.md).

**Prerrequisitos:** AUTH-03/05; OW-A/OW-B en perfiles N1/N2 separados, A/B activas.

**Pasos:**

1. En N1 entrar como OW-A, abrir selector y activar A.
2. En N2 entrar como OW-B, abrir selector y activar B.
3. Revisar nombres, identificadores, perfil y respuestas de contexto en ambos.

**Resultado esperado exacto:** N1 sólo ofrece A y N2 sólo B; ni HTML ni respuestas contienen la otra cuenta. No compartir cookies/tokens entre perfiles.

### TEN-02 — Activación cruzada A→B y B→A

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Positivos 201, cruce A/B 404 sin nuevas sesiones. Corregido P0002/500; faltan auditoría detallada y tokens reales.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** TEN-01; tokens válidos; control propio funciona.

**Pasos:**

1. Con OW-A enviar R-CONTEXT para A como control.
2. Cambiar sólo accountId a B y reenviar.
3. Repetir con OW-B hacia B y luego A.
4. Revisar context_sessions y eventos generados por cada intento.

**Resultado esperado exacto:** Controles propios 201 con cuenta correcta. Intentos cruzados RECHAZO-CONTEXTO, sin sesión nueva ni datos ajenos. Un error SQL/500 es defecto de normalización, no aprobado.

### TEN-03 — Modificar asociación ajena por ID

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Objeto ajeno 404 sin cambio de estado. Falta control propio en ambos sentidos y versión/historia.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** OW-A/OW-B aal2 con permiso en sus cuentas; membresías secundarias activas de A/B.

**Pasos:**

1. Como OW-A en A, probar R-TRANSITION sobre secundario A como control y restaurarlo.
2. Con mismo actor/contexto enviar suspensión al ID secundario B con versión válida.
3. Repetir dirección B→A.
4. Comparar estado/versión/historia de la asociación ajena.

**Resultado esperado exacto:** Control propio funciona; objeto ajeno 404 sin cambio de estado, versión ni revocación de B. La versión ajena se obtiene por observador técnico, no mediante fuga de la API.

### TEN-04 — Crear asociación con accountId ajeno

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Ambos cruces 404 sin nuevas membresías. Falta control positivo específico de alta secundaria.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** Actor OW-A aal2; usuario secundario válido sin membresía de destino.

**Pasos:**

1. Enviar R-MEMBER para B con contexto A.
2. Repetir inversamente con OW-B/contexto B hacia A.
3. Comparar filas de membresías/roles y repetir control válido en cuenta propia con otro secundario.

**Resultado esperado exacto:** Solicitudes cruzadas 404 y SIN-EFECTOS; control autorizado 201. No aceptar que accountId del body sea autorización.

### TEN-05 — Manipular cabeceras y contexto de otro usuario

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Contexto ajeno rechazado en lectura/escritura. Falta cabecera resource-account y demás variantes.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** Sesiones de OW-A y OW-B; tokens distintos.

**Pasos:**

1. Enviar solicitud con bearer OW-A y x-ice24-context-id de OW-B.
2. Repetir con contexto propio y x-ice24-resource-account-id de B.
3. Omitir cabecera de recurso y repetir modificación realmente cruzada del body/ID.
4. Revisar datos y estado servidor.

**Resultado esperado exacto:** Toda combinación ajena rechazada, aunque se omita la cabecera de recurso. El token determina identidad; el ID de contexto y el header de cuenta no otorgan acceso.

### TEN-06 — Cambio de contexto del usuario multi-cuenta

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Conmutación HTTP revoca contexto anterior; fixture OW/OW. Falta TC/AU y Atrás/Adelante.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** MULTI con un sub y membresías A:TC/B:AU; N1 autenticado.

**Pasos:**

1. Listar contextos y activar A; registrar ID y roles.
2. Cambiar a B sin nuevo login global; consultar contexto actual.
3. Volver a A, usar Atrás/Adelante y recargar.
4. Comparar respuestas, UI y almacenamiento de contexto.

**Resultado esperado exacto:** Existe un solo perfil global y dos membresías; cada contexto aplica sus propios roles y datos. No se unen privilegios TC/AU ni reaparecen datos de A al operar B.

### TEN-07 — Consulta: lectura autorizada y escritura de negocio denegada

**Corrida F3-20260908-AUTO-02: EN_CURSO.** AU lee y no crea membresías con aal2 sintético. Falta transición negativa y persistencia.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** READ sólo AU; permisos efectivos capturados; variante aal2 para aislar RBAC.

**Pasos:**

1. Leer /me y /session-contexts/current con contexto propio.
2. Como READ aal2 enviar R-MEMBER y R-TRANSITION válidos en A.
3. Comparar con actor OW-A aal2 autorizado y revisar persistencia.

**Resultado esperado exacto:** Lecturas propias 200; escrituras de negocio 403 y SIN-EFECTOS. La prueba no se atribuye sólo a MFA ausente. Cerrar sesión o activar contexto no cuenta como escritura de negocio.

### TEN-08 — Decisión explícita sobre lectura estricta y perfil propio

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Producto debe decidir excepción de perfil propio: AU recibe profile-update frente a requisito de lectura estricta.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** READ; baseline actual otorga profile-update a AU; Producto debe decidir alcance.

**Pasos:**

1. Registrar requisito de Consulta estricta y permiso efectivo actual.
2. Con READ ejecutar R-PROFILE válido con If-Match actual.
3. Observar versión y displayName; restaurar fixture de perfil.
4. Solicitar decisión nominal sobre si editar perfil propio es excepción autorizada.

**Resultado esperado exacto:** Bajo lectura estricta solicitada, escritura debe ser 403 y sin cambios; si pasa, FALLIDO frente a ese requisito. Sólo una decisión formal previa puede permitir 200 para perfil propio, manteniendo DENY de negocio. Mientras exista contradicción, no declarar matriz aprobada.

### TEN-09 — Suspensión en caliente de asociación

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Suspensión invalida lectura y nueva activación. Falta escritura antes permitida y evento/tiempo.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** Secundario activo en A con contexto y operación permitida; OW-A aal2 en otro cliente.

**Pasos:**

1. Obtener lectura/operación positiva del secundario.
2. Suspender su asociación con R-TRANSITION y versión vigente; registrar t0 de confirmación.
3. Sin cerrar ni recargar la sesión del secundario, repetir inmediatamente una llamada contextual y una escritura antes permitida.
4. Intentar activar de nuevo A.

**Resultado esperado exacto:** Tras suspensión confirmada, ninguna llamada dependiente de esa asociación funciona ni activa un contexto nuevo; RECHAZO-CONTEXTO, SIN-EFECTOS y MEMBERSHIP_CHANGED. No usar únicamente /me, que es identidad global.

### TEN-10 — Reactivación, asociación terminada y vigencias

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente reactivación, ENDED y vigencias sin resucitar contexto revocado.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** TEN-09; ENDED y fixture con validTo vencido.

**Pasos:**

1. Reactivar la asociación suspendida mediante API autorizada y crear sesión nueva.
2. Intentar usar el viejo contexto revocado.
3. Probar contexto para ENDED y para membresía fuera de vigencia.
4. Intentar reactivar ENDED y registrar la transición admitida según máquina de estados vigente.

**Resultado esperado exacto:** Reactivación válida permite sesión NUEVA sin resucitar contexto revocado. ENDED/fuera de vigencia no acceden. Transición no admitida se rechaza de forma normalizada, sin reescribir historia.

### TEN-11 — Cuenta READ_ONLY

**Corrida F3-20260908-AUTO-02: EN_CURSO.** READ_ONLY lee y bloquea escritura 403; restaurado. Faltan UI y MULTI en otra cuenta.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** MULTI asociado a A/B; OW-A con permiso de escritura y aal2; baseline ACTIVE.

**Pasos:**

1. Ingeniería pone A en READ_ONLY mediante fixture por ID; registra antes/después.
2. Consultar contexto y datos autorizados en A.
3. Intentar R-MEMBER o transición de una asociación secundaria desde A.
4. Con MULTI cambiar a B ACTIVE y realizar control autorizado disponible; restaurar A.

**Resultado esperado exacto:** A conserva lecturas autorizadas y bloquea escritura de negocio con 403 y SIN-EFECTOS; UI informa modo lectura. El modo A no se transmite a B.

### TEN-12 — Ámbitos, sensibilidad y denegación explícita

**Corrida F3-20260908-AUTO-02: EN_CURSO.** DENY domina ALLOW probado; faltan ámbitos y sensibilidad.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** TECH asignado sólo BR-A1/MACH-A1; harness de políticas disponible; contratos de ámbitos definidos.

**Pasos:**

1. Ejecutar política/endpoint existente para ámbito asignado como control.
2. Cambiar recurso a BR-A2/MACH-A2 y luego B.
3. Probar clasificación superior a la concedida y override DENY frente a ALLOW en fixture revisado.
4. Registrar qué comprobación fue de política y cuál de endpoint.

**Resultado esperado exacto:** Ámbito ajeno, sensibilidad no concedida y DENY explícito impiden operación. Si no existe endpoint de máquinas aún, no simular un E2E: registrar alcance de política y diferir sólo la integración del módulo futuro.

### TEN-13 — Cobertura de los nueve roles base

**Corrida F3-20260908-AUTO-02: EN_CURSO.** OW podía conceder IA (201), corregido 403. Faltan nueve roles por tres acciones.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** Datos ADMIN, REC-A, OW-A, TECH, OP, SAN, DELIVERY, REST, READ; matriz de permisos capturada.

**Pasos:**

1. Para IA/IO/OW/TC/OP/SA/DV/RA/AU crear sesión propia y ejecutar lectura propia permitida.
2. Para cada rol intentar accounts.create, membership-manage y recovery-manage con bodies válidos y aal2 donde se pruebe RBAC.
3. Comparar permisos efectivos con matriz aprobada; usar fixtures desechables para positivos.

**Resultado esperado exacto:** Sólo roles con permiso explícito cumplen operación; roles base no autorizados reciben 403. IA crea cuentas; IO no recibe accounts.create en baseline. Registrar una fila por rol/acción; diferencias documentales requieren decisión, no autoconcesión de permisos.

### TEN-14 — Concurrencia y versión esperada

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Carrera de suspensión 201/409; faltan transiciones incompatibles y versiones inválidas.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** Dos clientes autorizados; misma membresía secundaria con versión v.

**Pasos:**

1. Preparar dos transiciones incompatibles con expectedVersion=v.
2. Enviar primera, guardar versión nueva; enviar segunda con v.
3. Repetir sin expectedVersion y con tipo inválido.
4. Observar historia, estado y eventos.

**Resultado esperado exacto:** Una transición válida se confirma; versión obsoleta produce conflicto normalizado 409, sin segundo cambio. Body inválido 400. No hay actualización perdida ni 500 aceptado como conflicto.

### TEN-15 — RLS, acceso directo y aislamiento real

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Lectura/escritura SET LOCAL ROLE anon/authenticated denegadas; pgTAP verifica RLS. Faltan clientes reales y cobertura de tablas.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ten.md).

**Prerrequisitos:** DB local; observador técnico; roles anon/authenticated/service_role identificados.

**Pasos:**

1. Revisar RLS habilitado y grants de schemas/tablas identity/authz/audit.
2. Intentar lecturas/escrituras privadas como anon y authenticated reales, no como postgres/service_role.
3. Con API autenticada repetir casos A→B/B→A.
4. Registrar rol SQL/session_user y ruta utilizada para cada ensayo.

**Resultado esperado exacto:** Acceso directo no privilegiado denegado según diseño actual, que revoca grants; API impide cruce de tenants. Un test como superusuario no acredita RLS. No añadir políticas permisivas para facilitar el ensayo.

## Sección 4 — Duración, gestión y revocación de sesiones

### SES-01 — Revocar sesión N1 desde N2

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Dos session_id sintéticos, revocar uno conserva el otro. Falta comando y evento desde token N2 específico.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ses.md).

**Prerrequisitos:** Mismo usuario en dos clientes independientes; dos IDs de contexto de /me/sessions; N1/N2 positivos.

**Pasos:**

1. Desde N2 listar sesiones y resolver inequívocamente SESSION_N1_ID.
2. Ejecutar DELETE /me/sessions/<SESSION_N1_ID>; guardar t0 y 204.
3. Sin recargar N1, llamar /session-contexts/current con su contexto y ejecutar comando antes permitido.

**Resultado esperado exacto:** N1 recibe RECHAZO-CONTEXTO desde la primera llamada posterior a confirmación; comando no produce efectos. La mera cookie presente no equivale a acceso. SESSION_REVOKED refiere a N1.

### SES-02 — Conservar sesión no revocada y rechazar ID ajeno

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Revocación ajena 404, lectura ajena conservada. Falta escritura positiva y ausencia de evento.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ses.md).

**Prerrequisitos:** SES-01; N2 no revocada; sesión de otro usuario preparada.

**Pasos:**

1. En N2 leer contexto y realizar operación autorizada.
2. Desde N2 intentar DELETE /me/sessions/<ID_OTRO_USUARIO>.
3. Comprobar que el otro usuario conserva su sesión.

**Resultado esperado exacto:** N2 sigue funcionando; revocación ajena 404 y ningún cambio/auditoría de éxito para el tercero.

### SES-03 — Cerrar todas las sesiones desde Perfil

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente Perfil en dos clientes reales y logout Supabase confirmado.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ses.md).

**Prerrequisitos:** Usuario con N1/N2 y contextos activos A/B; proveedor disponible.

**Pasos:**

1. Desde /profile en N1 pulsar Cerrar todas las sesiones.
2. Capturar respuesta original y eliminación de cookie.
3. Desde N2 y otro cliente A/B repetir llamadas contextuales y comando autorizado.
4. Consultar filas de revocación y respuesta real de logout del proveedor mediante evidencia técnica sanitizada.

**Resultado esperado exacto:** UI vuelve al acceso, todos los contextos previos rechazados y logout del proveedor confirmado. La redirección sola no acredita cierre global. Emitir y verificar SESSIONS_REVOKED_GLOBAL.

### SES-04 — Revocación local por API frente a identidad global

**Corrida F3-20260908-AUTO-02: EN_CURSO.** 204 revoca contextos. Primer ensayo esperaba erróneamente 201; corregido al contrato. Falta /me posterior y refresh real.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ses.md).

**Prerrequisitos:** Usuario con token aún válido y contextos N1/N2.

**Pasos:**

1. Enviar POST /me/sessions/revoke-all desde N2.
2. Probar contextos antiguos en ambos.
3. Probar /me y renovación de identidad del proveedor con cliente técnico.
4. Registrar explícitamente qué capa fue revocada.

**Resultado esperado exacto:** 204 invalida contextos locales y genera evento correspondiente. No afirmar que revoca refresh token o identidad Supabase: ese endpoint sólo promete contextos locales. Cierre global se acredita con SES-07.

### SES-05 — Cerrar sólo contexto A

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Cerrar A conserva lectura B y permite nueva A. Falta comando B y correlación.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ses.md).

**Prerrequisitos:** MULTI con contextos A/B vigentes; no suspensión de membresía.

**Pasos:**

1. Ejecutar DELETE /session-contexts/current con contexto A.
2. Repetir llamada usando el mismo contexto A.
3. Consultar y operar dentro del permiso B.
4. Intentar nueva activación de A con membresía aún activa.

**Resultado esperado exacto:** El contexto A cerrado no vuelve a servir; B sigue autorizado. Cerrar una sesión no elimina la membresía: nueva activación A puede ser válida con identidad vigente. Registrar evento y discrepancia de nombre si aplica.

### SES-06 — Retirar acceso de A conservando B

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Suspender A invalida A y conserva B. Falta nueva activación y escritura B real.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ses.md).

**Prerrequisitos:** MULTI activo en A/B; propietario A autorizado.

**Pasos:**

1. Suspender o terminar sólo la membresía A de MULTI.
2. Intentar usar contexto A y crear uno nuevo.
3. Usar contexto B y comprobar permisos/cuenta.
4. Revisar historia y restaurar fixture si procede.

**Resultado esperado exacto:** A ya no puede usarse ni reactivarse por el usuario; B permanece válido. Distingue retiro de acceso de cierre de una sesión en SES-05.

### SES-07 — Revocación global y reutilización de tokens

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente logout real y reutilización JWT/refresh. Guard offline no consulta revocación del proveedor: riesgo abierto.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ses.md).

**Prerrequisitos:** Administrador autorizado y mecanismo global revisado; usuario con varios clientes; token/refresh propios en cliente protegido.

**Pasos:**

1. Ejecutar cierre global acordado: invalidación proveedor y contextos locales; registrar respuestas reales.
2. Usar todos los contextos viejos; intentar renovar con refresh anterior.
3. Con access token previo aún no expirado intentar operación de negocio y activar un nuevo contexto.
4. Repetir login legítimo si identidad sigue habilitada.

**Resultado esperado exacto:** No se permiten operaciones ni creación de contexto mediante sesión global revocada; refresh anterior rechazado. Si el proveedor conserva JWT hasta exp, ICE24 debe cumplir su requisito de revocación inmediata o registrar fallo/decisión formal; no esperar exp para declarar éxito. Un nuevo login autorizado es una sesión distinta.

### SES-08 — Fallo de dependencia durante cierre global

**Corrida F3-20260908-AUTO-02: EN_CURSO.** BFF falla 503 sin borrar cookie cuando API/proveedor falla (mocks). Falta fallo real, cliente N2 y reintento.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ses.md).

**Prerrequisitos:** Laboratorio local; mecanismo de fallo reversible preparado; N1/N2 activos.

**Pasos:**

1. Hacer fallar temporalmente revocación API y luego, en otra variante, logout del proveedor.
2. Cerrar todas las sesiones desde UI.
3. Verificar cookie local, acceso N2, auditoría y señal de fallo/reconciliación.
4. Restaurar dependencia y completar revocación real.

**Resultado esperado exacto:** No se acredita cierre global mientras otra sesión sigue operando. Se registra fallo observable y recuperación; cookie eliminada con revocación remota fallida se considera cierre parcial, no aprobado integral.

### SES-09 — Inactividad administración/campo

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Fixture idle_expires_at vencido rechazado. Falta actividad, campo y política nominal.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ses.md).

**Prerrequisitos:** IDLE_ADMIN/IDLE_FIELD y tolerancia aprobadas; sesiones independientes; polling identificado.

**Pasos:**

1. Registrar t0 de última actividad que renueva inactividad.
2. Mantener un cliente inactivo sin polling y otro activo como control.
3. A T−margen ejecutar control en sesión separada; a T+margen probar la sesión inactiva.
4. Repetir para perfil/canal de campo si aplica.

**Resultado esperado exacto:** Sesión inactiva exige reautenticación al superar límite aprobado; control activo conserva acceso antes del límite absoluto. No usar una llamada de control que reinicie el contador de la sesión objetivo.

### SES-10 — Duración absoluta independiente de actividad

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Fixture expires_at vencido rechazado. Falta máximo absoluto durante conmutación/refresh y reloj real.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ses.md).

**Prerrequisitos:** ABS_SESSION aprobado; cliente activo; reloj controlado de ensayo o espera real.

**Pasos:**

1. Registrar inicio original de sesión.
2. Mantener actividad/renovación dentro de inactividad hasta acercarse a ABS_SESSION.
3. Consultar antes del límite y después, sin reiniciar login.
4. Si se usa reloj inyectado, repetir aceptación en entorno real y marcar niveles de evidencia.

**Resultado esperado exacto:** Después del máximo absoluto no funciona la sesión aunque haya actividad/refresh. No reinicia el límite al cambiar contexto. Cerrar ventana o expirar cookie manualmente no prueba el temporizador servidor.

### SES-11 — Eventos de revocación y correlación

**Corrida F3-20260908-AUTO-02: EN_CURSO.** CONTEXT_REVOKED comprobado y atómico. Falta correlación de tres eventos y proveedor real.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ses.md).

**Prerrequisitos:** SES-01/03/05 ejecutados; observador autorizado.

**Pasos:**

1. Localizar eventos por actor, sujeto, cuenta, contexto, hora y correlación.
2. Comprobar SESSION_REVOKED para individual, CONTEXT_REVOKED para cierre contextual y SESSIONS_REVOKED_GLOBAL para global según runbook.
3. Relacionar cada evento con estado real, revisar duplicados y ausencia de secretos.

**Resultado esperado exacto:** Cada operación acreditada tiene evento correcto y alcance consistente. Código actual emite SESSION_REVOKED al cerrar contexto: si persiste esa diferencia, registrar fallo contractual; no cambiar el nombre en el informe para simular conformidad.

### SES-12 — TTL del access token y renovación segura

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** TTL/renovación pendientes ADR-017. Guardar refresh token no acredita renovación.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ses.md).

**Prerrequisitos:** ACCESS_TTL y política de refresh aprobados; usuario activo.

**Pasos:**

1. Registrar iat/exp sanitizados y tiempo de login.
2. Cruzar expiración del access token y comprobar renovación prevista o reautenticación según política.
3. Si se renueva, comprobar nuevo exp, identidad/contexto y rechazo del refresh sustituido según política del proveedor.
4. Repetir tras revocación.

**Resultado esperado exacto:** Comportamiento corresponde a la política aprobada, sin exceder límite absoluto ni restaurar sesión revocada. Si no existe renovación pero era requisito, FALLIDO; no inferir soporte por guardar refreshToken.

## Sección 5 — Flujos de recuperación de identidad

### REC-01 — Solicitud estándar y mensaje público ciego

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente existente/inexistente y entrega real de correo.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** TARGET activo con correo controlado; UNKNOWN inexistente; Origin legítimo.

**Pasos:**

1. En login desplegar ¿Olvidaste tu contraseña? y solicitar para TARGET.
2. Repetir para UNKNOWN con mismos pasos.
3. Comparar HTTP original, destino y mensaje final; verificar buzón TARGET y ausencia de nueva identidad UNKNOWN.

**Resultado esperado exacto:** Ambas solicitudes muestran: Si la cuenta existe, enviaremos instrucciones al correo verificado. BFF 303 a /?recovery=sent. TARGET recibe instrucciones válidas; mensaje neutro no acredita entrega por sí solo.

### REC-02 — Restablecer contraseña desde enlace

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente enlace limpio: access/first exige sesión BFF previa. Demostrar intercambio y preservación MFA.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** REC-01; link nuevo; PASS_NEW; sesiones anteriores N1/N2 abiertas.

**Pasos:**

1. Abrir enlace desde cliente limpio sin sesión previa.
2. Completar cambio con PASS_NEW y MFA aplicable.
3. Iniciar sesión de nuevo con PASS_NEW.
4. Comparar sub/perfil y estado de factores.

**Resultado esperado exacto:** Recorrido funciona sin insertar sesión manualmente ni editar DB; nueva contraseña autentica a la misma identidad, sin eliminar MFA obligatorio. Si link no puede crear sesión de recuperación, FALLIDO de flujo.

### REC-03 — Enlace de recuperación de un solo uso

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Depende REC-02: enlace consumido desde otro cliente limpio.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** REC-02 completado; enlace usado conservado sólo en buzón restringido.

**Pasos:**

1. Abrir el mismo link en otro perfil limpio.
2. Intentar establecer otra contraseña.
3. Probar PASS_NEW vigente como control.

**Resultado esperado exacto:** Enlace consumido no autoriza otro cambio; PASS_NEW permanece vigente y no se crea sesión recuperada nueva.

### REC-04 — Enlace vencido

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Depende enlace real y TTL/tolerancia aprobados.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** RESET_TTL y tolerancia aprobados; enlace distinto no consumido.

**Pasos:**

1. Solicitar recuperación nueva para fixture separado.
2. Esperar más que TTL y tolerancia, registrar emisión/hora servidor.
3. Abrir enlace e intentar cambio; solicitar luego un enlace fresco.

**Resultado esperado exacto:** Enlace antiguo rechazado sin cambio; nuevo enlace puede completar recorrido. No cambiar reloj del equipo como sustituto de expiración servidor.

### REC-05 — Invalidez de contraseña anterior

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Depende REC-02: contraseña vieja/nueva y MFA.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** REC-02; PASS_OLD y PASS_NEW por referencia.

**Pasos:**

1. Desde cliente limpio intentar login con PASS_OLD.
2. Repetir con PASS_NEW y completar MFA.
3. Registrar mensajes, sesión y auditoría.

**Resultado esperado exacto:** PASS_OLD ya no autentica y PASS_NEW sí. Esto valida sustitución, no caducidad periódica por edad; esa política no está definida.

### REC-06 — Invalidación de sesiones previas tras recuperación

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Depende REC-02: sesiones, JWT y refresh previos.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** N1/N2 y tokens emitidos ANTES de REC-02; contraseña ya cambiada.

**Pasos:**

1. Desde N1/N2 repetir llamada contextual sin recargar.
2. Con cliente técnico intentar refresh anterior y nueva activación con token anterior.
3. Comprobar acceso de sesión creada legítimamente después del reset.

**Resultado esperado exacto:** Sesiones previas no realizan operaciones ni restablecen contexto; refresh previo revocado. Sesión posterior funciona según MFA. Si sólo cambió contraseña y siguen sesiones previas, FALLIDO.

### REC-07 — Política humana y apertura de caso avanzado

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Apertura con IO sintético funciona; faltan operadores nominales, política y evento.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** Evidencia admisible/retención aprobadas; REC-A/B nominales; TARGET distinto; operadores con IO/permiso y aal2.

**Pasos:**

1. Registrar simulacro y evidencia sintética admitida, sin copias sensibles.
2. Como REC-A enviar R-RECOVERY para TARGET.
3. Guardar CASE_ID, status, approvalCount y version; localizar evento.

**Resultado esperado exacto:** HTTP 201; caso OPEN, approvalCount=0, versión inicial positiva, actor y sujeto correctos; RECOVERY_REQUESTED. Abrir caso no emite reset ni revoca factor de TARGET.

### REC-08 — Autoaprobación alcanza regla de doble control

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Autoaprobación con permisos/aal2 sintético 403 y cero filas. Falta proveedor/personas.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** SELF tiene permiso recovery-manage y aal2; otro operador abrió caso cuyo afectado es SELF.

**Pasos:**

1. Como SELF enviar R-APPROVAL a su propio caso con versión vigente y body válido.
2. Verificar conteo/estado y ausencia de reset.
3. Realizar control sobre otro caso autorizado con operador distinto.

**Resultado esperado exacto:** Autoaprobación recibe 403 normalizado, sin aprobación ni reset. Debe probar la regla actor=sujeto, no fallar sólo por falta de permiso o MFA; 500 es defecto de manejo de error. El 403 es criterio de aceptación de esta prueba, no resultado acreditado en el código actual.

### REC-09 — Primera aprobación por operador A

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Primera aprobación técnica VERIFYING. Falta revisión humana, evento y ausencia de reset.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** REC-07; REC-A aal2; evidenceReference individual.

**Pasos:**

1. REC-A revisa evidencia sin conocer una decisión de REC-B.
2. Enviar R-APPROVAL con versión inicial.
3. Guardar nueva versión, approvalCount y estado; revisar evento.
4. Verificar que no se emitió restablecimiento.

**Resultado esperado exacto:** HTTP 201; approvalCount=1, status=VERIFYING, versión incrementada y RECOVERY_APPROVED ligado a esa decisión individual. Una aprobación no significa recuperación aprobada final.

### REC-10 — Una aprobación es insuficiente

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** No hay mecanismo final identificado para probar ejecución insuficiente; depende REC-14.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** REC-09; mecanismo final de recuperación identificado o su ausencia registrada.

**Pasos:**

1. Con caso VERIFYING intentar iniciar ejecución final por el mecanismo autorizado disponible.
2. Revisar emisión de reset/cambio de factor y credenciales de TARGET.
3. Comprobar que se conserva count=1.

**Resultado esperado exacto:** No se emite ni ejecuta reset, no cambia contraseña/factor con una aprobación. Si no existe mecanismo final, este intento E2E queda BLOQUEADO por preparación/funcionalidad ausente y REC-14 registra la brecha; pgTAP no sustituye el intento.

### REC-11 — Doble aprobación del mismo operador

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Mismo operador con versión vigente 409. Falta contador/historia y mecanismo final.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** REC-09; versión ACTUAL posterior a primera aprobación.

**Pasos:**

1. Como REC-A reenviar aprobación con versión actual, nueva referencia y motivo válido.
2. Consultar número de filas/operadores distintos.
3. Intentar ejecución final si existe.

**Resultado esperado exacto:** Segunda aprobación del mismo operador recibe conflicto normalizado 409; count sigue 1, operadores distintos=1 y no hay reset. No usar versión obsoleta que sólo pruebe concurrencia; un 500 es fallo de normalización. Si se propone semántica idempotente alternativa, requiere actualizar y aprobar el contrato antes del RUN, no reinterpretar el resultado después.

### REC-12 — Segunda aprobación independiente por B

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Dos operadores sintéticos APPROVED/count=2; corregido snapshot SQL. No acredita personas ni reset.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** REC-09; REC-B diferente, aal2; versión actual; primera evidencia preservada.

**Pasos:**

1. REC-B revisa evidencia por separado y registra referencia propia.
2. Enviar R-APPROVAL con su propio token/contexto y expectedVersion actual.
3. Comparar aprobadores, status, count y auditoría.

**Resultado esperado exacto:** HTTP 201, dos usuarios distintos, approvalCount=2, status=APPROVED y versión incrementada. No concluir reset realizado porque el caso llegó a APPROVED.

### REC-13 — MFA, permisos y concurrencia de aprobaciones

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Apertura aal1 403 y control aal2 válido. Faltan aprobaciones sin MFA, READ y carrera.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** Casos nuevos; REC-A/B; token aal1 de operador con permiso y token aal2 READ sin permiso.

**Pasos:**

1. Intentar aprobación como REC-A aal1.
2. Intentar como READ aal2.
3. En caso nuevo enviar dos aprobaciones con la misma versión desde operadores distintos; repetir la rechazada con versión actual si estado lo permite.

**Resultado esperado exacto:** Dos primeros intentos 403 y count sin cambio. Carrera serializada sin pérdida/duplicación; versión obsoleta conflicto normalizado 409. Cada aprobación efectiva corresponde a una persona autorizada con aal2.

### REC-14 — Restablecimiento controlado después de dos aprobaciones

**Corrida F3-20260908-AUTO-02: FALLIDO.** Brecha funcional de revisión: sólo existen apertura/aprobaciones; no se identificó procedimiento/ruta ejecutable de reset ligado al caso. FALLIDO de cobertura, no ensayo de reset simulado.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** REC-12; ejecución final definida por Ingeniería/Operación; servicio Supabase disponible.

**Pasos:**

1. Identificar la ruta, herramienta o procedimiento real que ejecuta reset; anotar autoridad y vínculo al caso.
2. Ejecutarlo sólo después de dos aprobaciones.
3. Comprobar resultado proveedor, estado RESET_ISSUED/CLOSED según proceso y auditoría.
4. TARGET establece contraseña nueva en canal seguro y reconfigura TOTP si perdió el factor.

**Resultado esperado exacto:** Restablecimiento completo trazable al caso; soporte no conoce ni envía una contraseña permanente ni comparte semilla. Si no hay implementación/procedimiento admisible para ejecutar el reset, FALLIDO de cobertura funcional; no inventar endpoint ni marcar aprobado por SQL.

### REC-15 — Post-recuperación: factores, sesiones y notificaciones

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Depende REC-14: factores, revocación y notificaciones.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** REC-14; tokens/contraseña/factor anteriores de TARGET; canales registrados de ensayo.

**Pasos:**

1. Probar PASS_OLD, contextos y refresh anteriores.
2. Probar factor antiguo si fue reemplazado; verificar rechazo y enrolamiento del nuevo por TARGET.
3. Acceder con nueva contraseña/TOTP y probar acción autorizada.
4. Verificar notificación en canal previamente registrado y auditoría completa.

**Resultado esperado exacto:** Ningún material revocado conserva acceso; credenciales nuevas funcionan y MFA obligatorio permanece. Auditoría contiene operadores, motivo, referencias, tiempos y resultado real; notificación no incluye secretos.

### REC-16 — Evidencia insuficiente y estados terminales

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Apertura inválida 400 sin caso nuevo. Faltan evidenceReferences vacío, rechazo y terminales.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** Caso separado; método de rechazo humano definido; caso APPROVED/CLOSED de ensayo.

**Pasos:**

1. Intentar aprobar con evidenceReferences vacío y motivo insuficiente.
2. Operador B rechaza evidencia insuficiente mediante procedimiento definido; registrar decisión.
3. Intentar una tercera aprobación o replay sobre caso terminal.
4. Inspeccionar conteos, cambios y notificaciones.

**Resultado esperado exacto:** Entrada inválida 400; evidencia insuficiente no permite reset. Estado terminal no admite nuevas aprobaciones que alteren el resultado. Si no existe vía de rechazo exigida por runbook, registrar brecha, no simular decisión escribiendo APPROVED.

### REC-17 — Fallo de correo/proveedor y auditoría de recuperación

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Corregido el registro falso de éxito: aceptación registra SUCCESS y rechazo del proveedor/origen registra FAILED, conservando el mismo 303 público. Tres regresiones unitarias aprobadas; falta inducir fallo SMTP real y comprobar entrega.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/rec.md).

**Prerrequisitos:** Laboratorio local con fallo reversible de SMTP/proveedor/auditoría.

**Pasos:**

1. Hacer fallar envío y solicitar recuperación; revisar mensaje público y resultado interno.
2. En otra variante hacer fallar ejecución final tras aprobación.
3. Restaurar servicio y seguir procedimiento de reintento; revisar duplicados y trazabilidad.

**Resultado esperado exacto:** Mensaje público sigue neutro; fallo interno visible y no se acredita correo/reset exitoso que no ocurrió. Reintento no evita doble control ni produce cambios secretos sin auditoría.

## Sección 6 — Accesibilidad WCAG 2.2 AA y compatibilidad UX

### UX-01 — Recorrido completo por teclado

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente: Teclado físico por pantalla.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ux.md).

**Prerrequisitos:** Pantallas login, recuperación, primer ingreso, MFA, selector, perfil y revocada disponibles; teclado físico.

**Pasos:**

1. En cada pantalla comenzar desde carga limpia y recorrer con Tab/Shift+Tab.
2. Activar botones, enlaces y detalles con teclas apropiadas, enviar formularios y corregir errores.
3. Si hay diálogo, abrir/cerrar y comprobar retorno del foco.
4. Registrar cada elemento inalcanzable o trampa.

**Resultado esperado exacto:** Todos los flujos se completan sin ratón; orden comprensible, foco visible y sin trampas. Criterios 2.1.1/2.1.2/2.4.3/2.4.7; evidencia por pantalla y estado.

### UX-02 — Foco visible y no oculto

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente: Foco/ocultación/viewports.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ux.md).

**Prerrequisitos:** UX-01; distintos viewports y estados de error.

**Pasos:**

1. Recorrer controles con teclado y comprobar foco al cambiar ruta/enviar formulario.
2. Repetir con barras, mensajes y teclado móvil visibles.
3. Registrar cualquier componente enfocado completamente tapado.

**Resultado esperado exacto:** Foco identificable y componente no completamente oculto por contenido de la aplicación; no se pierde al mostrar error. Evaluar 2.4.11 sin confundir requisitos AAA con AA.

### UX-03 — Lectores de pantalla y semántica

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente: NVDA/VoiceOver y evidencia auditiva.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ux.md).

**Prerrequisitos:** NVDA con navegador Windows y VoiceOver/Safari en Apple cuando estén en matriz; versiones registradas.

**Pasos:**

1. Leer títulos, encabezados, formularios y nombres de botones de cada pantalla.
2. Enviar datos inválidos y luego válidos.
3. Escuchar anuncios de error, carga y éxito; cambiar contexto.
4. Comprobar nombre, rol y valor de controles.

**Resultado esperado exacto:** Campos/instrucciones y errores asociados se anuncian; estado/cuenta se identifica sin depender sólo de posición/color. Criterios 1.3.1, 3.3.1/2 y 4.1.2/3; grabación sanitizada sin secretos.

### UX-04 — Ampliación al 200%

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente: Zoom 200% real.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ux.md).

**Prerrequisitos:** Todos los flujos visibles, pantalla escritorio.

**Pasos:**

1. Fijar zoom de navegador al 200% y registrar viewport resultante.
2. Leer textos, editar campos, navegar y completar flujo.
3. Comparar contenido/funciones con 100%.

**Resultado esperado exacto:** Texto y controles utilizables sin pérdida de contenido/función. Separar de reflow a 320 px; usar criterio 1.4.4.

### UX-05 — Reflow a 320 píxeles CSS

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente: 320px CSS y scroll.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ux.md).

**Prerrequisitos:** Pantallas completas y mensajes largos sintéticos.

**Pasos:**

1. Configurar viewport de 320 px CSS o partir de 1280 px y aplicar 400% de zoom.
2. Recorrer formulario, selector, perfil, listas y mensajes.
3. Registrar scroll horizontal, recortes y solapamientos.

**Resultado esperado exacto:** Contenido ordinario no exige desplazamiento en dos ejes ni pierde funciones. Justificar excepciones sólo en contenido que realmente las admita; 320 px no significa zoom 320%. Ver [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

### UX-06 — Contraste medido

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente: Contraste medido por estado.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ux.md).

**Prerrequisitos:** Herramienta de medición de colores; estilos y estados reales.

**Pasos:**

1. Medir texto/fondo de títulos, etiquetas, ayuda, errores y botones en estados aplicables.
2. Guardar colores, tamaño/peso de fuente y ratio por par.
3. Medir también identificación visual de componentes/estados cuando aplique.

**Resultado esperado exacto:** Texto normal ≥4.5:1; grande ≥3:1. Grande: al menos 18 pt o 14 pt en negrita; documentar excepciones legítimas. No aprobar por apreciación visual. Ver [W3C contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); componentes según 1.4.11.

### UX-07 — Gestor de contraseñas, pegar y autenticación accesible

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente: Gestor/pegado y MFA accesible.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ux.md).

**Prerrequisitos:** Gestor con credenciales sintéticas; no cuenta personal.

**Pasos:**

1. Guardar y autocompletar login y cambio de contraseña.
2. Pegar contraseña y, donde corresponda, código de verificación sin desactivar eventos.
3. Completar MFA sin exigir memorización/transcripción sin ayuda o alternativa aplicable.
4. Revisar autocomplete y etiquetas.

**Resultado esperado exacto:** Gestor y pegado funcionan sin exposición de claves; el recorrido satisface 3.3.8 aplicable. No confundir minlength/validación legítima con bloqueo del pegado. Ver [W3C autenticación accesible](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html).

### UX-08 — Estados de carga y prevención de duplicados

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente: Red lenta/doble envío.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ux.md).

**Prerrequisitos:** Red lenta configurada en laboratorio; formularios válidos.

**Pasos:**

1. Retrasar respuesta de login/cambio de contexto/acción disponible.
2. Enviar una vez y observar feedback; intentar segundo envío durante espera.
3. Restaurar red y comprobar resultado y persistencia.

**Resultado esperado exacto:** Espera perceptible y comprensible; no se presenta éxito antes de confirmación ni se duplican efectos. Si no existe feedback de carga requerido, registrar defecto de UX.

### UX-09 — Vacío, falta de permiso y error recuperable

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Pendiente: Vacío/error histórico parcial; falta READ y reintentos.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ux.md).

**Prerrequisitos:** EMPTY; READ; API con fallo reversible; fixtures válidos.

**Pasos:**

1. Entrar como EMPTY y abrir selector.
2. Entrar como READ e intentar acción no autorizada.
3. Provocar fallo de carga de perfil y error de formulario; restaurar y reintentar.

**Resultado esperado exacto:** Vacío explica ausencia de contextos; permiso denegado no filtra datos; error permite recuperación y conserva entradas no sensibles pertinentes. Errores se anuncian y no dependen sólo del color.

### UX-10 — Compatibilidad de navegadores y dispositivos

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente: Matriz real de dispositivos/navegadores.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ux.md).

**Prerrequisitos:** Inventario del piloto aprobado; datos sintéticos.

**Pasos:**

1. Repetir acceso, recuperación, MFA, selector, perfil y logout en Chrome/Edge Windows, Firefox, Safari macOS, Chrome Android y Safari iOS de la matriz.
2. Registrar versión exacta, dispositivo, viewport y orientación; incluir tableta asignada.
3. Distinguir emulación de dispositivo real y probar red lenta en flujos de identidad.

**Resultado esperado exacto:** Flujos críticos en línea funcionan en todas las combinaciones exigidas; ninguna combinación no probada se declara compatible por inferencia. Offline funcional completo y módulos futuros siguen fuera de Fase 3.

### UX-11 — Tamaño táctil y ayudas visuales

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente: Táctil/espaciado/orientación.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ux.md).

**Prerrequisitos:** Dispositivos táctiles; pantallas del alcance.

**Pasos:**

1. Medir objetivos de interacción pequeños y separación; probar pulsación sin activar vecino.
2. Revisar orientación, espaciado de texto y reducción de movimiento en contenido aplicable.
3. Registrar criterio y excepción por elemento.

**Resultado esperado exacto:** Para 2.5.8, objetivos ≥24×24 px CSS o excepción/espaciado admitido documentado; sin accionamientos vecinos por diseño. Ver [W3C objetivos táctiles](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### UX-12 — Evaluación completa de criterios aplicables

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente: Informe completo QA/UX.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/ux.md).

**Prerrequisitos:** UX-01 a UX-11; evaluador competente; norma WCAG 2.2 disponible.

**Pasos:**

1. Crear inventario de TODOS los criterios A/AA de WCAG 2.2 para páginas y procesos completos del alcance.
2. Para cada criterio registrar aplica/no aplica justificado, técnica de evaluación, resultado y evidencia.
3. Revisar criterios no cubiertos por los ensayos anteriores, incluidos tiempos, idioma, alternativas y consistencia.
4. Emitir informe de hallazgos y revalidar correcciones.

**Resultado esperado exacto:** Ningún criterio aplicable queda sin evaluar; informe aprobado sólo cuando corresponde. Pasar un escáner o estos casos resumidos no acredita automáticamente WCAG 2.2 AA. Fuente: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Sección 7 — Seguridad del entorno y cierre

### SEC-01 — API sin token y token malformado

**Corrida F3-20260908-AUTO-02: APROBADO.** HTTP sin token, Basic y malformado: 401 genérico; control 200.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** API disponible; /me funciona como control con token válido.

**Pasos:**

1. Enviar GET /me sin Authorization.
2. Repetir con esquema distinto de Bearer y con token malformado.
3. Registrar cuerpo, cabeceras y latencia; repetir control válido.

**Resultado esperado exacto:** Todos los negativos 401 con respuesta genérica sin datos privados ni stack/SQL. Control positivo 200; no aceptar indisponibilidad global como rechazo seguro.

### SEC-02 — Firma o algoritmo inválidos

**Corrida F3-20260908-AUTO-02: APROBADO.** Firma alterada, none y HS256: 401 sin nuevas identidades/sesiones.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Cliente técnico de laboratorio; TOKEN_BAD_SIG; token control válido.

**Pasos:**

1. Enviar token con firma alterada a /me.
2. Repetir con alg none y algoritmo no admitido, usando tokens sintéticos del laboratorio.
3. Comprobar que ninguna variante crea perfil/sesión.

**Resultado esperado exacto:** 401 en cada variante, SIN-EFECTOS y sin fallback a algoritmo/clave inseguros. No concluir validación de claims a partir de fallo de firma.

### SEC-03 — Token expirado con firma válida

**Corrida F3-20260908-AUTO-02: EN_CURSO.** exp pasado firmado recibe 401. Falta esperar los mismos bytes de un token real.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Token real propio; exp conocido; reloj servidor sincronizado.

**Pasos:**

1. Probar token antes de exp como control.
2. Esperar hasta exp y tolerancia aprobada, mantener bytes originales.
3. Reenviar al mismo endpoint y revisar estado.

**Resultado esperado exacto:** Token anterior válido ahora recibe 401. No alterar exp sin firmar, pues eso sólo probaría firma inválida.

### SEC-04 — Issuer incorrecto aislado

**Corrida F3-20260908-AUTO-02: APROBADO.** Sólo iss cambia con clave/JWKS válidos: 401; control 200. Harness previsto cumplido.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Harness local del verificador con JWKS/clave de prueba confiable; baseline válido.

**Pasos:**

1. Emitir token de laboratorio válido y comprobar aceptación de control.
2. Firmar otro con la misma clave, aud/exp correctos y sólo iss diferente.
3. Ejecutar verificación/endpoint de laboratorio; documentar configuración.

**Resultado esperado exacto:** Control aceptado y iss incorrecto rechazado; endpoint protegido 401 si se prueba HTTP. Prueba del verificador y E2E remoto se reportan separados. No modificar confianza del entorno remoto.

### SEC-05 — Audience incorrecta aislada

**Corrida F3-20260908-AUTO-02: APROBADO.** aud incorrecta cadena/lista 401; lista correcta 200. Firma válida.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Mismo laboratorio de SEC-04.

**Pasos:**

1. Conservar firma válida, iss y exp; variar sólo aud a otra aplicación.
2. Probar aud como cadena incorrecta y lista que no contiene audiencia esperada.
3. Control con lista que sí la contiene.

**Resultado esperado exacto:** Audiencia incorrecta rechazada y control válido aceptado; rechazo HTTP 401 cuando aplica. Variantes tienen firma válida para aislar el claim.

### SEC-06 — Rotación real de JWKS

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente rotación real K1/K2 y solapamiento aprobado.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Proyecto de pruebas autorizado para rotación; plan reversible; no producción.

**Pasos:**

1. Autenticar con llave K1 y llenar caché del verificador.
2. Rotar proveedor a K2 mediante procedimiento autorizado, emitir token K2.
3. Probar inmediatamente y después del intervalo de actualización; registrar primer resultado y tiempo de recuperación.
4. Verificar retirada de K1 según política de solapamiento.

**Resultado esperado exacto:** Nueva llave se valida conforme a ventana aprobada sin fijarla en código; llaves retiradas dejan de aceptarse según política. Un fallo inicial no se oculta repitiendo hasta verde; registrar cada intento.

### SEC-07 — Discovery/JWKS no confiables o caídos

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente discovery no confiable/caído y caché fría/caliente.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Laboratorio local con servidor de identidad de prueba; configuración registrada.

**Pasos:**

1. Servir discovery con issuer diferente y JWKS no permitido por transporte.
2. En otra variante interrumpir discovery/JWKS con caché fría y después con caché válida.
3. Ejecutar control restaurado; revisar logs sanitizados.

**Resultado esperado exacto:** Configuración no confiable no autentica; no hay fallback inseguro. Fallos del proveedor se observan sin secretos; comportamiento con caché sigue política documentada. No cambiar URLs a hosts de terceros.

### SEC-08 — CSRF de formularios autenticados

**Corrida F3-20260908-AUTO-02: EN_CURSO.** Logout: cinco negativos CSRF/Origin y control. Faltan password, MFA y contexto.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Sesiones propias N1/N2; acciones BFF cambio de contexto, password, MFA y logout; control válido.

**Pasos:**

1. Por CADA ruta, capturar petición válida sin adjuntar secretos y verificar control.
2. Repetir quitando csrfToken, usando valor incorrecto y usando token de N2 con cookie N1.
3. Repetir con Origin ajeno y Origin ausente.
4. Observar respuesta original y cambios de cuenta/clave/factor/revocación/cookie.

**Resultado esperado exacto:** Sólo combinación válida de sesión, Origin y csrfToken permite la acción. Inválidas no causan efectos, incluido logout inducido. Mecanismo actual es campo csrfToken + Origin; no inventar X-CSRF-Token. Un 303 de rechazo puede ser válido si no hubo cambios; eliminación incondicional de cookie se registra como efecto.

### SEC-09 — Origin en login/recuperación y CORS

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Origin revisado en código; falta origen adversario local y CORS navegador.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Usuario/buzón controlados; cliente de navegador desde origen local de ensayo distinto.

**Pasos:**

1. Probar login y recuperación con Origin legítimo como control.
2. Repetir con Origin ajeno y ausente desde cliente técnico; observar que no autentique/envíe indebidamente.
3. Desde navegador del origen de ensayo intentar leer respuesta privada con credenciales.

**Resultado esperado exacto:** Login no crea sesión desde origen inválido; recuperación no dispara acción indebida aunque conserve mensaje neutro. Origen no autorizado no lee respuestas privadas. CORS no sustituye las pruebas CSRF de mutación.

### SEC-10 — Cookies de sesión en HTTPS

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Sin staging HTTPS; localhost no acredita cookie Secure producción.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Staging HTTPS con NODE_ENV=production; sesión válida; DevTools.

**Pasos:**

1. Inspeccionar atributos de __Host-ice24_session sin copiar valor.
2. Comprobar Secure, HttpOnly, SameSite=Lax, Path=/ y ausencia de Domain; revisar duración.
3. Comprobar que document.cookie no expone cookie y que no se envía por HTTP; repetir cookie temporal OIDC.

**Resultado esperado exacto:** Atributos esperados presentes y secreto inaccesible a JavaScript. Cookie de producción no circula por HTTP. Local HTTP usa ice24_session y no acredita Secure de producción.

### SEC-11 — Fuga de secretos y datos entre contextos

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Reportes sanitizados; falta revisión integral bundles, almacenamiento y logs.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Sesiones sintéticas; archivos de bundle/logs y DevTools accesibles al tester autorizado.

**Pasos:**

1. Revisar HTML, JS descargado, almacenamiento local/session/IndexedDB y cachés por nombres/valores de secretos de servidor conocidos en laboratorio.
2. Examinar logs y errores de login, MFA, reset y fallo de DB; sanitizar antes de adjuntar.
3. Cambiar A→B y revisar cachés/respuestas atrás; comprobar que token no aparece en query/referer a terceros.

**Resultado esperado exacto:** No hay service_role, BFF_SESSION_SECRET, BFF_API_SHARED_SECRET, refresh/access token ni semillas fuera del canal necesario de enrolamiento. La clave anon/publicable no se confunde con service_role. Semilla mostrada al enrolar sólo se observa en su flujo y no queda en logs/evidencia.

### SEC-12 — Auditoría append-only y consistencia

**Corrida F3-20260908-AUTO-02: EN_CURSO.** service_role no altera eventos; fallo INSERT conserva sesión y reintento revoca. Falta rol efectivo/correlaciones.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Base local desechable; evento sintético; rol de aplicación no superusuario.

**Pasos:**

1. Crear acción sensible válida y localizar evento por correlation ID.
2. Como rol de aplicación intentar UPDATE y DELETE del evento y registrar error; realizar en transacción de ensayo que no comprometa historial.
3. En laboratorio inducir fallo de escritura de auditoría durante mutación y observar atomicidad.
4. Restaurar y revisar estado final.

**Resultado esperado exacto:** Evento no puede alterarse/borrarse; acción y auditoría transaccional no quedan discordantes. Si revocación se confirma y auditoría falla fuera de la misma transacción, registrar defecto de consistencia. No demostrar protección sólo con un rol sin conexión.

### SEC-13 — Inventario de endpoints y denegación por defecto

**Corrida F3-20260908-AUTO-02: NO_EJECUTADO.** Pendiente inventario ejecutado sin autoridad/control positivo y revisión nominal.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Controladores/OpenAPI del commit; revisión Ingeniería/Seguridad.

**Pasos:**

1. Enumerar rutas identity/admin/internal y BFF; documentar mecanismo de cada una.
2. Para privadas, probar sin identidad/contexto/permiso según contrato y con control positivo.
3. En harness local verificar controlador administrativo sin metadata de política.
4. Probar /internal/security-events sin secreto BFF, sin exponer ese secreto.

**Resultado esperado exacto:** Ninguna ruta privada carece de control aplicable. Rutas propias /me requieren propiedad/identidad aunque no usen guard administrativo; ruta interna sólo acepta autoridad de servidor. Metadata ausente en guard administrativo deniega 403. Ausencia en Swagger no equivale a autorización.

### SEC-14 — Manipulación del identificador de sesión de identidad

**Corrida F3-20260908-AUTO-02: EN_CURSO.** identitySessionId falsificado 400; deriva JWT. Falta sesión ajena real y revocación global.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** JWT propio con session_id; R-CONTEXT funciona como control.

**Pasos:**

1. Crear contexto omitiendo identitySessionId y registrar vínculo servidor.
2. Repetir suministrando identitySessionId inventado y luego uno de otra sesión sintética.
3. Intentar revocación global de la sesión propia y usar los contextos creados.
4. Revisar que la identidad de sesión no se tome como dato confiable del cliente.

**Resultado esperado exacto:** Cliente no puede falsificar vínculo de identidad para evadir revocación; el servidor valida o deriva la sesión del token. Si acepta IDs arbitrarios que evaden controles, FALLIDO de seguridad.

### SEC-15 — Pentest autorizado y revalidación

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Pendiente pentest independiente y su informe.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/sec.md).

**Prerrequisitos:** Alcance escrito del entorno de pruebas, cuentas permitidas, ventana, límites y contacto; especialista independiente designado.

**Pasos:**

1. Ejecutar evaluación acordada de autenticación, autorización, sesiones y recuperación con referencia WSTG.
2. Entregar hallazgos reproducibles sanitizados y severidad/impacto.
3. Corregir, repetir los vectores afectados y registrar cierre o excepción formal.

**Resultado esperado exacto:** Informe independiente y revalidación vinculados al commit; sin vulnerabilidades obligatorias pendientes de resolver para el gate. Esta guía y un escaneo automático no sustituyen el pentest externo solicitado.

### CLOSE-01 — CI del commit exacto

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Build 14/14, 12 caché; unitarias 44/44 y PostGIS 1/1. Falta commit y CI remota.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/close.md).

**Prerrequisitos:** Correcciones terminadas; workflows accesibles; Ingeniería.

**Pasos:**

1. Abrir ejecución CI del SHA objetivo; revisar quality e integration.
2. Localizar Infrastructure/supabase-migrations del mismo SHA; comprobar filtros de paths y jobs realmente ejecutados.
3. Adjuntar enlaces, totales, skips y resultados de pgTAP/build.
4. Si falta ejecución por filtro, solicitar ejecución por flujo autorizado sin fingir cobertura.

**Resultado esperado exacto:** Checks requeridos verdes en commit exacto. Workflow ausente/omitido no equivale a aprobado; no basta una ejecución de otro SHA.

### CLOSE-02 — Aprobación de matriz y ADR-017

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Pendientes matriz/Consulta y ADR-017 nominales.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/close.md).

**Prerrequisitos:** TEN y SES completos; decisiones temporales pendientes resueltas.

**Pasos:**

1. Producto/Operación revisa resultados por rol, cuenta, ámbito y READ_ONLY, incluida excepción de perfil AU.
2. Seguridad/Operación compara políticas efectivas con ADR-017.
3. Registrar nombres, versión aprobada, desacuerdos y correcciones.
4. Actualizar documentos mediante revisión normal autorizada.

**Resultado esperado exacto:** Matriz y política de identidad/sesiones tienen decisión nominal y coherente; no se aprueba una propuesta sólo porque está en el repositorio.

### CLOSE-03 — Aprobación de recuperación y privacidad

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Pendientes operadores, evidencia/retención y firmas Jurídico/Privacidad.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/close.md).

**Prerrequisitos:** REC completos; operadores nombrados; decisiones Jurídico/Seguridad.

**Pasos:**

1. Presentar evidencia sintética y referencias de tratamiento/retención.
2. Jurídico/Privacidad decide admisibilidad y manejo; Operación confirma REC-A/REC-B y suplentes.
3. Revisar que no haya autoaprobación ni secretos en anexos.

**Resultado esperado exacto:** Decisiones firmadas sobre evidencia, retención, custodios y operadores; no usar plazos o documentos de identidad no autorizados. La prueba técnica no produce dictamen jurídico.

### CLOSE-04 — Cobertura, accesibilidad y reejecuciones

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Inventario revisado, pero faltan variantes, UX y pentest.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/close.md).

**Prerrequisitos:** Todas las fichas y defectos; informe UX/pentest.

**Pasos:**

1. Cruzar inventario de casos/variantes con el registro.
2. Revisar fallidos/bloqueados/no ejecutados y NO_APLICA justificados; comparar reintentos con commit corregido.
3. QA/UX firma sólo combinaciones y criterios evaluados.
4. Confirmar informe de seguridad y revalidación.

**Resultado esperado exacto:** No quedan casos obligatorios sin evidencia ni firmas de competencia; ningún fallo se sobrescribe. Se distingue local, harness y remoto. Ausencia de dispositivo o proveedor permanece visible.

### CLOSE-05 — Acta final multidisciplinaria

**Corrida F3-20260908-AUTO-02: BLOQUEADO.** Depende CLOSE-01..04 y firmas. Decisión global PENDIENTE.
[Análisis y evidencia](evidence/F3-20260908-AUTO-02/close.md).

**Prerrequisitos:** CLOSE-01 a CLOSE-04 completos; expediente sanitizado.

**Pasos:**

1. Completar acta de evidence-template.md con totales de variantes e intentos.
2. Obtener aceptación nominal de Ingeniería, Producto/Operación, Seguridad, Jurídico/Privacidad y QA/UX; QA Lead verifica integridad.
3. Registrar decisión global, excepciones formales y gates externos todavía abiertos.
4. Proponer actualización del estado de Fase 3 con enlaces a evidencia.

**Resultado esperado exacto:** Sólo se declara cierre del alcance cuando pruebas y decisiones obligatorias están aprobadas. Si hay bloqueo o fallo sin resolución formal admisible, decisión PENDIENTE/NO_APROBADO; nunca atribuir una firma al tester o a la herramienta.
