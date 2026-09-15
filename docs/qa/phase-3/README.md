# Guía operativa de validación humana — Fase 3 de ICE24 OS

Versión del paquete: 1.0. Fecha: 07/09/2026. Estado: preparado para ejecución; ninguna aprobación ni ejecución se acredita mediante este documento.

Base de revisión: commit `11148e9dbadbc160ee4fe1d5d33ec714308905a7` y árbol de trabajo al preparar la guía. Para cada corrida registrar el commit y los cambios locales reales; no atribuir resultados a un commit limpio si hay diferencias.

## Entregables y uso

1. [Plantilla de evidencia](evidence-template.md): diccionario de campos, ficha copiable, registro de incidencias y acta de aprobación.
2. [Datos sintéticos](test-data.md): cuentas, perfiles, membresías, secretos referenciados, políticas temporales y preparación de solicitudes.
3. [Suite operativa](test-suite.md): casos numerados con prerrequisitos, pasos y resultados exigidos.
4. [Registro precargado](execution-register.md): 105 casos base, todos sin ejecutar; duplicar filas para variantes e intentos.

Leer los tres archivos antes de ejecutar. Crear una copia de la ficha por caso, variante, navegador y repetición. Los documentos son un plan de pruebas manuales y asistidas por herramientas, no una suite E2E automatizada ya implementada.

## Alcance y autoridad

Cubre los siete grupos solicitados: entorno; acceso/MFA; aislamiento; sesiones; recuperación; accesibilidad; seguridad/cierre. Trazabilidad: F3-01 a F3-14 y F0-07/F0-08. La suite cubre la especificación solicitada; no garantiza ausencia de vulnerabilidades ni acredita por sí sola toda conformidad WCAG.

Fuentes del proyecto:

- [Reglas obligatorias](../../../context/PROJECT_RULES.md), [tareas](../../../context/TASKS.md) y [plan](../../../context/Implementation_Plan.md).
- [Estado de Fase 3](../../backlog/phase-3-status.md), [matriz de autorización](../../product/authorization-matrix.md), [recuperación](../../product/identity-recovery.md), [soporte](../../product/support-matrix.md), [RACI](../../product/raci.md).
- [Runbook de acceso](../../runbooks/identity-access.md), [entorno local](../../runbooks/local-development.md), [ADR-017](../../decisions/adr-017-identity.md).
- Contratos: `packages/contracts/src/identity.ts`; controladores: `apps/api/src/modules/identity`; BFF: `apps/private-web/src/app/api`; SQL: `supabase/migrations/20260829000100_phase3_identity.sql`.

