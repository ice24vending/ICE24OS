# F3-20260908-AUTO-02 — Recuperación

LOCAL HTTP/PostgreSQL aislado. Ejecutor Codex; aprobación humana PENDIENTE.
Fecha UTC: 2026-09-09T03:51:51.097Z a 2026-09-09T03:51:54.769Z. SHA base 11148e9dbadbc160ee4fe1d5d33ec714308905a7 con cambios sin commit.
JWKS/AAL sintéticos no acreditan Supabase/TOTP reales.

## REC-01 — Solicitud estándar y mensaje público ciego

- Estado integral: **NO_EJECUTADO**.
- Análisis: Pendiente existente/inexistente y entrega real de correo.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-01 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-02 — Restablecer contraseña desde enlace

- Estado integral: **NO_EJECUTADO**.
- Análisis: Pendiente enlace limpio: access/first exige sesión BFF previa. Demostrar intercambio y preservación MFA.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-02 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-03 — Enlace de recuperación de un solo uso

- Estado integral: **BLOQUEADO**.
- Análisis: Depende REC-02: enlace consumido desde otro cliente limpio.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-03 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-04 — Enlace vencido

- Estado integral: **BLOQUEADO**.
- Análisis: Depende enlace real y TTL/tolerancia aprobados.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-04 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-05 — Invalidez de contraseña anterior

- Estado integral: **BLOQUEADO**.
- Análisis: Depende REC-02: contraseña vieja/nueva y MFA.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-05 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-06 — Invalidación de sesiones previas tras recuperación

- Estado integral: **BLOQUEADO**.
- Análisis: Depende REC-02: sesiones, JWT y refresh previos.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-06 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-07 — Política humana y apertura de caso avanzado

- Estado integral: **EN_CURSO**.
- Análisis: Apertura con IO sintético funciona; faltan operadores nominales, política y evento.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-07 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-08 — Autoaprobación alcanza regla de doble control

- Estado integral: **EN_CURSO**.
- Análisis: Autoaprobación con permisos/aal2 sintético 403 y cero filas. Falta proveedor/personas.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-08 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Doble control de recuperación self: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-09 — Primera aprobación por operador A

- Estado integral: **EN_CURSO**.
- Análisis: Primera aprobación técnica VERIFYING. Falta revisión humana, evento y ausencia de reset.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-09 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-10 — Una aprobación es insuficiente

- Estado integral: **BLOQUEADO**.
- Análisis: No hay mecanismo final identificado para probar ejecución insuficiente; depende REC-14.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-10 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-11 — Doble aprobación del mismo operador

- Estado integral: **EN_CURSO**.
- Análisis: Mismo operador con versión vigente 409. Falta contador/historia y mecanismo final.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-11 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Doble control de recuperación duplicate: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-12 — Segunda aprobación independiente por B

- Estado integral: **EN_CURSO**.
- Análisis: Dos operadores sintéticos APPROVED/count=2; corregido snapshot SQL. No acredita personas ni reset.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-12 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Doble control de recuperación dual: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-13 — MFA, permisos y concurrencia de aprobaciones

- Estado integral: **EN_CURSO**.
- Análisis: Apertura aal1 403 y control aal2 válido. Faltan aprobaciones sin MFA, READ y carrera.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-13 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: MFA insuficiente impide apertura; control válido: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-14 — Restablecimiento controlado después de dos aprobaciones

- Estado integral: **FALLIDO**.
- Análisis: Brecha funcional de revisión: sólo existen apertura/aprobaciones; no se identificó procedimiento/ruta ejecutable de reset ligado al caso. FALLIDO de cobertura, no ensayo de reset simulado.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-14 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-15 — Post-recuperación: factores, sesiones y notificaciones

- Estado integral: **BLOQUEADO**.
- Análisis: Depende REC-14: factores, revocación y notificaciones.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-15 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-16 — Evidencia insuficiente y estados terminales

- Estado integral: **EN_CURSO**.
- Análisis: Apertura inválida 400 sin caso nuevo. Faltan evidenceReferences vacío, rechazo y terminales.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-16 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Entradas inválidas se rechazan con 400 sin crear caso: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## REC-17 — Fallo de correo/proveedor y auditoría de recuperación

- Estado integral: **EN_CURSO**.
- Análisis: La ruta pública auditaba SUCCESS aun cuando el proveedor devolvía error. Se corrigió para exigir `response.ok`, registrar FAILED con razón genérica y conservar el mismo 303 público.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario REC-17 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Tres regresiones unitarias aprobadas: aceptación, error 503 del proveedor y Origin ajeno. Las dos respuestas públicas son idénticas y el fallo queda diferenciado sólo en auditoría.
- Evidencia: `apps/private-web/src/app/api/auth/recovery/route.test.ts`; [resumen unitario](unit-summary.json). Proveedor y auditoría simulados.
- Próximo paso: inducir fallo SMTP real en el entorno desechable y comprobar entrega, correlación y ausencia de reset.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.
