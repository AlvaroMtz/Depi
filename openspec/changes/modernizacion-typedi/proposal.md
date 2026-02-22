# Proposal: Modernizacion TypeDI

## Intent

TypeDI v0.10.0 fue construido sobre un stack de decoradores experimental (Stage 1 circa 2015) que hoy es deuda técnica activa: `experimentalDecorators`, `emitDecoratorMetadata` y `reflect-metadata` son propietarios de TypeScript, no forman parte del estándar ECMAScript, y el ecosistema está divergiendo hacia decoradores TC39 Stage 3 (disponibles en TS 5.0+). Adicionalmente, el packaging carece de campos `"exports"` condicionales ESM/CJS, el target de build es ES5 (obsoleto para 2026), existen bugs conocidos en el bundle UMD y el sistema de handlers tiene leaks entre containers/tests.

La modernización es necesaria **ahora** porque: (1) Inversify v7 ya migró a Stage 3 sin `reflect-metadata`; (2) TypeScript podría deprecar `emitDecoratorMetadata` en TS 6.x; (3) los proyectos greenfield de 2026 no quieren activar flags experimentales; (4) hay worktrees internos divergentes (v0.16.0) que necesitan una hoja de ruta oficial antes de que la deuda sea irrecuperable.

## Scope

### In Scope

**Fase 1 — v1.0.0 (Packaging & Infrastructure, sin breaking changes de API)**

- Corrección del bug de nombre UMD (`ClassTransformer` → `TypeDI`)
- Agregar campo `"exports"` condicional ESM/CJS en `package.json`
- Agregar campo `"type": "module"` y `"engines"` field (`node: >=18`)
- Actualizar target de build de ES5 a ES2020 (mínimo viable moderno)
- Mover `reflect-metadata` de `devDependencies` a `peerDependencies` (opcional)
- Implementar `ContainerOptions` interface (actualmente definida pero ignorada)
- Corregir leak de handlers globales (scope handlers al container, no al singleton global)
- Corregir lógica de matching de handlers incorrecta (TD-12)
- Agregar soporte async lifecycle (`Symbol.asyncDispose`) para compatibilidad con `using` keyword

**Fase 2 — v2.0.0 (Dual-mode Decorators, potencial breaking change)**

- Soporte dual: Stage 3 decorators + legacy `experimentalDecorators` en modo compatibility
- Eliminar dependencia hard de `reflect-metadata` para Stage 3 path
- Guard de `reflect-metadata` opcional en `src/index.ts`
- Actualizar `tsconfig.json` para eliminar `experimentalDecorators` del path Stage 3
- Nuevas firmas de decoradores compatibles con Stage 3 (`@Service`, `@Inject`, `@InjectMany`)

### Out of Scope

- Migración completa a functional DI sin decoradores (patrón Hono/ElysiaJS) — requiere propuesta separada
- Integración con Angular Signals o NestJS Modules — fuera del dominio de TypeDI core
- Soporte Parameter Decorators TC39 (no están en Stage 3 aún — riesgo R1 crítico)
- Merge/resolución de worktrees divergentes v0.16.0 — prerrequisito, tarea separada
- Reescritura del sistema de contenedores (scoping, hierarchical containers) — v3.x roadmap
- Cambios a la API pública de `ContainerInstance` más allá de implementar `ContainerOptions`

## Approach

**Approach B para Fase 1 (Conservative Modernization):** Modernizar packaging, infraestructura y bugs sin tocar la API de decoradores. Esto permite que los usuarios actuales actualicen sin cambios en su código, mientras TypeDI recupera compatibilidad con toolchains modernos (Vite, esbuild, bundlers ESM-first). El delivery es un patch/minor release sin breaking changes.

**Approach A para Fase 2 (Dual-mode Decorators):** Una vez que el packaging es sólido, introducir soporte Stage 3 como opt-in. Los usuarios que quieran migrar a Stage 3 pueden hacerlo; los proyectos legacy siguen funcionando con el modo compatibility flag. El delivery es una major release con migration guide.

La estrategia de dos fases permite: (a) liberar valor inmediato sin bloquear en decisiones TC39 inciertas, (b) mantener compatibilidad backward durante la transición, (c) usar Fase 1 como testbed de la nueva infraestructura de build.

## Affected Areas

| Area                                            | Impact        | Description                                                                                             |
| ----------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| `package.json`                                  | High          | Agregar `"exports"`, `"type"`, `"engines"`, reclasificar `reflect-metadata` como peerDep opcional       |
| `rollup.config.js`                              | Medium        | Corregir nombre UMD (`TypeDI`), actualizar targets de output                                            |
| `tsconfig.prod.esm5.json`                       | High          | Reemplazar target ES5 por ES2020, actualizar lib targets                                                |
| `tsconfig.prod.esm2015.json`                    | Medium        | Actualizar para alinear con nuevo target mínimo                                                         |
| `tsconfig.json`                                 | High (Fase 2) | Eliminar `experimentalDecorators`/`emitDecoratorMetadata` del path Stage 3                              |
| `src/index.ts`                                  | Medium        | Guard de `reflect-metadata` condicional, re-exports limpios                                             |
| `src/container-instance.class.ts`               | High          | Fix handler leak (scope local), async lifecycle (`Symbol.asyncDispose`), implementar `ContainerOptions` |
| `src/utils/resolve-to-type-wrapper.util.ts`     | Medium        | Adaptar llamadas `Reflect.getMetadata` para modo dual (Fase 2)                                          |
| `src/decorators/service.decorator.ts`           | High (Fase 2) | Nueva firma Stage 3 + legacy compat                                                                     |
| `src/decorators/inject.decorator.ts`            | High (Fase 2) | Nueva firma Stage 3 + legacy compat                                                                     |
| `src/decorators/inject-many.decorator.ts`       | High (Fase 2) | Nueva firma Stage 3 + legacy compat                                                                     |
| `src/interfaces/container-options.interface.ts` | Medium        | Completar interface e implementar en ContainerInstance                                                  |
| Test suite                                      | Medium        | Fixes para handler leak (aislamiento entre tests), agregar tests async lifecycle                        |

