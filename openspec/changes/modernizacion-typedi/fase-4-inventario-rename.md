# Fase 4.1 - Inventario ejecutable de superficies TypeDI/typedi

## Objetivo y alcance

Inventario de referencias a `TypeDI`, `typedi`, `Depi` y `depi` para ejecutar el rename por lotes sin omisiones, con clasificacion por categoria y accion propuesta para Fase 4.2 (compatibilidad) y Fase 4.5 (verificacion automatizada).

Alcance auditado:

- Codigo fuente (`src/`)
- Documentacion (`README.md`, `docs/**/*.md`, `CHANGELOG.md`, `MODERNIZATION.md`)
- Metadata/distribucion (`package.json`, `package-lock.json`, `rollup.config.js`)
- Repo metadata y planeamiento (`openspec/**`, `.claude/skills/**`)
- CI/tooling (`.github/workflows/*.yml`, `test/**`, scripts de `package.json`)

## Metodo de levantamiento

- Busqueda global: `rg --line-number --no-heading --hidden --glob '!.git/*' --glob '!node_modules/*' --glob '!dist/*' --glob '!coverage/*' "TypeDI|typedi|Depi|depi"`
- Segmentacion por superficie: `src`, `docs`, `test`, `.github`, raiz, `openspec`.

## Equivalencias de branding (base para ejecucion)

| Superficie                  | Valor actual            | Valor objetivo                        | Estado    |
| --------------------------- | ----------------------- | ------------------------------------- | --------- |
| Nombre humano del proyecto  | `TypeDI`                | `Depi`                                | `pending` |
| Nombre npm/import canonico  | `typedi`                | `depi`                                | `pending` |
| Prefijo de metadata interno | `typedi:*`              | `depi:*` (o mantener por compat)      | `pending` |
| Clase base de errores       | `TypeDIError`           | `DepiError` (con alias)               | `pending` |
| URL de ayuda en errores     | `https://typedi.io/...` | `https://depi.io/...` (o redireccion) | `pending` |

## Inventario por categoria y accion propuesta

Leyenda accion:

- `rename now`: cambiar en Fase 4.3/4.4 sin esperar decisiones adicionales.
- `keep for compatibility`: mantener explicitamente por compatibilidad/historico.
- `pending decision 4.2`: depende del ADR de compatibilidad (shim/deprecacion/versionado).

### 1) Public API

| ID     | Hallazgo                                                               | Evidencia                                                                   | Accion propuesta         | Estado    |
| ------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------ | --------- |
| API-01 | Mensaje runtime con branding viejo en deprecacion de `Container.of`    | `src/container-instance.class.ts:453`                                       | `rename now`             | `pending` |
| API-02 | Clase publica `TypeDIError` y nombre de archivo `typedi-error.base.ts` | `src/error/typedi-error.base.ts:5`, `src/index.ts:23`                       | `pending decision 4.2`   | `pending` |
| API-03 | Errores publicos extienden `TypeDIError`                               | `src/error/*.ts` (7 archivos)                                               | `pending decision 4.2`   | `pending` |
| API-04 | URLs de ayuda de errores apuntan a `typedi.io`                         | `src/error/*.ts` (TDI-001..007)                                             | `pending decision 4.2`   | `pending` |
| API-05 | Key de metadata Stage 3 usa `typedi:registered`                        | `src/decorators/service.decorator.ts:48`                                    | `keep for compatibility` | `pending` |
| API-06 | Comentarios de codigo visibles para contribuidores mencionan TypeDI    | `src/container-instance.class.ts:18`, `src/container-instance.class.ts:580` | `rename now`             | `pending` |

### 2) Package / distribution

| ID     | Hallazgo                                                                      | Evidencia                                    | Accion propuesta       | Estado    |
| ------ | ----------------------------------------------------------------------------- | -------------------------------------------- | ---------------------- | --------- |
| PKG-01 | Nombre de paquete npm actual es `typedi`                                      | `package.json:2`, `package-lock.json:2`      | `pending decision 4.2` | `pending` |
| PKG-02 | URL de repositorio en package metadata apunta a `pleerock/typedi`             | `package.json:38`                            | `pending decision 4.2` | `pending` |
| PKG-03 | Artefactos UMD siguen nombrados `typedi.umd.*` (aunque global ya es `TypeDI`) | `rollup.config.js:11`, `rollup.config.js:17` | `pending decision 4.2` | `pending` |
| PKG-04 | No hay referencias `Depi/depi` en metadata de distribucion actual             | `package.json`, `rollup.config.js`           | `pending decision 4.2` | `pending` |

### 3) Documentation

