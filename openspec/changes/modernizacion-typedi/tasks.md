# Tasks: Modernización TypeDI — Estándares DI 2026

> **Worktree**: `.claude/worktrees/mystifying-mcclintock` (rama `develop`)
> **Base path**: todas las rutas son relativas al worktree salvo que se indique lo contrario.

---

## FASE 1 — v1.0.0: Infrastructure & Bug Fixes

### Grupo A: Quick wins (sin riesgo)

- [x] **1.1 — UMD bundle name fix**
  - **Archivo**: `rollup.config.js` líneas 9 y 15
  - **Cambio**: Reemplazar ambas ocurrencias de `name: 'ClassTransformer'` por `name: 'TypeDI'`
  - **Verifica**: `window.TypeDI` disponible en navegador tras `build:umd`
  - **Spec**: packaging/spec.md → R-PKG-04 (UMD global correcto)

- [x] **1.2 — reflect-metadata peerDependenciesMeta optional**
  - **Archivo**: `package.json` línea 30
  - **Cambio**: `"optional": false` → `"optional": true`
  - **Verifica**: `npm install --omit=optional` no falla; la librería sigue funcionando en runtime si se importa reflect-metadata manualmente
  - **Spec**: packaging/spec.md → R-PKG-03 (peerDep optional)

### Grupo B: ContainerOptions wiring

- [x] **1.3 — ContainerOptions: aceptar `options` en constructor**
  - **Archivo**: `src/container-instance.class.ts` línea 76
  - **Cambio**: Añadir parámetro `options?: Partial<ContainerOptions>` al constructor; almacenar `this._options = { lookupStrategy: 'allowLookup', allowSingletonLookup: true, ...options }`; agregar campo privado `private _options: Pick<ContainerOptions, 'lookupStrategy' | 'allowSingletonLookup'>`
  - **Import**: Añadir import de `ContainerOptions` desde `'./interfaces/container-options.interface'`
  - **Dependencia**: ninguna (la interfaz ya existe en `src/interfaces/container-options.interface.ts` con ambos campos)
  - **Spec**: container/spec.md → R-CTR-02 (lookupStrategy), R-CTR-03 (allowSingletonLookup)

- [x] **1.4 — ContainerOptions: aplicar `lookupStrategy` en `get()` y `getMany()`**
  - **Archivo**: `src/container-instance.class.ts`
  - **Cambio**: En `get()` (líneas 174-219) y `getMany()` (líneas 289-308): si `this._options.lookupStrategy === 'localOnly'`, lanzar `ServiceNotFoundError` en lugar de hacer lookup al contenedor padre/default
  - **Depende de**: 1.3
  - **Spec**: container/spec.md → R-CTR-02 escenarios "localOnly throws" y "allowLookup delegates"

- [x] **1.5 — ContainerOptions: aplicar `allowSingletonLookup` en `get()` y `getAsync()`**
  - **Archivo**: `src/container-instance.class.ts`
  - **Cambio**: En `get()` (línea 177) y `getAsync()` (línea 228): envolver la lectura del singleton global en `if (this._options.allowSingletonLookup)`; si es `false`, saltar la búsqueda en `defaultContainer`
  - **Depende de**: 1.3
  - **Spec**: container/spec.md → R-CTR-03 escenario "allowSingletonLookup=false bypasses global"

### Grupo C: Handler fixes

- [x] **1.6 — Handler leak fix (TD-07): limpiar handlers en `reset()`**
  - **Archivo**: `src/container-instance.class.ts` línea 463
  - **Cambio**: En `reset()` (líneas 463-479), al final del `switch` (antes del `return this`), añadir `this.handlers.length = 0`
  - **Nota**: El array `handlers` es privado y per-instance (línea 57); `.length = 0` trunca in-place sin romper referencias
  - **Verifica**: Después de `container.reset()` seguido de nuevo `container.get()`, los handlers del ciclo anterior no se aplican
  - **Spec**: container/spec.md → R-CTR-04 escenario "reset clears handlers"

- [x] **1.7 — Handler matching fix (TD-12): `applyPropertyHandlers` con prototype chain**
  - **Archivo**: `src/container-instance.class.ts` líneas 695-719
  - **Cambio**: En `applyPropertyHandlers()`, reemplazar la comparación `handler.object.constructor === currentTarget` (línea 706) por `handler.object === currentTarget.prototype || handler.object === currentTarget`
  - **Contexto**: `handler.object` viene de `inject.decorator.ts` línea 27 como `target as Constructable` (el prototype del objeto), no su constructor. La comparación actual falla para subclases.
  - **Verifica**: Subclase de un servicio decorado con `@Inject` recibe la inyección correctamente
  - **Spec**: container/spec.md → R-CTR-05 escenario "subclass inherits injected properties"

