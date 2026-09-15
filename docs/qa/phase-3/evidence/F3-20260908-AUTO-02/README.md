# Informe F3-20260908-AUTO-02

**Fase 3 PENDIENTE; Fase 4 no habilitada.** Se analizaron 76 casos. Se aprobaron 36 comprobaciones de laboratorio y cuatro casos completos con alcance HTTP/laboratorio. No se atribuyen firmas humanas.

- [Permisos y aislamiento](ten.md)
- [Sesiones](ses.md)
- [Recuperación](rec.md)
- [Accesibilidad](ux.md)
- [Seguridad](sec.md)
- [Cierre](close.md)

## Reproducción

Desde raíz, Supabase local puerto 54322 y dependencias instaladas:

    pnpm build
    node scripts/qa/phase3-local.mjs tmp/phase3-retest.json
    node node_modules/vitest/vitest.mjs run
    node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts

Cada ejecución crea base qa_phase3_<timestamp> y fixtures aislados retenidos como evidencia. No resetea la base manual. API/JWKS usan puertos efímeros; tokens/claves sólo en memoria. AAL sintético no acredita TOTP.

## Resultados

- [Inicial](http-postgres-before.json): 14/24; diez discrepancias, una del ensayo SES-04 (esperaba 201 en vez de 204).
- [Final](http-postgres.json): 36/36, incluye pgTAP identidad 18/18. pgTAP plataforma no ejecutado aquí.
- [Reensayo 2026-09-12](http-postgres-retest.json): 36/36 sobre `qa_phase3_1789263769367`, sin fallos.
- [Unitarias](unit-summary.json): 44/44: ocho regresiones de logout y tres de recuperación pública, con dependencias simuladas.
- PostGIS 1/1 fuera del sandbox; primer intento no detectó runtime dentro del sandbox.
- Build 14/14, 12 caché, dos reconstruidas; `pnpm check` completo correcto.
- [Hashes](source-sha256.json), base SHA 11148e9dbadbc160ee4fe1d5d33ec714308905a7 con cambios locales. CI remota pendiente.

## Anomalías corregidas

1. Cruce activación: P0002 normalizado 404.
2. Suspensión: tipado SQL y resolución por cuenta.
3. OW no concede IA/IO; exige IA activo.
4. Contextos/autorización comprueban vigencia, archivo y roles activos.
5. Body no sustituye session_id del JWT.
6. Autoaprobación 403, duplicado 409 y conteo segunda aprobación corregido.
7. Revocación/auditoría atómicas y evento CONTEXT_REVOKED.
8. Logout CSRF inválido 403 sin efectos; fallo remoto 503 sin borrar cookie ni fingir cierre. Puede haber revocación local parcial; se debe reintentar.
9. Contratos inválidos 400 genérico sin entradas sensibles.
10. Recuperación pública sólo audita SUCCESS si el proveedor acepta; error/origen inválido registra FAILED sin revelar existencia de cuenta.

## Pendientes

F3-QA-OPEN-01 / REC-14: falta reset final ligado al caso y procedimiento aprobado (FALLIDO de revisión de cobertura, no reset ejecutado). Revocación inmediata/renovación requieren proveedor real; guard offline no demuestra revocación. Recuperación estándar exige enlace limpio que cree sesión BFF. Decisiones TEN-08/ADR-017, UX, dispositivos, HTTPS, pentest y firmas pendientes. Se solicitaron URL staging y responsables. No se modificaron ADR ni criterios para obtener verde.

El [primer intento de reensayo](http-postgres-retest-blocked.json) del 2026-09-12 quedó bloqueado porque `127.0.0.1:54322` rechazó conexión. Después de iniciar el entorno, se repitió sin cambiar el criterio y el resultado fue 36/36. Se conservan ambos intentos como historial.
