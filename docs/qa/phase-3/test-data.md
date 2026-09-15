# Matriz de datos sintéticos y recetas de solicitudes

Todos los alias deben resolverse en la ficha de RUN. Los UUID devueltos por Supabase/API se registran; los identificadores simbólicos de este documento no son UUID válidos para enviar literalmente.

## Cuentas y ámbitos

| Alias | Nombre sintético | Tipo       | Estado base | Propietario                                    | Ámbitos sintéticos                                         |
| ----- | ---------------- | ---------- | ----------- | ---------------------------------------------- | ---------------------------------------------------------- |
| CTRL  | QA ICE24 Control | COMPANY    | ACTIVE      | Administrador inicial preparado por Ingeniería | Contexto administrativo de IA y operadores de recuperación |
| A     | QA Cuenta A RUN  | COMPANY    | ACTIVE      | OW-A exclusivamente                            | BR-A1, BR-A2; MACH-A1, MACH-A2                             |
| B     | QA Cuenta B RUN  | INDIVIDUAL | ACTIVE      | OW-B exclusivamente                            | BR-B1; MACH-B1                                             |

Guardar `ACCOUNT_CTRL_ID`, `ACCOUNT_A_ID`, `ACCOUNT_B_ID` al crear. Crear A/B mediante AUTH-01 para probar realmente el alta; CTRL es fixture de bootstrap. Los ámbitos branch/machine se usan sólo donde el modelo actual admita fixtures y comprobación de políticas. No afirmar que existe un CRUD de máquinas Fase 4. Si falta una ruta que consuma el ámbito, validar la política en prueba técnica y declarar pendiente su E2E futuro.

## Perfiles requeridos y adicionales de cobertura

Cada fila es una identidad Supabase diferente salvo MULTI, que tiene una identidad y dos membresías. Para cada fila registrar `USER_<alias>_ID`, `SUB_<alias>`, membresías y contextos; los guiones de alias pueden normalizarse a guion bajo en variables.

| Alias / username            | Correo LOCAL                    | Cuenta y rol base                 | AAL base                         | Propósito / exclusiones                                                                                  |
| --------------------------- | ------------------------------- | --------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| ADMIN / qa-admin            | qa-admin@example.test           | CTRL: IA                          | aal2                             | Bootstrap, alta de A/B; no compartir credenciales con operadores                                         |
| OW-A / qa-owner-a           | qa-owner-a@example.test         | A: OW                             | aal2                             | Propietario exclusivo; ninguna membresía B                                                               |
| OW-B / qa-owner-b           | qa-owner-b@example.test         | B: OW                             | aal2                             | Propietario exclusivo; ninguna membresía A                                                               |
| MULTI / qa-multi            | qa-multi@example.test           | A: TC; B: AU                      | aal1; variante aal2              | Cambio de cuenta sin duplicar perfil ni unir permisos                                                    |
| READ / qa-read              | qa-read@example.test            | A: AU exclusivamente              | aal1; variante aal2              | Consulta de negocio; ningún rol adicional u override ALLOW                                               |
| REC-A / qa-recovery-a       | qa-recovery-a@example.test      | CTRL: IO                          | aal2                             | Permiso efectivo `identity.recovery-manage`; operador humano A                                           |
| REC-B / qa-recovery-b       | qa-recovery-b@example.test      | CTRL: IO                          | aal2                             | Mismo permiso, identidad y persona diferentes de REC-A                                                   |
| TARGET / qa-recovery-target | qa-recovery-target@example.test | A: OP                             | aal2 antes del simulacro         | Usuario afectado por recuperación; no es ninguno de los operadores                                       |
| SELF / qa-self-recovery     | qa-self-recovery@example.test   | CTRL: IO                          | aal2                             | Afectado con permiso de recuperación, para alcanzar la regla de autoaprobación y no fallar sólo por RBAC |
| TECH / qa-tech              | qa-tech@example.test            | A: TC, BR-A1/MACH-A1              | aal1                             | Ámbito positivo/negativo; sin acceso a BR-A2/B                                                           |
| OP / qa-operator            | qa-operator@example.test        | A: OP, BR-A1/MACH-A1              | aal1                             | Operador de campo; NO equivale a operador de recuperación IO                                             |
| SAN / qa-sanitary           | qa-sanitary@example.test        | A: SA                             | aal2                             | Cobertura de rol sanitario actual; no publicar sanidad de fases futuras                                  |
| DELIVERY / qa-delivery      | qa-delivery@example.test        | A: DV, negocio sintético asignado | aal1                             | Cobertura del rol DV en identidad                                                                        |
| REST / qa-restaurant        | qa-restaurant@example.test      | A: RA, negocio sintético asignado | aal1                             | Cobertura del rol RA en identidad                                                                        |
| PENDING / qa-pending        | qa-pending@example.test         | A: OP, membresía PENDING          | Sin contexto activo              | Invitación no aceptada                                                                                   |
| SUSP / qa-suspended         | qa-suspended@example.test       | A: OP, membresía SUSPENDED        | Sesión obtenida antes del cambio | Suspensión sin desactivar identidad global                                                               |
| ENDED / qa-ended            | qa-ended@example.test           | A: OP, membresía ENDED            | Sesión anterior                  | Asociación terminada                                                                                     |
| DISABLED / qa-disabled      | qa-disabled@example.test        | A: OP, usuario DEACTIVATED        | Sesión anterior                  | Desactivación global del perfil                                                                          |
| EMPTY / qa-no-membership    | qa-no-membership@example.test   | Sin membresías                    | aal1                             | Selector vacío sin acceso de negocio                                                                     |
| UNKNOWN                     | qa-nonexistent@example.test     | No crear identidad ni perfil      | Sin sesión                       | No enumeración                                                                                           |

