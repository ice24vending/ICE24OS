# TASK-F1-10 — CI inicial

- Estado: implementada; ejecución remota pendiente.
- Archivos principales: `.github/workflows/ci.yml`, `turbo.json`, scripts raíz.
- Criterios cubiertos: instalación congelada, formato, lint, tipos, límites, unitarias, build, Testcontainers y escaneo Gitleaks en PR/push a main.
- Validación local: todos los gates salvo contenedores pasan; el YAML conserva permisos mínimos de lectura y cancela ejecuciones obsoletas.
- Rollback: revertir el workflow no modifica datos; mantener el gate anterior hasta confirmar el reemplazo.
- Pendiente manual: abrir PR, ejecutar GitHub Actions y configurar protección de `main` para requerir `quality` e `integration`.