Referencias externas: [WCAG 2.2, W3C](https://www.w3.org/TR/WCAG22/) para la evaluación de accesibilidad; [OWASP WSTG](https://owasp.org/www-project-web-security-testing-guide/) como referencia para organizar pruebas de autenticación, autorización y sesiones. Las reglas funcionales de ICE24 provienen del proyecto, no de estas referencias.

## Responsables

| Función                | Ejecuta / revisa                                               | Aprueba                                               |
| ---------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| QA Lead                | Plan, evidencia, cobertura y reejecuciones                     | Integridad del expediente de pruebas                  |
| Ingeniería             | Entorno, fixtures, API, SQL, observabilidad, correcciones y CI | Evidencia técnica del commit                          |
| Producto y Operaciones | Roles, ámbitos, lectura y flujos de soporte                    | Comportamiento funcional y matriz vigente             |
| Seguridad              | MFA, OIDC, sesiones, recuperación y pentest                    | Controles de seguridad y ADR-017 junto con Operación  |
| Jurídico/Privacidad    | Evidencia admisible y política de tratamiento/retención        | Decisión documentada sobre esos datos                 |
| Operador REC-A / REC-B | Verificación independiente de identidad                        | Su propia decisión dentro del caso, nunca la del otro |
| QA/UX accesibilidad    | Teclado, lectores, dispositivos y criterios aplicables         | Informe de accesibilidad y compatibilidad             |

Nombrar personas y suplentes; un cargo sin nombre no es una firma. Los operadores son identidades humanas diferentes del afectado. No se sustituye una decisión jurídica por un resultado técnico.

## Orden de ejecución

1. Abrir RUN, fijar versión y responsables. Registrar políticas pendientes; asignar dueños y no inventar valores.
2. Ejecutar ENV-01 a ENV-09. El reset se realiza exclusivamente en una base local desechable, antes de cargar fixtures.
3. Ingeniería prepara el administrador inicial y contexto de control; ejecuta ENV-10/11. No hay que usar el mismo endpoint que exige administrador para resolver silenciosamente su bootstrap.
4. AUTH-01 crea A; repetir con los datos de B. Completar primer ingreso y verificar vínculo por `sub`. Cargar perfiles secundarios con identidades distintas.
5. Ejecutar AUTH restante y TEN en orden. Restaurar membresías/modos tras cada prueba destructiva sobre fixtures.
6. Ejecutar SES con sesiones nuevas y después REC sobre usuarios recuperables separados. No continuar con una contraseña o sesión ya invalidada por un caso previo.
7. Ejecutar UX en todas las combinaciones asignadas y SEC en el laboratorio autorizado. Repetir correo, OIDC, MFA, revocación y HTTPS en staging: un mock o buzón local no valida al proveedor real.
8. Corregir y reejecutar casos fallidos y regresión afectada. Ejecutar CLOSE y recopilar firmas vinculadas a RUN y commit.

## Comandos de referencia

Ejecutar uno a uno en PowerShell, guardar salida sanitizada y código de salida; detener la secuencia dependiente ante error.

```powershell
Set-Location 'C:\Users\isaac\OneDrive\Documentos\ICE24OS'
git rev-parse HEAD
git status --short
node --version
pnpm --version
docker version
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm test:integration
pnpm exec supabase start
```

El siguiente comando borra y reconstruye la base LOCAL. Confirmar en el registro que el destino es desechable y no contiene evidencia que conservar. No cambiar `--local` por `--linked` ni ejecutar un reset remoto.

```powershell
pnpm exec supabase db reset --local --no-seed
pnpm exec supabase db lint --local --level error
pnpm exec supabase test db
```

Después del reset, configurar las variables de `.env.example` en los procesos correspondientes y preparar los fixtures. No volcar valores de secretos en una transcripción. El backend lee `process.env`; copiar un `.env` a la raíz no acredita que se haya cargado. Registrar nombres configurados y resultado de conexión, no valores. En terminales separadas:

```powershell
pnpm dev:api
```

```powershell
pnpm dev:private
```

UI: `http://127.0.0.1:3000`. API: `http://127.0.0.1:3001/v1`. Swagger: `/v1/docs`. Preferir contratos Zod versionados cuando Swagger no describa un body. No hay comando `test:e2e` documentado en el package.json revisado.

## Convenciones de resultado exacto

- `HTTP 200`, `201`, `204`, `400`, `401`, `403`, `404`, `409` se comprueban en la respuesta ORIGINAL, antes de que un cliente siga redirects.
- La UI BFF puede responder `303` o redirigir páginas; registrar cadena, destino, mensaje final y estado servidor. Un `200` final en login no prueba que la solicitud protegida fue aceptada.
- Para `RECHAZO-CONTEXTO`, el criterio de producto es cero datos ajenos y cero mutaciones. La API debe normalizar a `403` para contexto sin vigencia/permisos o `404` para objeto inexistente en ámbito. Registrar cuál aplica a cada ruta antes de la corrida; no convertir un `500` en aprobado porque denegó acceso.
- `SIN-EFECTOS`: comparar conteos, campos, versiones y auditoría antes/después con un observador técnico autorizado; no sólo la pantalla.
- Todo caso negativo requiere un control positivo equivalente: mismo servicio, fixture válido y estado correcto. Caída general de API o MFA faltante no demuestra aislamiento por cuenta.
- `BLOQUEADO`: no pudo ejecutarse por un prerrequisito externo. `FALLIDO`: se ejecutó y el producto no cumplió, incluida funcionalidad requerida ausente. Ninguno equivale a aprobado.
- No marcar `NO_APLICA` por una implementación faltante dentro del alcance. Reservarlo a un criterio realmente ajeno a la superficie, con razón y aprobación.

## Observaciones de revisión que debe resolver la ejecución

Estas observaciones son de lectura del código, no hallazgos de una prueba ejecutada:

| Observación                                                                                                                                        | Tratamiento en esta suite                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| AU recibe `identity.profile-update`; `PATCH /me` usa autenticación sin el guard de permisos del controlador administrativo                         | TEN-08 separa escritura de negocio y perfil propio. El requisito de lectura estricta requiere decisión explícita; no ampliar permisos para aprobar |
| `POST /me/sessions/revoke-all` revoca contextos locales; el BFF además intenta logout Supabase                                                     | SES-03/04/07 comprueban cada capa y reutilización de tokens; no equiparar `204` local con revocación de identidad                                  |
| `revokeSession` emite `SESSION_REVOKED` también al cerrar contexto                                                                                 | SES-11 verifica `CONTEXT_REVOKED` exigido por el runbook; documentar la discrepancia, no renombrar evidencia                                       |
| Logout BFF captura errores y elimina cookie aun cuando fallen revocaciones                                                                         | SES-08 prueba fallo de dependencia; desaparición de cookie no cierra el caso                                                                       |
| La cookie se limita por expiración del token y 12 h; no se ha acreditado renovación ni temporizador de inactividad                                 | SES-09/10/12 miden políticas sin suponer implementación                                                                                            |
| La API de recuperación revisada expone apertura y aprobaciones; no expone una ruta de ejecución final del reset                                    | REC-14/15 exigen el recorrido completo y conservan pendiente si falta el mecanismo                                                                 |
| CSRF BFF usa `Origin` y campo de formulario `csrfToken`, no una cabecera `X-CSRF-Token`                                                            | SEC-08 prueba el mecanismo real y cada variante negativa                                                                                           |
| El verificador admite sólo RS256 y discovery/JWKS                                                                                                  | ENV-11 comprueba compatibilidad real; no deshabilitar validación ni cambiar algoritmo sólo para obtener verde                                      |
| pgTAP actual verifica tablas, RLS habilitado, activación cruzada y aprobaciones, pero no toda la recuperación ni un recorrido RLS por usuario real | TEN-15, REC y SEC aportan pruebas adicionales                                                                                                      |

## Criterio de salida

| Sección                | Casos base | Trazabilidad principal                         |
| ---------------------- | ---------- | ---------------------------------------------- |
| Entorno local          | 11         | F1-08/09/10, F3-01/13                          |
| Acceso y MFA           | 18         | F3-01/02/03/04/11                              |
| Permisos y aislamiento | 15         | F3-05/06/07/08/13                              |
| Sesiones               | 12         | F3-03/06/09/12                                 |
| Recuperación           | 17         | F3-01/09/10/12                                 |
| Accesibilidad y UX     | 12         | F3-11/14                                       |
| Seguridad y cierre     | 20         | F3-01/08/10/12/13, F0-07/08                    |
| Total                  | 105        | Más variantes por rol, dirección y dispositivo |

La cifra histórica de 33 unitarias y las 18 aserciones del archivo de identidad son referencias de la revisión, no metas que permitan omitir pruebas nuevas. Registrar total real, omitidas y causas; Turbo puede recuperar build/tipos de caché y debe indicarse. No presentar como compilación fresca lo recuperado.

Para declarar el cierre del alcance: casos obligatorios aprobados con evidencia, fallos corregidos y reprobados, decisiones funcionales/temporales firmadas, prueba remota realizada, accesibilidad evaluada, informe de seguridad/pentest y firmas nominales. Una excepción sólo cuenta con el procedimiento formal del proyecto; el tester no la aprueba unilateralmente. Los gates de infraestructura/producción fuera de esta suite permanecen visibles en sus documentos de fase.
