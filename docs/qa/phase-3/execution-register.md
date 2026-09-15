# Registro de ejecución — Fase 3

Corridas F3-20260908-01 (humana), F3-20260908-AUTO-02 (laboratorio Codex) y F3-20260914-SCOPE-03 (alcance individual ajustado). SHA base 11148e9dbadbc160ee4fe1d5d33ec714308905a7 con cambios locales. [Informe vigente](evidence/F3-20260914-SCOPE-03/README.md).

## Corrida vigente — F3-20260914-SCOPE-03

La siguiente matriz prevalece para el gate de entrega ajustado. Las tablas históricas se conservan para trazabilidad y no reemplazan el resultado de esta corrida.

| Bloque                 | Casos / alcance                                                 | Evidencia                                                             | Estado    | Aprobador                      |
| ---------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- | --------- | ------------------------------ |
| Login negativo         | `AUTH-06`, `AUTH-07`                                            | [Supabase Auth](evidence/F3-20260914-SCOPE-03/supabase-auth.json)     | APROBADO  | Responsable individual         |
| MFA                    | `AUTH-11` a `AUTH-15`                                           | [Supabase Auth y expediente](evidence/F3-20260914-SCOPE-03/README.md) | APROBADO  | Responsable individual         |
| Multi-cuenta           | `TEN-01` a `TEN-15`; UI final A/B                               | [Ficha visual](evidence/F3-20260914-SCOPE-03/block3-visual.md)        | APROBADO  | Isaac, 14/09/2026              |
| Revocación             | `SES-01` a `SES-11` según evidencia compuesta                   | [Expediente](evidence/F3-20260914-SCOPE-03/README.md)                 | APROBADO  | Responsable individual         |
| Recuperación           | `REC-01` a `REC-17` según evidencia compuesta; incluye REC-14   | [Expediente](evidence/F3-20260914-SCOPE-03/README.md)                 | APROBADO  | Responsable individual         |
| Pentest externo        | `SEC-15`                                                        | [Ajuste](evidence/F3-20260914-SCOPE-03/README.md)                     | NO_APLICA | Eximido por alcance individual |
| Accesibilidad formal   | `UX-01` a `UX-12`                                               | [Ajuste](evidence/F3-20260914-SCOPE-03/README.md)                     | NO_APLICA | Eximido por alcance individual |
| Firmas departamentales | `CLOSE-02`, `CLOSE-03`, `CLOSE-05` y parte formal de `CLOSE-04` | [Ajuste](evidence/F3-20260914-SCOPE-03/README.md)                     | NO_APLICA | Eximido por alcance individual |
| Cierre técnico local   | `CLOSE-01` y reejecución técnica de `CLOSE-04`                  | [Gates](evidence/F3-20260914-SCOPE-03/README.md)                      | APROBADO  | Responsable individual         |

**Decisión global vigente: FASE 3 COMPLETADA Y APROBADA.** No hay fallos funcionales abiertos dentro del alcance ajustado.

Usar [diccionario y ficha completa](evidence-template.md) por caso/variante/intento. Duplicar fila para cada navegador, dirección, rol o cliente solicitado; la cantidad de ejecuciones será mayor que los 105 casos base. `Ficha` debe contener todos los campos obligatorios antes de aprobar. No reutilizar esta tabla como evidencia de ejecución por sí sola.

## Sección 1 — Validación del entorno técnico local

| Caso   | Nombre                                         | Variante / intento | Ficha     | Estado       | Defecto | Aprobador |
| ------ | ---------------------------------------------- | ------------------ | --------- | ------------ | ------- | --------- |
| ENV-01 | Identificar versión y herramientas             | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| ENV-02 | Docker cliente y servidor                      | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| ENV-03 | Instalación reproducible                       | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| ENV-04 | Quality gate y referencia de 33 pruebas        | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| ENV-05 | Build de superficies                           | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| ENV-06 | Integración PostgreSQL/PostGIS                 | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| ENV-07 | Arranque Supabase y reset local                | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| ENV-08 | Lint SQL                                       | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| ENV-09 | pgTAP de plataforma e identidad                | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| ENV-10 | Configuración, arranque y bootstrap            | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| ENV-11 | Compatibilidad OIDC/SMTP y políticas de ensayo | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |

## Sección 2 — Acceso, invitación, autenticación y MFA