Estado inicial ACTIVE en perfiles/membresías salvo las variantes indicadas. Para las pruebas de primer ingreso usar identidades realmente INVITED, no simular el recorrido sobre un usuario ya activo. Correos `example.test` sirven en el buzón local; no reciben correo público. En staging sustituir cada uno por un alias único de un dominio/buzón de QA controlado, con entregabilidad comprobada. No enviar a direcciones de terceros.

## Credenciales y material temporal

| Variable                                  | Cómo prepararla                                                                                       | Resultado/uso                                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `PASS_VALID_<USER>`                       | Generar distinta por usuario, aleatoria, al menos 16 caracteres; guardar en almacén local restringido | Satisface mínimo actual de 12 y política efectiva del proveedor                                                              |
| `PASS_NEW_<USER>`                         | Otro valor válido distinto                                                                            | Cambio/recuperación                                                                                                          |
| `PASS_WRONG`                              | `QA-NoEsLaClave-2026!`; comprobar que no coincide con ninguna clave vigente                           | Login negativo con longitud válida, evita bloqueo sólo del HTML                                                              |
| `PASS_WEAK_SHORT`                         | `Qa1!`                                                                                                | Rechazo por longitud, tanto UI como solicitud directa                                                                        |
| `PASS_WEAK_POLICY`                        | Cadena de longitud válida que infrinja una regla adicional aprobada                                   | Sólo aplicar si existe esa regla; no inventar política de complejidad                                                        |
| `PASS_OLD_<USER>`                         | Referencia al valor válido antes de cambiarlo                                                         | Debe dejar de autenticar después del cambio confirmado                                                                       |
| `PASS_EXPIRED_<USER>`                     | Alias de PASS_OLD para la prueba solicitada de clave vencida                                          | No hay caducidad periódica de contraseñas definida en ADR-017; caducidad por edad requiere política aprobada antes de probar |
| `TOTP_SEED_<USER>_LOCAL`                  | Semilla generada por el enrolamiento real del proveedor local; guardar sólo por referencia            | Una por factor/usuario; no incluir valor ni QR en evidencia                                                                  |
| `TOTP_SEED_LAB_FIXED`                     | `JBSWY3DPEHPK3PXP`, sólo vector público en un generador aislado                                       | No es secreto ni factor enrolado; NO permite autenticar en Supabase salvo fixture explícito; no reutilizar en staging        |
| `TOTP_VALID_<USER>`                       | Código del factor enrolado dentro de su ventana                                                       | Eleva la sesión validada a aal2                                                                                              |
| `TOTP_WRONG`                              | Código de seis cifras verificado diferente al actual                                                  | Rechazo; no asumir que `000000` siempre es incorrecto                                                                        |
| `TOTP_EXPIRED_<USER>`                     | Capturar un código y esperar más que la ventana y tolerancia configuradas                             | Rechazo comprobado con hora del servidor; no cambiar reloj global                                                            |
| `TOKEN_AAL1_<USER>` / `TOKEN_AAL2_<USER>` | Obtener del proveedor mediante un cliente técnico de QA autorizado, con login/challenge real          | Usar sólo en cliente API local protegido; no extraer ni descifrar cookie HttpOnly para este fin                              |
| `TOKEN_EXPIRED`                           | Dejar vencer un token válido manteniendo firma original                                               | Rechazo por expiración                                                                                                       |
| `TOKEN_BAD_SIG`                           | Alterar un segmento de token sintético válido sin volver a firmar                                     | Rechazo de firma, no prueba aislada de iss/aud                                                                               |
| `TOKEN_BAD_ISS` / `TOKEN_BAD_AUD`         | Laboratorio de verificación: firmar con clave de prueba confiable y variar exclusivamente el claim    | Probar claim con firma válida; no configurar confianza de laboratorio en staging/producción                                  |
| `SESSION_N1_ID`, `SESSION_N2_ID`          | Contextos obtenidos por clientes N1/N2 del mismo usuario                                              | Revocación individual; no confundir con `session_id` del JWT                                                                 |
| `INVITE_LINK`, `RESET_LINK`               | Emitidos por el flujo para cada ensayo                                                                | Guardar sólo en buzón restringido; evidencia incluye estado usado/vencido, no URL activa                                     |
| `CSRF_<SESSION>`                          | Campo oculto del formulario de esa sesión                                                             | Pruebas CSRF; ocultar en anexos                                                                                              |