### Grupo D: Tests & Coverage

- [x] **1.8 — Coverage: tests para `TypeDIError.toString()` y `toConsoleString()`**
  - **Archivo nuevo**: `test/error/typedi-error.base.spec.ts`
  - **Líneas a cubrir**: `src/error/typedi-error.base.ts` líneas 44-56 (`toString`) y 61-79 (`toConsoleString`)
  - **Escenarios**:
    - `toString()` sin suggestion ni helpUrl → solo `[code] message`
    - `toString()` con suggestion → incluye línea `💡 Suggestion:`
    - `toString()` con helpUrl → incluye línea `📚 Learn more:`
    - `toConsoleString()` con y sin suggestion/helpUrl → verifica secuencias ANSI
    - Constructor con `code` custom vs default `TDI-000`
  - **Spec**: packaging/spec.md → R-PKG-05 (error classes coverage)

- [x] **1.9 — Tests de regresión para handler fixes (TD-07 y TD-12)**
  - **Archivo**: Añadir casos en `test/container/container.spec.ts` (o archivo existente de handlers)
  - **Escenarios**:
    - `reset()` limpia handlers → segundo `get()` post-reset no aplica handlers obsoletos
    - Subclase con propiedad `@Inject` recibe inyección (TD-12)
  - **Spec**: container/spec.md → R-CTR-04, R-CTR-05

- [x] **1.10 — Tests de integración ContainerOptions**
  - **Archivo nuevo**: `test/container/container-options.spec.ts`
  - **Escenarios**:
    - `new ContainerInstance('x', undefined, { lookupStrategy: 'localOnly' })` → `get` lanza `ServiceNotFoundError` para singleton global
    - `new ContainerInstance('x', undefined, { allowSingletonLookup: false })` → no busca en default container
    - Valores por defecto: `lookupStrategy: 'allowLookup'`, `allowSingletonLookup: true`
  - **Depende de**: 1.3, 1.4, 1.5
  - **Spec**: container/spec.md → R-CTR-02, R-CTR-03

---

## FASE 2 — v2.0.0: Dual-Mode Decorators

### Grupo E: Foundation Stage 3

- [ ] **2.1 — Symbol.metadata polyfill condicional**
  - **Archivo**: `src/index.ts` (antes de los exports, tras línea 9)
  - **Cambio**: Añadir `(Symbol as any).metadata ??= Symbol('Symbol.metadata');` — solo si no existe; no lanzar si falta reflect-metadata en Stage 3 mode
  - **Nota**: Debe quedar ANTES de cualquier import de decoradores
  - **Spec**: decorators/spec.md → R-DEC-01 escenario "Symbol.metadata polyfill"

- [ ] **2.2 — Stage 3 detector: función `isStage3Context`**
  - **Archivo nuevo**: `src/utils/stage3-detector.util.ts`
  - **Contenido**: `export function isStage3Context(arg: unknown): arg is ClassDecoratorContext { return typeof arg === 'object' && arg !== null && 'kind' in (arg as object); }`
  - **Tests**: `test/utils/stage3-detector.spec.ts` — casos: object con `kind`, sin `kind`, null, undefined, number, string
  - **Spec**: decorators/spec.md → R-DEC-01

- [ ] **2.3 — reflect-metadata guard condicional por modo**
  - **Archivo**: `src/index.ts` líneas 5-9
  - **Cambio**: Convertir el throw incondicional en una función `checkReflectMetadata()` exportada internamente; en legacy mode seguir lanzando; en Stage 3 mode no lanzar (la verificación se difiere a runtime solo cuando se usa `@Inject` en constructor)
  - **Nota**: El guard actual (línea 5-9) se convierte en soft-warning o se omite en Stage 3
  - **Depende de**: 2.2
  - **Spec**: decorators/spec.md → R-DEC-05 escenario "no reflect-metadata en Stage 3"

- [ ] **2.4 — tsconfig para Stage 3 (sin experimentalDecorators)**
  - **Archivo nuevo**: `tsconfig.spec.stage3.json`
  - **Contenido**: Extiende `tsconfig.json` base; elimina `experimentalDecorators: true` y `emitDecoratorMetadata: true`; target `ES2022`; `include: ["test/stage3/**/*.ts", "src/**/*.ts"]`
  - **Spec**: decorators/spec.md → R-DEC-01

### Grupo F: Decorators Dual-Mode

