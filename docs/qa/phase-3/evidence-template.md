# Template de registro de evidencias

Formato Markdown UTF-8, utilizable en Bloc de Notas. Copiar la ficha por ejecución; conservar la anterior al reintentar. No rellenar resultados con el texto esperado.

## Diccionario de campos

| Campo / columna       | Obligatorio | Qué ingresar exactamente                                                                                                                    |
| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| RUN_ID                | Sí          | Código de corrida, por ejemplo `F3-20260907-01`; agrupa una versión/configuración                                                           |
| ID_CASO               | Sí          | ID de la suite, por ejemplo `TEN-03`; no inventar otro para ocultar un fallo                                                                |
| VARIANTE              | Sí          | Dirección A→B/B→A, rol, navegador, local/staging u otra fila de datos; `BASE` si no hay                                                     |
| INTENTO               | Sí          | Entero desde 1; una reejecución incrementa sin reemplazar evidencia anterior                                                                |
| NOMBRE                | Sí          | Nombre literal del caso                                                                                                                     |
| REQUISITO             | Sí          | F3-xx, sección solicitada, política o criterio WCAG aplicable                                                                               |
| ENTORNO               | Sí          | LOCAL/TEST/STAGING, URL base sin credenciales y alias del proyecto Supabase; nunca URL de conexión con contraseña                           |
| COMMIT_Y_CAMBIOS      | Sí          | SHA completo de API/UI/migraciones; `limpio` o lista/resumen de diferencias y parche sanitizado con hash                                    |
| CONFIGURACION         | Sí          | Versión de configuración y políticas; nombres de variables presentes, flags y tiempos aprobados; secretos sólo por alias                    |
| EJECUTOR              | Sí          | Nombre, función y usuario sintético utilizado; en recuperación identificar cada operador                                                    |
| INICIO_FIN            | Sí          | Fecha/hora ISO 8601 con offset y duración; para expiraciones agregar tiempos UTC del servidor                                               |
| CLIENTE               | Sí          | SO, versión exacta del navegador, dispositivo, viewport, zoom, lector de pantalla y versión; `CLI` cuando corresponda                       |
| PREPARACION_DATOS     | Sí          | Alias de cuenta/usuario, UUID local, sub, membresía, rol, ámbito, AAL, estado, versión; valores iniciales y dependencias aprobadas          |
| REFERENCIAS_SECRETOS  | Según caso  | Alias del vault local, nunca contraseña, token, cookie, semilla, QR o enlace activo                                                         |
| PASOS_EJECUTADOS      | Sí          | Secuencia real numerada, método/ruta, body sanitizado, variantes, tiempos y cualquier desviación del plan                                   |
| RESULTADO_ESPERADO    | Sí          | Condición del caso: HTTP, datos, ausencia de efectos, eventos y límites aprobados; fijada antes de probar                                   |
| RESULTADO_OBSERVADO   | Al ejecutar | Hechos: HTTP original, redirecciones, mensaje, conteos/versiones, latencia; si bloqueado, punto y causa exactos                             |
| EVIDENCIA_SANITIZADA  | Al ejecutar | Enlaces o rutas relativas del repositorio restringido de evidencia, archivo, tipo, autor, fecha; hash SHA-256 si se requiere integridad     |
| CORRELACION_AUDITORIA | Según caso  | Correlation ID de cada llamada, IDs de eventos, actor/sujeto/cuenta, resultado, hora; listar IDs diferentes entre BFF/API si no se propagan |
| ESTADO                | Sí          | `NO_EJECUTADO`, `EN_CURSO`, `APROBADO`, `FALLIDO`, `BLOQUEADO` o `NO_APLICA`                                                                |
| DEFECTO_Y_SEVERIDAD   | Si falla    | ID del defecto, impacto, evidencia y prioridad; no incluir secretos en el título                                                            |
| LIMPIEZA              | Sí          | Qué fixture se restauró o invalidó; si se dejó intencionalmente estado para un caso dependiente, indicarlo                                  |
| REEJECUCION           | Si aplica   | ID del intento previo, commit corregido y casos de regresión repetidos                                                                      |
| APROBADOR             | Para cerrar | Nombre, función, decisión, fecha, alcance y referencia de firma/aceptación; nunca firmar por otra persona                                   |

## Cabecera de corrida

```text
RUN_ID:
Objetivo y alcance:
Versión de esta guía:
API/UI/migraciones — commit y cambios:
Entorno y alias de proyecto:
Responsable QA:
Responsable Ingeniería:
Responsables Producto/Operación, Seguridad, Jurídico y UX:
Ventana de ejecución:
Políticas aprobadas (IDs/versiones):
Dependencias y bloqueos iniciales:
Ubicación restringida de evidencias:
```