Si se exige una prueba con semillas controladas, Ingeniería debe proporcionar un fixture local que realmente registre el factor. El vector fijo de laboratorio no sustituye el enrolamiento E2E.

## Políticas que se fijan ANTES de ejecutar

| Parámetro                        | Referencia propuesta             | Registro necesario                                                                     |
| -------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| `IDLE_ADMIN`                     | 30 min, ADR-017 en revisión      | Valor aprobado, inicio del contador, eventos que lo renuevan                           |
| `IDLE_FIELD`                     | 8 h, con bloqueo/reautenticación | Aplicabilidad al flujo de Fase 3 y aprobación                                          |
| `ABS_SESSION`                    | 12 h                             | Inicio absoluto, independencia de actividad/refresh                                    |
| `ACCESS_TTL`                     | Objetivo 5 min sujeto a PoC      | Valor efectivo del proveedor; no confundir con duración BFF                            |
| `INVITE_TTL`, `RESET_TTL`        | Sin valor fijado aquí            | Configuración real y aprobación                                                        |
| `TOTP_PERIOD`, `TOTP_SKEW`       | Obtener del proveedor            | Ventana y tolerancia; medir fuera de ellas                                             |
| `CLOCK_TOLERANCE`                | Sin valor fijado aquí            | Tolerancia de ensayo y sincronización UTC                                              |
| `LOGIN_LIMIT`, `RATE_WINDOW`     | Protección progresiva propuesta  | Umbral del entorno de pruebas y autorización de carga acotada                          |
| `ENUMERATION_TOLERANCE`          | Sin umbral estadístico aprobado  | Número de pares y criterio temporal previamente acordados; no afirmar tiempo constante |
| `RETENTION`, `RECOVERY_EVIDENCE` | Decisión pendiente               | Documento aprobado por Seguridad/Jurídico y ubicación restringida                      |

Un valor pendiente bloquea su aceptación humana, aunque se pueda ejecutar un diagnóstico contra el valor efectivo. Registrar ambas cosas.

## Preparación de identidades y control de fixtures

1. Tras el reset, Ingeniería provisiona ADMIN, CTRL y su membresía IA usando un fixture revisado exclusivamente local o el procedimiento de bootstrap autorizado del ambiente. Registrar archivo/procedimiento, commit y IDs. No hay script de bootstrap E2E entregado por esta guía.
2. Registrar `auth.users.id` y `sub` emitido por el proveedor para cada identidad. Verificar que `identity.users.identity_subject` corresponde al `sub`; el UUID de perfil local es distinto conceptualmente. No vincular sólo por igualdad de correo.
3. Ejecutar alta A/B por API. Completar invitaciones, primer ingreso y MFA; verificar estado e IDs reales. Una invitación fallida con filas creadas se registra como fallo, no se maquilla insertando el vínculo a mano.
4. Preparar secundarios, luego membresías/roles/ámbitos. Validar una sola identidad MULTI con dos membresías; propietarios exclusivos; operadores IO con permiso efectivo y AAL2.
5. Capturar baseline de cuentas, perfiles, membresías, versiones y número de eventos. Usar queries parametrizadas con acceso técnico de observación; esta observación no demuestra RLS de un usuario final.
6. Para READ_ONLY, suspensión/desactivación y expiraciones que no tengan endpoint, Ingeniería aplica fixture local revisado por ID y registra antes/después. La mutación bajo prueba se realiza por API/BFF, nunca por SQL para simular que la aplicación la hizo.
7. Después de cada caso restaurar modo ACTIVE y fixture de membresía cuando proceda, emitir sesiones nuevas y mantener historial. Para recuperación repetir con una nueva instancia de TARGET por caso terminal. Nunca restaurar secretos productivos ni modificar migraciones aplicadas.

