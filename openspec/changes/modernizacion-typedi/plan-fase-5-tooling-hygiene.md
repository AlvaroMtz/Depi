# Plan Fase 5: Tooling hygiene (ESLint flat config + Husky consistente)

## Objetivo

Migrar de `.eslintrc.yml` al formato flat config de ESLint 9 y normalizar hooks de Husky para un flujo de calidad reproducible en local y CI.

## Fases y pasos

### Fase 5.1 - Baseline de lint y hooks

- Capturar baseline actual de lint/test en CI y local.
- Documentar dependencias actuales de lint (`eslint`, `@typescript-eslint/*`, `eslint-plugin-jest`, `eslint-config-prettier`).
- Identificar uso legacy: `ESLINT_USE_FLAT_CONFIG=false` en scripts y configuracion Husky embebida en `package.json`.

### Fase 5.2 - Migracion a flat config

- Crear `eslint.config.mjs` con equivalencia funcional de reglas de `.eslintrc.yml`.
- Migrar parser options de `project` para `tsconfig.json` y `tsconfig.spec.json`.
- Actualizar scripts `lint:check` y `lint:fix` para eliminar flag legacy.
- Mantener formato estable con Prettier sin duplicar reglas.

### Fase 5.3 - Husky y lint-staged coherentes

- Mover configuracion de hooks desde `package.json` a `.husky/pre-commit`.
- Conservar `lint-staged` (en `package.json` o archivo dedicado) con alcance definido para `*.ts` y `*.md`.
- Alinear ejecucion de hooks con pipeline CI (mismos comandos base).

### Fase 5.4 - Hardening y documentacion

- Validar en entornos limpios (fresh clone) instalacion de hooks y ejecucion.
- Actualizar `CONTRIBUTING`/README con pasos de setup (`npm install`, `npx husky init` si aplica).
- Eliminar configuracion legacy no usada (`.eslintrc.yml`, bloque husky embebido) solo tras paridad confirmada.

## Riesgos y mitigaciones

- Riesgo: drift de reglas al pasar a flat config.
  Mitigacion: ejecutar diff de resultados lint antes/despues y ajustar overrides.
- Riesgo: hooks no se instalan automaticamente en algunos entornos.
  Mitigacion: incluir script `prepare` y documentar fallback manual.
- Riesgo: tiempos de pre-commit mas altos.
  Mitigacion: mantener `lint-staged` acotado a archivos staged.

## Criterios de aceptacion

- [ ] `eslint.config.mjs` reemplaza `.eslintrc.yml` con paridad de reglas critica.
- [ ] Scripts de lint ya no dependen de `ESLINT_USE_FLAT_CONFIG=false`.
- [ ] Pre-commit hook Husky funciona en clone limpio y ejecuta `lint-staged` correctamente.
- [ ] CI usa la misma configuracion de lint que desarrollo local.