| ID     | Hallazgo                                                                              | Evidencia                                                        | Accion propuesta         | Estado    |
| ------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------ | --------- |
| DOC-01 | `README.md` principal ya esta en branding Depi y usa `npm install depi`/`from 'depi'` | `README.md:1`, `README.md:24`, `README.md:48`                    | `keep for compatibility` | `done`    |
| DOC-02 | `docs/README.md` y guias TS/JS siguen en branding `TypeDI/typedi`                     | `docs/README.md`, `docs/typescript/*.md`, `docs/javascript/*.md` | `rename now`             | `pending` |
| DOC-03 | `docs/DECORATORS.md` mantiene branding TypeDI en todo el documento                    | `docs/DECORATORS.md`                                             | `rename now`             | `pending` |
| DOC-04 | `CHANGELOG.md` contiene menciones historicas de TypeDI                                | `CHANGELOG.md:142`, `CHANGELOG.md:153`                           | `keep for compatibility` | `done`    |
| DOC-05 | `MODERNIZATION.md` aun usa branding TypeDI                                            | `MODERNIZATION.md:1`, `MODERNIZATION.md:9`                       | `rename now`             | `pending` |

### 4) Repo metadata

| ID      | Hallazgo                                                                  | Evidencia                                                                | Accion propuesta         | Estado    |
| ------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------ | --------- |
| META-01 | `openspec/config.yaml` mantiene nombre de proyecto `typedi`               | `openspec/config.yaml:5`                                                 | `pending decision 4.2`   | `pending` |
| META-02 | Artefactos de cambio Fase 1/2 usan TypeDI/typedi por contexto historico   | `openspec/changes/modernizacion-typedi/{proposal,design,specs,tasks}.md` | `keep for compatibility` | `done`    |
| META-03 | Nombre de cambio y rutas `modernizacion-typedi` contienen branding legado | `openspec/changes/modernizacion-typedi/**`                               | `keep for compatibility` | `done`    |
| META-04 | Skills internas en `.claude/skills` mantienen prefijo `typedi-*`          | `.claude/skills/typedi-*.md`                                             | `rename now`             | `pending` |

### 5) CI / tooling

| ID    | Hallazgo                                                                           | Evidencia                                                                            | Accion propuesta         | Estado    |
| ----- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------ | --------- |
| CI-01 | Workflows no contienen ocurrencias de `TypeDI/typedi/Depi/depi`                    | `.github/workflows/*.yml`                                                            | `keep for compatibility` | `done`    |
| CI-02 | No existe carpeta `scripts/` aun (sin referencias para renombrar)                  | `scripts/**/*` (sin resultados)                                                      | `keep for compatibility` | `done`    |
| CI-03 | Tests incluyen menciones textuales de TypeDI y archivo `typedi-error.base.spec.ts` | `test/error/typedi-error.base.spec.ts`, `test/github-issues/{42,87}/issue-*.spec.ts` | `pending decision 4.2`   | `pending` |

## Checklist operativo para Fase 4.2 y 4.5

| Bloque                                           | Decision requerida en 4.2                   | Insumo capturado               | Estado    | Verificacion objetivo 4.5           |
| ------------------------------------------------ | ------------------------------------------- | ------------------------------ | --------- | ----------------------------------- |
| Paquete npm (`typedi` vs `depi`)                 | Definir estrategia A/B (shim o deprecacion) | PKG-01, PKG-02, PKG-03, PKG-04 | `done`    | `check:branding` + whitelist compat |
| API publica (`TypeDIError`, archivos exportados) | Definir alias y ventana de compat           | API-02, API-03, CI-03          | `done`    | tests + chequeo de exports          |
| URLs/documentacion de errores                    | Definir dominio destino y redirects         | API-04                         | `done`    | enlace valido o excepcion temporal  |
| Metadata keys internas (`typedi:*`)              | Decidir si migran o se congelan             | API-05                         | `done`    | regla de whitelist explicita        |
| Docs principales y secundarias                   | Confirmar alcance de rename inmediato       | DOC-02, DOC-03, DOC-05         | `pending` | scan docs sin refs no permitidas    |
| Artefactos historicos (changelog/openspec)       | Confirmar whitelist permanente              | DOC-04, META-02, META-03       | `done`    | excluidos por politica de compat    |
| CI/tooling                                       | Mantener baseline sin deuda de branding     | CI-01, CI-02                   | `done`    | workflow ejecuta `check:branding`   |

## Resumen de estado

- Total items inventariados: `22`
- `done`: `8`
- `pending`: `14`
- Bloqueadores por decision 4.2: `0` (resueltos por `adr-fase-4-compatibilidad.md`)
- Pendientes de ejecucion 4.3+: `PKG-01..04`, `API-01..06`, `DOC-02..03`, `DOC-05`, `META-01`, `META-04`, `CI-03`