## Cliente API y recetas de body

Base: `${API_BASE}` = `http://127.0.0.1:3001/v1` en local. Usar un cliente HTTP de QA con variables privadas sin sincronización externa de secretos. Preparación de tokens requiere un flujo admitido por el proveedor y validado por Ingeniería; si falta, marcar preparación bloqueada, no fabricar claims de un usuario real.

Headers para endpoints administrativos:

```text
Authorization: Bearer <TOKEN_AAL2_ACTOR>
Content-Type: application/json
x-ice24-context-id: <CONTEXT_ACTOR_ID>
```

Obtener contextos con `GET /me/contexts`, activar con `POST /session-contexts`, consultar `GET /session-contexts/current` y listar sesiones con `GET /me/sessions`. `GET /me` es identidad global; no sirve por sí solo para comprobar revocación contextual.

### R-ACCOUNT: alta e invitación

`POST /admin/accounts`, header adicional `Idempotency-Key: qa-RUN-account-a-01` (8–200 caracteres). Reemplazar email para staging.

```json
{
  "accountName": "QA Cuenta A RUN",
  "accountType": "COMPANY",
  "owner": {
    "email": "qa-owner-a@example.test",
    "username": "qa-owner-a",
    "displayName": "QA Propietario A"
  }
}
```

### R-CONTEXT: activar cuenta

`POST /session-contexts` con bearer del usuario objetivo:

```json
{ "accountId": "<ACCOUNT_A_ID>" }
```

### R-MEMBER: asociación secundaria

`POST /user-associations`, actor con permiso de membresías y contexto de la misma cuenta:

```json
{
  "accountId": "<ACCOUNT_A_ID>",
  "userId": "<USER_TECH_ID>",
  "roleCodes": ["TC"],
  "branchIds": [],
  "machineIds": []
}
```

### R-TRANSITION: suspensión, reactivación o fin

`POST /user-associations/<MEMBERSHIP_ID>/suspend` (o `reactivate`, `end`). Obtener versión actual por observador autorizado/resultado anterior; nunca incrementar a ciegas.

```json
{ "expectedVersion": 1, "reason": "Ensayo QA de suspensión controlada" }
```

### R-RECOVERY: abrir caso

`POST /identity-recovery-cases`:

```json
{
  "userId": "<USER_TARGET_ID>",
  "requestedChannel": "SUPPORT_CASE",
  "reason": "Simulacro QA de pérdida de correo y segundo factor"
}
```

### R-APPROVAL: aprobación independiente

`POST /identity-recovery-cases/<CASE_ID>/approvals`, cada operador usa SU bearer/contexto. Actualizar versión con la devuelta tras la primera aprobación.

```json
{
  "verificationMethod": "registered-contact",
  "evidenceReferences": ["qa-evidence:RUN:case:operator-a"],
  "reason": "Evidencia sintética verificada de forma independiente",
  "expectedVersion": 1
}
```

`registered-contact` es un ejemplo de método; la admisibilidad debe aprobarse. No hay ruta de reset final documentada en los controladores revisados: REC-14 identifica y prueba el mecanismo acordado sin inventar un endpoint.

### R-SESSION: revocaciones

- `DELETE /me/sessions/<SESSION_N1_ID>` desde N2 del mismo usuario: respuesta normal `204`.
- `DELETE /session-contexts/current` con header del contexto que se cierra: `204`.
- `POST /me/sessions/revoke-all` con `{ "reason": "QA revocación de contextos locales" }`: `204`; sólo contextos locales según contrato actual.
- Cierre global UI: formulario de `/profile` hacia `/api/auth/logout`; usa cookie, `Origin` y `csrfToken`, no bearer administrativo en el navegador.

### R-PROFILE: escritura de perfil propia

`PATCH /me`, bearer del usuario, `If-Match: "<VERSION_ACTUAL>"`:

```json
{ "displayName": "QA Consulta cambio de perfil" }
```

AU tiene este permiso en la configuración actual. Es una diferencia explícita frente a la petición de sólo lectura estricta: TEN-08 debe obtener decisión de Producto y comprobarla; no usar este endpoint como prueba de escritura entre tenants.
