# TASK-F7-06 — Evidencia declarada por plantilla

Implementación local P4, 04/11/2026. Requisitos opcionales y compatibles con plantillas anteriores: foto antes/después/pieza, lectura con unidad y rango, lote y firma por nombre + confirmación explícita. Las capturas escalares tienen un código por valor; las fotos admiten cantidades mínimas. Códigos duplicados y rangos invertidos se rechazan. Las órdenes existentes conservan la definición congelada y el mínimo de archivos legado.

`packages/ui/src/components/domain/evidence.tsx` aporta PhotoCapture, EvidenceReading, EvidenceLot y EvidenceSignature, historias, matriz y pruebas. La foto original permanece en memoria hasta verificar la derivada; conversión a JPEG, lado máximo 1600 px y límite 2 MB, entrada máxima 10 MB. Si falla no se declara subida. La firma funciona con teclado sin dibujo obligatorio (propuesta F7-D01; no equivale a firma electrónica certificada).

El módulo de archivos realiza subida privada, integridad y antivirus. El cierre valida vínculo máquina/cuenta, versión exacta, tipo, tamaño, caducidad, hash, CLEAN y almacenamiento privado original. Fotos repetidas no acreditan varios requisitos. Una lectura fuera de rango conserva el valor real y exige No conforme con seguimiento.

Validación y revisión humana: [registro conjunto](../qa/phase-7/execution-offline-validation.md). No se han aprobado como definitivos los límites provisionales de F7-D01.
