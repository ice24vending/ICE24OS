# Gate de validación sanitaria, jurídica y de publicación

Estado: **pendiente de aprobación humana**. Este documento prepara el dictamen; no afirma cumplimiento ni fija límites.

## Fuentes candidatas a validar

| Fuente | Uso previsto | Validación requerida |
|---|---|---|
| PRD sección 21, leyenda obligatoria | reportes y portal | Jurídico confirma texto, alcance y ubicación |
| NOM-127-SSA1-2021 publicada en DOF | catálogo de calidad de agua | Sanitario/Jurídico confirman vigencia, aplicabilidad, unidades, muestreo y límites |
| Ley Federal de Protección de Datos Personales en Posesión de los Particulares, decreto DOF 20/03/2025 | privacidad, consentimiento, transferencias, ARCO | Jurídico/Privacidad emiten matriz de tratamiento |
| Manuales, dictámenes y formatos de ICE24 | plantillas y frecuencias | Responsable Técnico/Sanitario valida versión y autoridad |

Referencias oficiales para revisión: [NOM-127-SSA1-2021 en DOF](https://www.dof.gob.mx/abrirPDF.php?anio=2022&archivo=02052022-MAT.pdf&repo=repositorio%2F) y [decreto de protección de datos del 20/03/2025](https://www.dof.gob.mx/nota_detalle.php?codigo=5752569&fecha=20/03/2025).

## Decisiones que debe contener el dictamen

- Catálogo de análisis, parámetro, método, unidad, límite, versión, vigencia y fuente.
- Tratamiento de texto, rango, no detectado y límite de cuantificación.
- Reglas de no conformidad, restricción, reactivación y aprobación; sin inferencias automáticas no autorizadas.
- Datos publicables/omitidos, ventana histórica, retiro, re-publicación, marca de agua y anti-indexación.
- Aviso legal, privacidad, consentimiento, ARCO, encargados, transferencias internacionales y retención.
- Quién puede capturar, cotejar PDF, aprobar, publicar y resolver correcciones.

## Regla segura hasta aprobación

- Permitir desarrollo con catálogos ficticios claramente marcados en entornos no productivos.
- No cargar resultados reales ni mostrar resumen de cumplimiento.
- No publicar resultados, restricciones o leyendas como certificación.
- Conservar estado `No evaluable` cuando falte dato o regla aprobada.
- Toda versión de regla mantiene fuente, aprobador y vigencia; cambios no reescriben historia.

## Firmas requeridas

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable Sanitario | Por nombrar | — | Pendiente |
| Asesor Jurídico | Por nombrar | — | Pendiente |
| Responsable de Privacidad | Por nombrar | — | Pendiente |
| Dirección ICE24 | Por nombrar | — | Pendiente |

Alternativa descartada: copiar tablas normativas al código directamente. Impediría versionado/aprobación y podría presentar como vigente una interpretación incorrecta.

