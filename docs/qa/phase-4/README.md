# Resultados de integración de Fase 4

Fecha documental: 20 de septiembre de 2026.

## Resultado

El responsable confirma **15 pruebas de integración aprobadas**, incluido Chromium, aislamiento entre cuentas y modo de solo lectura. Este cierre documental no repite la corrida ni asigna una fecha o duración no registrada. Hay 14 casos de equipos (13 generales y 1 condicional de navegador) y 1 caso PostgreSQL/PostGIS. Las capturas previas están en `tmp/phase4-ui-desktop.png` y `tmp/phase4-ui-mobile.png`; `tmp/` no se versiona.

## Cobertura

1. PostgreSQL efímero con PostGIS.
2. Sucursales, aislamiento y lector sin escritura.
3. MFA administrativo y publicación inmutable.
4. Borradores incompletos y evidencia no validada bloqueados.
5. Información faltante, reenvío y aprobación atómica.
6. Calendarios sin duplicados e historia al sustituir plantilla.
7. Versiones obsoletas, traslados entre cuentas y periodos solapados rechazados.
8. Solo lectura y suspensión de membresía en sesión activa.
9. Transferencia atómica, retirada de acceso anterior e historia técnica.
10. Retiro sin borrado, cancelación pendiente y auditoría append-only.
11. RLS y esquema inaccesible a roles del navegador.
12. Datos de cuenta, versiones e impedimento de edición ajena.
13. Asociación de identidad existente y denegación de permisos en sesión activa.
14. HTTP con autenticación, validación y aislamiento.
15. Chromium: alta de sucursal, separación de cuentas, CSRF, contexto obsoleto, ancho móvil, foco y solo lectura.

Fuentes: `tests/integration/equipment.test.ts` y `tests/integration/postgis.test.ts`. La suite `supabase/tests/database/phase4_equipment_test.sql` es adicional; su resultado no se incluye en los 15 casos.

## Reproducción en PowerShell

Requiere Docker, versiones Node/pnpm del repositorio y Chromium. Ejecutar desde la raíz y detenerse si falla cualquier paso:

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm exec playwright install chromium
$env:ICE24_BROWSER_TESTS = '1'
pnpm test:integration
Remove-Item Env:ICE24_BROWSER_TESTS
```

Sin `ICE24_BROWSER_TESTS=1` se omite Chromium; esa ejecución no acredita 15 aprobados. CI habilita la variable e instala Chromium con dependencias en Ubuntu. Para una nueva corrida, conservar salida, commit, fecha, totales y omisiones.

La confirmación de integración no equivale a aceptación completa de F4-01 a F4-17 ni a despliegue productivo. Acreditar por separado el gate funcional, servicios reales y checks de calidad de la revisión a publicar. Consultar [estado](../../backlog/phase-4-status.md) y [operación](../../runbooks/equipment.md).
