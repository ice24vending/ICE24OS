# Estado de Fase 0

## Resumen

| Tarea | Entregable | Estado al 17/08/2026 | Gate pendiente |
|---|---|---|---|
| F0-01 | RACI por dominio | En revisión | Sustituir roles por nombres y obtener aceptación |
| F0-02 | MVP web | En revisión | Aprobación de Dirección y Producto |
| F0-03 | Registro de decisiones | En curso avanzado | Resolver prioridades P0 y P1 |
| F0-04 | Plataforma y entornos | Aceptada | Revisión de residencia y términos comerciales |
| F0-05 | SLO y continuidad | En revisión | Aprobación de Operación, Seguridad y Legal |
| F0-06 | Stack y Vitest | Lista para adopción | Fijar versiones exactas en lockfile de Fase 1 |
| F0-07 | Identidad | En revisión | PoC de Supabase Auth y responsables de recuperación |
| F0-08 | Autorización | En revisión | Validación funcional por dominio |
| F0-09 | Códigos y folios | En revisión | Validar legibilidad y algoritmo en Fase 1 |
| F0-10 | Formatos Excel | Bloqueada externamente | Recibir al menos tres archivos reales anonimizados |
| F0-11 | Plantillas | Bloqueada externamente | Recibir manuales y plantillas aprobadas |
| F0-12 | Validación sanitaria/jurídica | Bloqueada externamente | Dictamen de responsables sanitario y jurídico |
| F0-13 | Proveedores | En revisión | Alta de cuentas, cuotas y presupuesto |
| F0-14 | Matriz de soporte | En revisión | Inventario de dispositivos reales del piloto |
| F0-15 | Runbook de incidentes | En revisión | Nombrar guardia y canales reales |
| F0-16 | Backlog trazable | Terminado documentalmente | Aprobación del orden de releases |

## Decisiones que habilitan Fase 1

Se puede iniciar el monorepo y una primera entrega web sin datos productivos con esta base: Vercel, Supabase PostgreSQL/Auth/Storage, Node.js 24 LTS, Next.js, NestJS, Vitest y Playwright. La matriz de autorización es denegación por defecto y el MVP es una rebanada vertical de mantenimiento. El gasto fijo operativo no puede superar $2,000 MXN al mes sin una nueva aprobación.

No se autoriza cargar datos reales, publicar contenido sanitario, sembrar límites regulatorios ni activar importaciones Excel hasta cerrar F0-10, F0-11 y F0-12. Producción queda además condicionada a presupuesto, revisión de privacidad y responsables operativos.

## Próximo gate recomendado

1. Dirección nombra las personas de la RACI.
2. Producto aprueba el alcance MVP-1.
3. Ingeniería ejecuta Fase 1 y despliega un esqueleto sin datos sensibles en desarrollo.
4. En paralelo se recopilan Excel, manuales y dictámenes externos.