| Caso    | Nombre                                                | Variante / intento | Ficha     | Estado       | Defecto | Aprobador |
| ------- | ----------------------------------------------------- | ------------------ | --------- | ------------ | ------- | --------- |
| AUTH-01 | Alta e invitación A/B vía API                         | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-02 | Idempotencia y validación del alta                    | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-03 | Primer ingreso por invitación                         | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-04 | Invitación usada, expirada y alta pública             | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-05 | Cierre y nuevo login válido                           | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-06 | Contraseña errónea                                    | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-07 | Usuario inexistente y no enumeración                  | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-08 | Contraseña débil y límite en servidor                 | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-09 | OIDC Authorization Code + PKCE                        | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-10 | Manipulación de state y replay OIDC                   | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-11 | Enrolamiento TOTP real                                | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-12 | TOTP correcto                                         | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-13 | TOTP incorrecto                                       | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-14 | TOTP vencido                                          | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-15 | MFA antes/después en acción crítica                   | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-16 | Rutas directas sin sesión                             | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-17 | Rutas con sesión expirada                             | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |
| AUTH-18 | Identidad pendiente/desactivada y control de intentos | BASE / 1           | PENDIENTE | NO_EJECUTADO | —       | PENDIENTE |

## Sección 3 — Permisos, multi-tenancy y aislamiento

| Caso   | Nombre                                                       | Variante / intento         | Ficha                                           | Estado       | Defecto | Aprobador                           |
| ------ | ------------------------------------------------------------ | -------------------------- | ----------------------------------------------- | ------------ | ------- | ----------------------------------- |
| TEN-01 | Propietarios exclusivos en UI                                | IA → A (suplementaria) / 1 | [FICHA](evidence/F3-20260908-01-TEN-01.md)      | APROBADO     | —       | Solicitante; nombre/firma pendiente |
| TEN-01 | Propietarios exclusivos en UI                                | OW-B → B / 1               | [FICHA](evidence/F3-20260908-01-TEN-01.md)      | APROBADO     | —       | Solicitante; nombre/firma pendiente |
| TEN-01 | Propietarios exclusivos en UI                                | OW-A → A / 1               | [FICHA](evidence/F3-20260908-01-TEN-01.md)      | NO_EJECUTADO | —       | PENDIENTE                           |
| TEN-02 | Activación cruzada A→B y B→A                                 | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | EN_CURSO     | —       | PENDIENTE nominal                   |
| TEN-03 | Modificar asociación ajena por ID                            | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | EN_CURSO     | —       | PENDIENTE nominal                   |
| TEN-04 | Crear asociación con accountId ajeno                         | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | EN_CURSO     | —       | PENDIENTE nominal                   |
| TEN-05 | Manipular cabeceras y contexto de otro usuario               | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | EN_CURSO     | —       | PENDIENTE nominal                   |
| TEN-06 | Cambio de contexto del usuario multi-cuenta                  | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | EN_CURSO     | —       | PENDIENTE nominal                   |
| TEN-07 | Consulta: lectura autorizada y escritura de negocio denegada | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | EN_CURSO     | —       | PENDIENTE nominal                   |
| TEN-08 | Decisión explícita sobre lectura estricta y perfil propio    | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | BLOQUEADO    | —       | PENDIENTE nominal                   |
| TEN-09 | Suspensión en caliente de asociación                         | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | EN_CURSO     | —       | PENDIENTE nominal                   |
| TEN-10 | Reactivación, asociación terminada y vigencias               | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | NO_EJECUTADO | —       | PENDIENTE nominal                   |
| TEN-11 | Cuenta READ_ONLY                                             | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | EN_CURSO     | —       | PENDIENTE nominal                   |
| TEN-12 | Ámbitos, sensibilidad y denegación explícita                 | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | EN_CURSO     | —       | PENDIENTE nominal                   |
| TEN-13 | Cobertura de los nueve roles base                            | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | EN_CURSO     | —       | PENDIENTE nominal                   |
| TEN-14 | Concurrencia y versión esperada                              | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | EN_CURSO     | —       | PENDIENTE nominal                   |
| TEN-15 | RLS, acceso directo y aislamiento real                       | BASE / 1                   | [Análisis](evidence/F3-20260908-AUTO-02/ten.md) | EN_CURSO     | —       | PENDIENTE nominal                   |

## Sección 4 — Duración, gestión y revocación de sesiones

| Caso   | Nombre                                             | Variante / intento | Ficha                                           | Estado       | Defecto | Aprobador         |
| ------ | -------------------------------------------------- | ------------------ | ----------------------------------------------- | ------------ | ------- | ----------------- |
| SES-01 | Revocar sesión N1 desde N2                         | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ses.md) | EN_CURSO     | —       | PENDIENTE nominal |
| SES-02 | Conservar sesión no revocada y rechazar ID ajeno   | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ses.md) | EN_CURSO     | —       | PENDIENTE nominal |
| SES-03 | Cerrar todas las sesiones desde Perfil             | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ses.md) | NO_EJECUTADO | —       | PENDIENTE nominal |
| SES-04 | Revocación local por API frente a identidad global | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ses.md) | EN_CURSO     | —       | PENDIENTE nominal |
| SES-05 | Cerrar sólo contexto A                             | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ses.md) | EN_CURSO     | —       | PENDIENTE nominal |
| SES-06 | Retirar acceso de A conservando B                  | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ses.md) | EN_CURSO     | —       | PENDIENTE nominal |
| SES-07 | Revocación global y reutilización de tokens        | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ses.md) | NO_EJECUTADO | —       | PENDIENTE nominal |
| SES-08 | Fallo de dependencia durante cierre global         | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ses.md) | EN_CURSO     | —       | PENDIENTE nominal |
| SES-09 | Inactividad administración/campo                   | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ses.md) | EN_CURSO     | —       | PENDIENTE nominal |
| SES-10 | Duración absoluta independiente de actividad       | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ses.md) | EN_CURSO     | —       | PENDIENTE nominal |
| SES-11 | Eventos de revocación y correlación                | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ses.md) | EN_CURSO     | —       | PENDIENTE nominal |
| SES-12 | TTL del access token y renovación segura           | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ses.md) | BLOQUEADO    | —       | PENDIENTE nominal |