- [ ] **2.5 — `@Service` dual-mode: detección Stage 3 vs legacy**
  - **Archivo**: `src/decorators/service.decorator.ts`
  - **Cambio**:
    - Importar `isStage3Context` desde `'../utils/stage3-detector.util'`
    - Añadir overload: `export function Service<T>(options?: ServiceOptions<T>): ClassDecorator & ((target: unknown, context: ClassDecoratorContext) => void)`
    - En el body: detectar con `isStage3Context` si el segundo argumento es `ClassDecoratorContext`; si Stage 3: usar `context.addInitializer(() => { ContainerRegistry.defaultContainer.set(serviceMetadata) })` y registrar en `context.metadata`; si legacy: comportamiento actual (líneas 14-27)
  - **Depende de**: 2.2, 2.3
  - **Spec**: decorators/spec.md → R-DEC-02

- [ ] **2.6 — `@Inject` dual-mode: Stage 3 property-only, legacy sin cambios**
  - **Archivo**: `src/decorators/inject.decorator.ts`
  - **Cambio**:
    - Importar `isStage3Context` desde `'../utils/stage3-detector.util'`
    - Añadir rama Stage 3: si `isStage3Context(context)` y `context.kind === 'field'`: registrar handler via `context.addInitializer` usando `this` como instancia
    - Stage 3 NO soporta constructor params (R-DEC-03); si `context.kind === 'accessor'` o `'method'`: lanzar error descriptivo
    - Legacy: código actual sin cambios (líneas 18-41)
  - **Depende de**: 2.5
  - **Spec**: decorators/spec.md → R-DEC-03 (property-only), R-DEC-04 (no constructor Stage 3)

- [ ] **2.7 — `@InjectMany` dual-mode: Stage 3 property-only, legacy sin cambios**
  - **Archivo**: `src/decorators/inject-many.decorator.ts`
  - **Cambio**: Mismo patrón que 2.6 — añadir rama Stage 3 para `context.kind === 'field'`; usar `containerInstance.getMany()` en lugar de `containerInstance.get()`; NO soportar constructor params en Stage 3
  - **Depende de**: 2.5
  - **Spec**: decorators/spec.md → R-DEC-03, R-DEC-04

### Grupo G: Tests Stage 3

- [x] **2.8 — Tests Stage 3: `@Service` y ciclo de vida básico**
  - **Archivo nuevo**: `test/stage3/service.stage3.spec.ts`
  - **Configuración**: usar `tsconfig.spec.stage3.json` (jest config separada o `--project`)
  - **Escenarios**:
    - `@Service()` decora clase con TC39 Stage 3 context → `Container.get(MyClass)` resuelve instancia
    - `@Service({ scope: 'singleton' })` en Stage 3 → misma instancia en múltiples `get()`
    - `@Service({ eager: true })` en Stage 3 → instancia creada antes del primer `get()`
  - **Depende de**: 2.5
  - **Spec**: decorators/spec.md → R-DEC-02

- [x] **2.9 — Tests Stage 3: `@Inject` y `@InjectMany` property injection**
  - **Archivo nuevo**: `test/stage3/inject.stage3.spec.ts`
  - **Escenarios**:
    - `@Inject()` en propiedad de clase Stage 3 → propiedad resuelta al acceder al servicio
    - `@InjectMany()` en propiedad → array de servicios multiple
    - `@Inject()` en constructor param Stage 3 → debe lanzar error con mensaje claro (R-DEC-04)
    - Sin `reflect-metadata` importado → Stage 3 mode funciona sin lanzar
  - **Depende de**: 2.6, 2.7
  - **Spec**: decorators/spec.md → R-DEC-03, R-DEC-04, R-DEC-05

- [x] **2.10 — Tests Stage 3: interoperabilidad legacy + Stage 3 en misma app**
  - **Archivo nuevo**: `test/stage3/interop.stage3.spec.ts`
  - **Escenarios**:
    - Servicio legacy `@Service` resuelto desde servicio Stage 3 `@Inject`
    - Servicio Stage 3 `@Service` resuelto desde servicio legacy `@Inject`
    - Mismo container resuelve ambos tipos sin conflicto
  - **Depende de**: 2.8, 2.9
  - **Spec**: decorators/spec.md → R-DEC-02, R-DEC-03

---

## FASE 4 — Rename TypeDI -> Depi con compatibilidad

### Grupo H: Inventario y decision de compatibilidad

- [x] **4.1 — Inventario ejecutable de superficies TypeDI/typedi**
  - **Objetivo**: Consolidar un inventario unico de referencias de branding para ejecutar el rename por lotes sin omisiones.
  - **Archivos objetivo**:
    - Nuevo: `openspec/changes/modernizacion-typedi/fase-4-inventario-rename.md`
    - Revisados como entrada: `README.md`, `docs/**/*.md`, `.github/workflows/*.yml`, `package.json`, `CHANGELOG.md`
  - **Dependencias**: ninguna
  - **Aceptacion**:
    - El inventario separa categorias `public API`, `package/distribution`, `documentation`, `repo metadata`.
    - Incluye tabla de equivalencias (`typedi` -> `depi`, `TypeDI` -> `Depi`) y estado por item (`pending`, `done`).