## Ficha copiable por caso

```text
RUN_ID:
ID_CASO:
VARIANTE: BASE
INTENTO: 1
NOMBRE:
REQUISITO:
ENTORNO:
COMMIT_Y_CAMBIOS:
CONFIGURACION:
EJECUTOR:
INICIO_FIN:
CLIENTE:
PREPARACION_DATOS:
REFERENCIAS_SECRETOS:

PASOS_EJECUTADOS:
1.
2.
3.

RESULTADO_ESPERADO:
RESULTADO_OBSERVADO:
EVIDENCIA_SANITIZADA:
CORRELACION_AUDITORIA:
ESTADO: NO_EJECUTADO
DEFECTO_Y_SEVERIDAD:
LIMPIEZA:
REEJECUCION:
APROBADOR: PENDIENTE
```

## Índice tabular de la corrida

La ficha anterior contiene el detalle. Añadir una fila aquí por variante/intento.

| RUN         | Caso        | Variante | Intento | Entorno/commit | Ejecutor/fecha | Datos | Pasos/ficha  | Esperado          | Observado    | Evidencia sanitizada | Estado       | Defecto | Aprobador |
| ----------- | ----------- | -------- | ------- | -------------- | -------------- | ----- | ------------ | ----------------- | ------------ | -------------------- | ------------ | ------- | --------- |
| POR_ASIGNAR | POR_ASIGNAR | BASE     | 1       | POR_REGISTRAR  | POR_ASIGNAR    | Alias | Ruta a ficha | Criterio del caso | Sin ejecutar | Pendiente            | NO_EJECUTADO | —       | PENDIENTE |

## Sanitización verificable

1. Capturar sólo datos sintéticos y metadatos necesarios; no grabar el escaneo QR de MFA.
2. Antes de adjuntar HAR, requests o logs, retirar `Authorization`, `Cookie`, `Set-Cookie` (valor), `apikey`, passwords, códigos OAuth/TOTP, refresh/access tokens, CSRF, semillas y enlaces de invitación/reset completos. Conservar nombres de atributos y resultados de validación.
3. Sustituir valores por `[REDACTADO:alias]`; conservar método, ruta sin query secreta, estado HTTP, cuenta sintética, hora y correlation ID.
4. Revisar manualmente el archivo final, incluidas imágenes, metadatos y cuerpos. Registrar quién lo sanitizó y quién lo revisó. No adjuntar el original sin depurar al repositorio.
5. Conservar sólo referencias a evidencia de identidad humana en un almacén de acceso restringido con política aprobada. No definir aquí plazos jurídicos ficticios.

## Defectos y severidad propuesta para triage

| Campo                          | Valor a completar                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| DEFECTO_ID / casos             | Identificador y variantes afectadas                                                                                              |
| Problema y reproducción mínima | Qué ocurrió y cómo reproducirlo                                                                                                  |
| Impacto                        | Identidades, tenants, datos, operación o accesibilidad afectados                                                                 |
| Severidad / responsable        | Crítica: toma de cuenta/fuga entre tenants; alta: bypass MFA/recuperación/revocación; restante según impacto, validada en triage |
| Evidencia                      | Referencias sanitizadas                                                                                                          |
| Corrección / revalidación      | Commit, intento y regresión                                                                                                      |

No aceptar un `500`, un servicio caído o una pantalla vacía como éxito de una prueba de denegación.

## Acta de cierre nominal

```text
RUN_ID / commit / configuración:
Total de ejecuciones (incluye variantes):
Aprobadas / fallidas / bloqueadas / no ejecutadas / no aplica:
Justificación de cada NO_APLICA:
Defectos y reejecuciones:
Evidencias de CI, pgTAP, correo remoto, MFA, aislamiento y revocación:
Informe WCAG y combinaciones de dispositivos:
Informe de pentest y revalidación:
Decisiones ADR-017 / autorización / evidencia y retención:
Excepciones formales (si existen, alcance y aprobadores):

Ingeniería — nombre / decisión / fecha / referencia:
Producto y Operación — nombre / decisión / fecha / referencia:
Seguridad — nombre / decisión / fecha / referencia:
Jurídico/Privacidad — nombre / decisión / fecha / referencia:
QA/UX — nombre / decisión / fecha / referencia:
QA Lead — nombre / decisión / fecha / referencia:

Decisión global: PENDIENTE
Limitaciones y gates externos todavía abiertos:
```

Una firma aprueba sólo su ámbito y versión. Un resumen en verde no sustituye fichas ni firmas. El acta no constituye asesoría ni dictamen jurídico.
