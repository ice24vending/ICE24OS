# Evidencia del complemento RA-01 de la Fase 4 (F4-18 a F4-22)

Fecha de ejecución: 10 de octubre de 2026 (UTC−6). Commit validado: `494ba67e9095b29423b7c4aac07381eca64f767f` (`main` con F4-22 integrada por #34). Entorno en [environment.txt](environment.txt): Windows 11 Pro, Node v24.19.0, pnpm 11.24.0, Docker 29.7.2.

Los resultados de abajo se copian de las salidas guardadas en esta carpeta; no se agregó ningún resultado que no esté en ellas.

## Corridas locales

| Comando                                                  | Registro                                             | Inicio → fin (UTC−6) | Resultado                                                                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                             | [check.txt](check.txt)                               | 14:40:49 → 14:41:24  | Código 0. Prettier, ESLint, typecheck (21 tareas), fronteras, infraestructura, identidad y Vitest: **463 pruebas en 75 archivos** |
| `pnpm build`                                             | [build.txt](build.txt)                               | 14:41:24 → 14:41:38  | Código 0. 14 de 14 tareas                                                                                                         |
| `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329 pnpm build` | [build-storage-origin.txt](build-storage-origin.txt) | 14:41:38 → 14:41:41  | Código 0. 14 de 14 tareas (ver nota)                                                                                              |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration`            | [integration.txt](integration.txt)                   | 14:41:41 → 14:44:07  | Código 0. **145 pruebas en 19 archivos**, incluidas las de Chromium                                                               |

Notas:

- **Origen del storage.** Las pruebas de navegador de archivos (F5-08, F5-15) suben a una doble de storage en `127.0.0.1:54329`; la CSP de `apps/private-web` toma ese origen al compilar. Por eso, como en F4-18 a F4-21, la suite se ejecutó sobre la compilación con `ICE24_STORAGE_ORIGIN`. Turbo incluye esa variable en el hash (`turbo.json`), y la segunda compilación fue un acierto de caché de una compilación anterior con las mismas entradas y la misma variable; restauró ese `.next`. La suite pasó con él, incluidas las pruebas de archivos.
- La suite reescribe las capturas versionadas de `docs/qa/phase-5/evidence/`; se restauraron sin cambios.
- No se ejecutaron localmente `supabase db reset`, `db lint` ni `supabase test db` (pgTAP). Su evidencia es la de CI (abajo).

## CI del PR #34

- [ci-pr34-checks.json](ci-pr34-checks.json): `quality`, `integration`, `supabase-migrations`, Terraform (4 ambientes) y Vercel en `pass` para la cabeza del PR `6da5e0d`, cuyo árbol es idéntico al de `494ba67` (`git diff --stat 6da5e0d 494ba67` vacío).
- [ci-pr34-supabase-migrations.log](ci-pr34-supabase-migrations.log): `supabase start`, `db reset` con todas las migraciones (incluida `20261013000100_phase4_components_backfill.sql`), `db lint --level error` y `supabase test db`: `Files=19, Tests=353`, `Result: PASS`, con las cinco suites pgTAP de Fase 4. Las claves locales por defecto que imprime `supabase start` en el runner efímero se reemplazaron por `[REDACTADO]`.

## Contenido

- [Matriz de trazabilidad RA-01](traceability.md), con huecos marcados.
- Reporte del gate: [task-f4-ra01-gate.md](../../../tasks/task-f4-ra01-gate.md).