- [x] **4.2 — Definir y documentar estrategia de compatibilidad (bridge/deprecacion)**
  - **Objetivo**: Fijar una estrategia unica para consumidores existentes de `typedi` y dejarla trazable antes de tocar distribucion.
  - **Archivos objetivo**:
    - Nuevo: `openspec/changes/modernizacion-typedi/adr-fase-4-compatibilidad.md`
    - Actualizar: `openspec/changes/modernizacion-typedi/plan-fase-4-depi-rename.md`
  - **Dependencias**: 4.1
  - **Aceptacion**:
    - El ADR explicita decision entre opcion A (shim) u opcion B (deprecacion) con ventana de soporte y politica de versionado.
    - Queda definido el impacto esperado en runtime y semver (sin break funcional de API).

### Grupo I: Ejecucion de rename por capas

- [ ] **4.3 — Aplicar rename en package metadata y branding tecnico**
  - **Objetivo**: Alinear metadata y mensajes publicos del paquete con branding Depi, respetando la estrategia definida en 4.2.
  - **Archivos objetivo**:
    - `package.json`
    - `src/error/*.ts` (mensajes/codigos con branding TypeDI)
    - `src/index.ts` (textos o warnings publicos)
  - **Dependencias**: 4.2
  - **Aceptacion**:
    - `package.json` refleja naming/repositorio/keywords coherentes con Depi segun decision 4.2.
    - No quedan nuevos mensajes runtime introduciendo `TypeDI`/`typedi` fuera de compatibilidad explicita.

- [ ] **4.4 — Actualizar documentacion principal y guia de migracion**
  - **Objetivo**: Publicar una ruta de adopcion clara para usuarios y eliminar referencias activas de branding anterior en docs primarias.
  - **Archivos objetivo**:
    - `README.md`
    - `docs/README.md`
    - Nuevo: `docs/MIGRATION-TYPEDI-TO-DEPI.md`
    - `CHANGELOG.md`
  - **Dependencias**: 4.2, 4.3
  - **Aceptacion**:
    - README y docs de entrada usan instalacion/import canonicos de Depi.
    - La migration guide cubre instalacion, imports, CI scripts y politica de deprecacion.
    - `CHANGELOG.md` incluye seccion explicita de "sin cambio funcional" y excepciones si existen.

- [ ] **4.5 — Verificacion automatizada de rename y checklist final**
  - **Objetivo**: Asegurar que el rename queda consistente y verificable en CI antes del release.
  - **Archivos objetivo**:
    - Nuevo: `scripts/check-branding-consistency.mjs`
    - `package.json` (script `check:branding`)
    - `.github/workflows/continuous-integration-workflow.yml`
    - `openspec/changes/modernizacion-typedi/fase-4-inventario-rename.md`
  - **Dependencias**: 4.3, 4.4
  - **Aceptacion**:
    - `npm run check:branding` falla si detecta referencias no permitidas a `TypeDI`/`typedi` fuera de whitelist de compatibilidad.
    - CI ejecuta el check de branding.
    - El inventario de 4.1 queda cerrado con todos los items en `done` o justificados como excepcion temporal.

---

## Mapa de dependencias

```
1.1 → (ninguna)
1.2 → (ninguna)
1.3 → (ninguna)
1.4 → 1.3
1.5 → 1.3
1.6 → (ninguna)
1.7 → (ninguna)
1.8 → (ninguna)
1.9 → 1.6, 1.7
1.10 → 1.3, 1.4, 1.5
2.1 → (ninguna)
2.2 → (ninguna)
2.3 → 2.2
2.4 → (ninguna)
2.5 → 2.2, 2.3
2.6 → 2.5
2.7 → 2.5
2.8 → 2.5
2.9 → 2.6, 2.7
2.10 → 2.8, 2.9
4.1 → (ninguna)
4.2 → 4.1
4.3 → 4.2
4.4 → 4.2, 4.3
4.5 → 4.3, 4.4
```

## Orden de implementación recomendado

**Sesión 1 (Fase 1 quick wins + bug fixes)**: 1.1 → 1.2 → 1.6 → 1.7 → 1.8 → 1.9
**Sesión 2 (Fase 1 ContainerOptions)**: 1.3 → 1.4 → 1.5 → 1.10
**Sesión 3 (Fase 2 foundation)**: 2.1 → 2.2 → 2.3 → 2.4
**Sesión 4 (Fase 2 decorators)**: 2.5 → 2.6 → 2.7
**Sesión 5 (Fase 2 tests)**: 2.8 → 2.9 → 2.10
**Sesión 6 (Fase 4 inventario + decision)**: 4.1 → 4.2
**Sesión 7 (Fase 4 ejecucion + cierre)**: 4.3 → 4.4 → 4.5