## Sección 5 — Flujos de recuperación de identidad

| Caso   | Nombre                                                  | Variante / intento | Ficha                                           | Estado       | Defecto       | Aprobador         |
| ------ | ------------------------------------------------------- | ------------------ | ----------------------------------------------- | ------------ | ------------- | ----------------- |
| REC-01 | Solicitud estándar y mensaje público ciego              | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | NO_EJECUTADO | —             | PENDIENTE nominal |
| REC-02 | Restablecer contraseña desde enlace                     | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | NO_EJECUTADO | —             | PENDIENTE nominal |
| REC-03 | Enlace de recuperación de un solo uso                   | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | BLOQUEADO    | —             | PENDIENTE nominal |
| REC-04 | Enlace vencido                                          | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | BLOQUEADO    | —             | PENDIENTE nominal |
| REC-05 | Invalidez de contraseña anterior                        | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | BLOQUEADO    | —             | PENDIENTE nominal |
| REC-06 | Invalidación de sesiones previas tras recuperación      | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | BLOQUEADO    | —             | PENDIENTE nominal |
| REC-07 | Política humana y apertura de caso avanzado             | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | EN_CURSO     | —             | PENDIENTE nominal |
| REC-08 | Autoaprobación alcanza regla de doble control           | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | EN_CURSO     | —             | PENDIENTE nominal |
| REC-09 | Primera aprobación por operador A                       | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | EN_CURSO     | —             | PENDIENTE nominal |
| REC-10 | Una aprobación es insuficiente                          | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | BLOQUEADO    | —             | PENDIENTE nominal |
| REC-11 | Doble aprobación del mismo operador                     | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | EN_CURSO     | —             | PENDIENTE nominal |
| REC-12 | Segunda aprobación independiente por B                  | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | EN_CURSO     | —             | PENDIENTE nominal |
| REC-13 | MFA, permisos y concurrencia de aprobaciones            | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | EN_CURSO     | —             | PENDIENTE nominal |
| REC-14 | Restablecimiento controlado después de dos aprobaciones | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | FALLIDO      | F3-QA-OPEN-01 | PENDIENTE nominal |
| REC-15 | Post-recuperación: factores, sesiones y notificaciones  | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | BLOQUEADO    | —             | PENDIENTE nominal |
| REC-16 | Evidencia insuficiente y estados terminales             | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | EN_CURSO     | —             | PENDIENTE nominal |
| REC-17 | Fallo de correo/proveedor y auditoría de recuperación   | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/rec.md) | EN_CURSO     | F3-QA-FIX-10  | PENDIENTE nominal |

## Sección 6 — Accesibilidad WCAG 2.2 AA y compatibilidad UX

| Caso  | Nombre                                                 | Variante / intento | Ficha                                          | Estado       | Defecto | Aprobador         |
| ----- | ------------------------------------------------------ | ------------------ | ---------------------------------------------- | ------------ | ------- | ----------------- |
| UX-01 | Recorrido completo por teclado                         | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ux.md) | NO_EJECUTADO | —       | PENDIENTE nominal |
| UX-02 | Foco visible y no oculto                               | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ux.md) | NO_EJECUTADO | —       | PENDIENTE nominal |
| UX-03 | Lectores de pantalla y semántica                       | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ux.md) | NO_EJECUTADO | —       | PENDIENTE nominal |
| UX-04 | Ampliación al 200%                                     | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ux.md) | NO_EJECUTADO | —       | PENDIENTE nominal |
| UX-05 | Reflow a 320 píxeles CSS                               | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ux.md) | NO_EJECUTADO | —       | PENDIENTE nominal |
| UX-06 | Contraste medido                                       | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ux.md) | NO_EJECUTADO | —       | PENDIENTE nominal |
| UX-07 | Gestor de contraseñas, pegar y autenticación accesible | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ux.md) | NO_EJECUTADO | —       | PENDIENTE nominal |
| UX-08 | Estados de carga y prevención de duplicados            | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ux.md) | NO_EJECUTADO | —       | PENDIENTE nominal |
| UX-09 | Vacío, falta de permiso y error recuperable            | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ux.md) | EN_CURSO     | —       | PENDIENTE nominal |
| UX-10 | Compatibilidad de navegadores y dispositivos           | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ux.md) | NO_EJECUTADO | —       | PENDIENTE nominal |
| UX-11 | Tamaño táctil y ayudas visuales                        | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ux.md) | NO_EJECUTADO | —       | PENDIENTE nominal |
| UX-12 | Evaluación completa de criterios aplicables            | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/ux.md) | NO_EJECUTADO | —       | PENDIENTE nominal |

