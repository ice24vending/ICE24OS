# F3-20260908-AUTO-02 — Seguridad

LOCAL HTTP/PostgreSQL aislado. Ejecutor Codex; aprobación humana PENDIENTE.
Fecha UTC: 2026-09-09T03:51:51.097Z a 2026-09-09T03:51:54.769Z. SHA base 11148e9dbadbc160ee4fe1d5d33ec714308905a7 con cambios sin commit.
JWKS/AAL sintéticos no acreditan Supabase/TOTP reales.

## SEC-01 — API sin token y token malformado

- Estado integral: **APROBADO**.
- Análisis: HTTP sin token, Basic y malformado: 401 genérico; control 200.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-01 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Sin token y token malformado; control positivo: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-02 — Firma o algoritmo inválidos

- Estado integral: **APROBADO**.
- Análisis: Firma alterada, none y HS256: 401 sin nuevas identidades/sesiones.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-02 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Firma alterada y alg none/HS256: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-03 — Token expirado con firma válida

- Estado integral: **EN_CURSO**.
- Análisis: exp pasado firmado recibe 401. Falta esperar los mismos bytes de un token real.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-03 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Claims con firma válida; variantes aisladas: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-04 — Issuer incorrecto aislado

- Estado integral: **APROBADO**.
- Análisis: Sólo iss cambia con clave/JWKS válidos: 401; control 200. Harness previsto cumplido.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-04 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Claims con firma válida; variantes aisladas: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-05 — Audience incorrecta aislada

- Estado integral: **APROBADO**.
- Análisis: aud incorrecta cadena/lista 401; lista correcta 200. Firma válida.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-05 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Claims con firma válida; variantes aisladas: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-06 — Rotación real de JWKS

- Estado integral: **NO_EJECUTADO**.
- Análisis: Pendiente rotación real K1/K2 y solapamiento aprobado.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-06 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-07 — Discovery/JWKS no confiables o caídos

- Estado integral: **NO_EJECUTADO**.
- Análisis: Pendiente discovery no confiable/caído y caché fría/caliente.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-07 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-08 — CSRF de formularios autenticados

- Estado integral: **EN_CURSO**.
- Análisis: Logout: cinco negativos CSRF/Origin y control. Faltan password, MFA y contexto.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-08 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-09 — Origin en login/recuperación y CORS

- Estado integral: **NO_EJECUTADO**.
- Análisis: Origin revisado en código; falta origen adversario local y CORS navegador.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-09 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-10 — Cookies de sesión en HTTPS

- Estado integral: **BLOQUEADO**.
- Análisis: Sin staging HTTPS; localhost no acredita cookie Secure producción.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-10 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-11 — Fuga de secretos y datos entre contextos

- Estado integral: **NO_EJECUTADO**.
- Análisis: Reportes sanitizados; falta revisión integral bundles, almacenamiento y logs.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-11 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-12 — Auditoría append-only y consistencia

- Estado integral: **EN_CURSO**.
- Análisis: service_role no altera eventos; fallo INSERT conserva sesión y reintento revoca. Falta rol efectivo/correlaciones.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-12 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Auditoría y revocación atómicas cuando falla INSERT de evento: APROBADO; service_role no puede actualizar ni borrar eventos: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-13 — Inventario de endpoints y denegación por defecto

- Estado integral: **NO_EJECUTADO**.
- Análisis: Pendiente inventario ejecutado sin autoridad/control positivo y revisión nominal.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-13 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-14 — Manipulación del identificador de sesión de identidad

- Estado integral: **EN_CURSO**.
- Análisis: identitySessionId falsificado 400; deriva JWT. Falta sesión ajena real y revocación global.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-14 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No se acepta identitySessionId falsificado: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SEC-15 — Pentest autorizado y revalidación

- Estado integral: **BLOQUEADO**.
- Análisis: Pendiente pentest independiente y su informe.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SEC-15 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.