## Risks

| Risk                                                                  | Likelihood | Mitigation                                                                                                                                 |
| --------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| R1: Parameter Decorators TC39 nunca llegan a Stage 4                  | High       | Scope Fase 2 a Class Decorators Stage 3 únicamente; documentar explícitamente que parameter injection requiere legacy mode indefinidamente |
| R2: TypeScript depreca `emitDecoratorMetadata` en TS 6.x              | Medium     | Fase 1 no depende de este flag; Fase 2 provee path de escape antes de la deprecación                                                       |
| R3: Leak handlers globales rompe test suites existentes al corregirlo | Medium     | Feature flag en `ContainerOptions` para backward compat; documentar breaking change en CHANGELOG                                           |
| R4: `Symbol.metadata` requiere polyfill en Node.js <18                | Medium     | Establecer `engines: node>=18` en Fase 1; polyfill condicional en Fase 2                                                                   |
| R5: Ecosistema TypeStack fragmentado (class-transformer, typeorm)     | Low        | TypeDI core no depende de ellos; la modernización es agnóstica al ecosistema                                                               |
| R6: Worktrees v0.16.0 divergentes sin merge plan                      | High       | Bloquear inicio de Fase 1 hasta auditar y cerrar/mergear worktrees; tarea prerrequisito                                                    |
| R7: Usuarios con builds custom que dependen del bundle ES5            | Medium     | Publicar ES5 como legacy bundle adicional durante 2 minor releases antes de removerlo                                                      |

## Rollback Plan

**Fase 1:** Dado que no hay breaking changes de API, el rollback consiste en revertir `package.json` y configs de build al estado v0.10.0 mediante `git revert`. Los consumers no necesitan cambios en su código. Se publicaría un patch release `v0.10.1` si fuera necesario.

**Fase 2:** La major release v2.0.0 incluirá migration guide. El rollback implica que los usuarios que ya migraron a Stage 3 deberían volver a v1.x. Para mitigar esto, v1.x recibirá security patches por 12 meses post-lanzamiento de v2.0.0 (LTS window). Se publicará `@typedi/legacy` como alias permanente de v1.x para proyectos que no puedan migrar.

## Dependencies

**Prerrequisitos bloqueantes (deben resolverse antes de iniciar Fase 1):**

- Auditar y cerrar/mergear worktrees v0.16.0 — sin esto, el trabajo se duplica o diverge aún más
- Decisión sobre ownership: ¿TypeStack org o fork comunitario? Afecta strategy de publicación en npm

**Dependencias técnicas externas:**

- TypeScript >=5.0 para Stage 3 decorators (Fase 2) — ya disponible, no es bloqueante
- Node.js >=18 como target mínimo (LTS activo en 2026) — establecer en `engines` field
- TC39 Decorators Proposal Stage 3 (`@tc39/proposal-decorators`) — estable, no bloqueante para Fase 2 class decorators
- `@babel/plugin-proposal-decorators` con `version: "2023-11"` para testing cross-tool (opcional)

**Dependencias de conocimiento:**

- Definir política de `reflect-metadata`: ¿peer opcional o eliminación total en Fase 2? Necesita ADR
- Clarificar contrato de `ContainerOptions` con maintainers antes de implementar

## Success Criteria

**Fase 1 — v1.0.0:**

- [ ] `npm pack` produce un tarball con `"exports"` correctos verificables con `publint` sin warnings
- [ ] Bundle UMD nombrado `TypeDI` (no `ClassTransformer`) verificable en `dist/typedi.umd.js`
- [ ] Target de build es ES2020+ — no hay syntax ES5 en el output ESM/CJS
- [ ] `reflect-metadata` listado como `peerDependencies` opcional en `package.json`
- [ ] `ContainerOptions` implementada y respetada por `ContainerInstance`
- [ ] Handler leak corregido: 100% de tests de integración aislados entre containers
- [ ] `Symbol.asyncDispose` soportado en `ContainerInstance.dispose()`
- [ ] `engines: { node: ">=18" }` presente en `package.json`
- [ ] CI pasa en Node.js 18, 20 y 22 LTS
- [ ] Zero breaking changes de API verificado con test suite existente al 100%

**Fase 2 — v2.0.0:**

- [ ] `@Service()`, `@Inject()`, `@InjectMany()` funcionan con Stage 3 decorators sin `experimentalDecorators`
- [ ] `@Service()`, `@Inject()`, `@InjectMany()` siguen funcionando con `experimentalDecorators: true` (legacy compat)
- [ ] No se requiere `reflect-metadata` en el path Stage 3 (zero polyfill para modo moderno)
- [ ] Migration guide publicado con ejemplos de antes/después para los 5 patrones más comunes
- [ ] Benchmarks: resolución de dependencias Stage 3 no más lenta que legacy (±5%)
- [ ] `@typedi/legacy` alias publicado en npm apuntando a v1.x