## Sección 7 — Seguridad del entorno y cierre

| Caso     | Nombre                                                | Variante / intento | Ficha                                             | Estado       | Defecto | Aprobador         |
| -------- | ----------------------------------------------------- | ------------------ | ------------------------------------------------- | ------------ | ------- | ----------------- |
| SEC-01   | API sin token y token malformado                      | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | APROBADO     | —       | PENDIENTE nominal |
| SEC-02   | Firma o algoritmo inválidos                           | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | APROBADO     | —       | PENDIENTE nominal |
| SEC-03   | Token expirado con firma válida                       | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | EN_CURSO     | —       | PENDIENTE nominal |
| SEC-04   | Issuer incorrecto aislado                             | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | APROBADO     | —       | PENDIENTE nominal |
| SEC-05   | Audience incorrecta aislada                           | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | APROBADO     | —       | PENDIENTE nominal |
| SEC-06   | Rotación real de JWKS                                 | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | NO_EJECUTADO | —       | PENDIENTE nominal |
| SEC-07   | Discovery/JWKS no confiables o caídos                 | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | NO_EJECUTADO | —       | PENDIENTE nominal |
| SEC-08   | CSRF de formularios autenticados                      | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | EN_CURSO     | —       | PENDIENTE nominal |
| SEC-09   | Origin en login/recuperación y CORS                   | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | NO_EJECUTADO | —       | PENDIENTE nominal |
| SEC-10   | Cookies de sesión en HTTPS                            | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | BLOQUEADO    | —       | PENDIENTE nominal |
| SEC-11   | Fuga de secretos y datos entre contextos              | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | NO_EJECUTADO | —       | PENDIENTE nominal |
| SEC-12   | Auditoría append-only y consistencia                  | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | EN_CURSO     | —       | PENDIENTE nominal |
| SEC-13   | Inventario de endpoints y denegación por defecto      | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | NO_EJECUTADO | —       | PENDIENTE nominal |
| SEC-14   | Manipulación del identificador de sesión de identidad | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | EN_CURSO     | —       | PENDIENTE nominal |
| SEC-15   | Pentest autorizado y revalidación                     | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/sec.md)   | BLOQUEADO    | —       | PENDIENTE nominal |
| CLOSE-01 | CI del commit exacto                                  | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/close.md) | BLOQUEADO    | —       | PENDIENTE nominal |
| CLOSE-02 | Aprobación de matriz y ADR-017                        | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/close.md) | BLOQUEADO    | —       | PENDIENTE nominal |
| CLOSE-03 | Aprobación de recuperación y privacidad               | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/close.md) | BLOQUEADO    | —       | PENDIENTE nominal |
| CLOSE-04 | Cobertura, accesibilidad y reejecuciones              | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/close.md) | BLOQUEADO    | —       | PENDIENTE nominal |
| CLOSE-05 | Acta final multidisciplinaria                         | BASE / 1           | [Análisis](evidence/F3-20260908-AUTO-02/close.md) | BLOQUEADO    | —       | PENDIENTE nominal |

## Consolidación de las corridas

- Inventario: 105 casos; revisión actual 76 TEN-01..CLOSE-05.
- Humanas previas: dos variantes UI aprobadas con límites originales.
- Laboratorio: 36 comprobaciones aprobadas, incluye un ensayo pgTAP con 18 aserciones.
- Unitarias 44/44. PostGIS 1/1 fuera del sandbox.
- Casos completos aprobados actuales: SEC-01, SEC-02, SEC-04, SEC-05 (4/76; 5,26%).
- Estados integrales: {"EN_CURSO":35,"BLOQUEADO":15,"NO_EJECUTADO":21,"FALLIDO":1,"APROBADO":4}.
- 100% del laboratorio no equivale a 100% de la fase.
- ENV/AUTH conservan estados; resultados técnicos no sustituyen todos sus pasos.
- Decisión histórica de F3-20260908-AUTO-02: **PENDIENTE**. Fue superada para el alcance individual por F3-20260914-SCOPE-03. [Informe vigente](evidence/F3-20260914-SCOPE-03/README.md).
