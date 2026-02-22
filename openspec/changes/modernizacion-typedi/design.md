# Design: Modernización TypeDI — Estándares DI 2026

## Technical Approach

La modernización se ejecuta en dos fases independientes y secuenciales. **Fase 1** elimina deuda técnica de infraestructura (handler leak, UMD name, ContainerOptions) sin ningún breaking change de API pública — los 119 tests existentes deben pasar sin modificación. **Fase 2** introduce un sistema dual de detección de decoradores: el segundo argumento del decorador actúa como discriminador de modo (`context.kind === 'class'` → Stage 3 TC39; `typeof propertyKey === 'string'` → legacy experimentalDecorators), permitiendo que ambos modos coexistan en el mismo paquete publicado.

El código base (v0.16.0 en develop) ya tiene AsyncDisposable, getAsync, init(), ServiceLifecycleHooks y error classes custom. La Fase 1 completa las piezas que quedaron a medias; la Fase 2 agrega la capa dual encima de esa base sólida.

---

## Architecture Decisions

### Decision: Handler scoping — de global a local por container

**Choice**: Los handlers se registran exclusivamente en el container propietario (`this.handlers` en `ContainerInstance`). La herencia de handlers se resuelve en tiempo de resolución mediante `getAllHandlers()` que recorre la cadena de padres (ya implementado). Los decoradores `@Inject` e `@InjectMany` registran en `ContainerRegistry.defaultContainer` (comportamiento actual correcto para el container global); los handlers de containers hijo se heredan vía `_parent`.

**Alternatives considered**:

1. Array global estático `ContainerInstance.globalHandlers[]` — descartado porque es la fuente del leak actual; los handlers de un test contaminan tests posteriores.
2. WeakMap `target → handler[]` externo — añade complejidad sin beneficio real dado que los handlers ya viven dentro del container.

**Rationale**: El bug TD-07 ocurre porque `@Inject`/`@InjectMany` llaman a `ContainerRegistry.defaultContainer.registerHandler()`, que acumula handlers en el container global de forma permanente. El estado actual de `container-instance.class.ts` ya tiene `handlers: Handler[]` como campo de instancia (línea 57) y `getAllHandlers()` (línea 127) que hereda del padre — la infraestructura correcta ya existe. El fix es asegurar que `reset({ strategy: 'resetServices' })` también vacíe `this.handlers`, y añadir un `resetHandlers()` opcional para tests.

**Fix concreto en `applyPropertyHandlers` (TD-12)**: La lógica actual en líneas 705-712 compara `handler.object.constructor === currentTarget` — esto es incorrecto cuando `handler.object` es el prototype del target (no una instancia), ya que `prototype.constructor === Class` pero la comparación contra `currentTarget` (que ya es la clase) falla. La corrección: comparar directamente `handler.object === currentTarget` O `handler.object === currentTarget.prototype`:

```typescript
// ACTUAL (incorrecto):
if (handler.object.constructor === currentTarget) {
  applies = true;
}

// CORRECTO:
if (handler.object === currentTarget || handler.object === currentTarget.prototype) {
  applies = true;
}
```

---

### Decision: ContainerOptions — implementación prioritaria de 2 de 3 opciones

**Choice**: Implementar `lookupStrategy` y `allowSingletonLookup` en Fase 1. Diferir `inheritanceStrategy` e `onConflict` para Fase 2 o v1.1.

**Alternatives considered**:

- Implementar las 3 opciones completas en Fase 1 — aumenta riesgo de breaking changes y la superficie de testing.
- No implementar ninguna — incumple el success criteria del proposal.

**Rationale**: `lookupStrategy: 'localOnly'` y `allowSingletonLookup: false` son las opciones con mayor demanda de la comunidad (aislamiento de tests, DI scoped). `onConflict` e `inheritanceStrategy` requieren cambios más profundos en `ContainerRegistry` y en cómo se propagan los metadatos — mejor hacerlo cuando se tiene cobertura de tests más alta.

**Implementación**: `ContainerOptions` se pasa al constructor de `ContainerInstance` y se almacena como `private readonly options: Partial<ContainerOptions>`. En `get()` y `getMany()`, antes de hacer lookup al parent/global, se evalúa `this.options.lookupStrategy` y `this.options.allowSingletonLookup`.

```typescript
// En get():
const global =
  this.options?.allowSingletonLookup !== false
    ? ContainerRegistry.defaultContainer.metadataMap.get(identifier)
    : undefined;

if (this.options?.lookupStrategy === 'localOnly' && !local) {
  throw new ServiceNotFoundError(identifier);
}
```

---

### Decision: Stage 3 decorator detection — discriminación por forma del segundo argumento

**Choice**: Detectar en runtime si el decorador está siendo invocado en modo Stage 3 (TC39) o legacy (`experimentalDecorators`) inspeccionando el segundo argumento del decorador de clase:

```typescript
function isStage3Context(arg: unknown): arg is DecoratorContext {
  return typeof arg === 'object' && arg !== null && 'kind' in arg;
}
```

Para decoradores de clase Stage 3, el segundo argumento es un `ClassDecoratorContext` con `{ kind: 'class', name, addInitializer, ... }`. Para legacy, el segundo argumento es `undefined` (ClassDecorator recibe solo `target`). Para property/parameter decorators legacy, el segundo argumento es `string | Symbol` (propertyKey).

**Alternatives considered**:

1. Flag estático en module: `TypeDI.setMode('stage3' | 'legacy')` — requiere que el usuario configure explícitamente, friction innecesaria.
2. Detección por `Symbol.metadata` disponible — no es confiable; `Symbol.metadata` puede existir sin que el entorno use Stage 3 decorators.
3. Tsconfig detection en runtime — imposible; el compilador ya procesó el código.

**Rationale**: La forma del segundo argumento es la única señal inequívoca disponible en runtime. Esta técnica es la misma usada por `@angular/core` v17+ y por `lit` decorators. No requiere configuración del usuario.

---

### Decision: Symbol.metadata polyfill — solo cuando sea necesario y tardío

**Choice**: Aplicar el polyfill `Symbol.metadata ??= Symbol('metadata')` en la inicialización del módulo, solo cuando se detecte que el runtime no tiene `Symbol.metadata` nativo (Node.js < 22.x), y solo cuando el modo Stage 3 está activo.

```typescript
// En decorators/stage3/metadata.ts
if (typeof Symbol.metadata === 'undefined') {
  (Symbol as any).metadata = Symbol('Symbol.metadata');
}
```

**Alternatives considered**:

- Polyfill siempre al importar el paquete — contamina el símbolo global en entornos que no usan Stage 3; interfiere con otros frameworks.
- No hacer polyfill — rompe Stage 3 decorators en Node.js 18/20 donde `Symbol.metadata` puede ser undefined.

**Rationale**: Node.js 18 LTS no tiene `Symbol.metadata`. Node.js 22 lo añade nativamente. Dado que el target es `node>=18`, el polyfill es necesario pero debe ser localizado. El patrón `??=` es idempotente y seguro para múltiples imports.

---

### Decision: reflect-metadata guard — import condicional con side-effects check

**Choice**: Convertir el hard-throw en `src/index.ts` (línea 5-9) a un check condicional con warning en legacy mode, y eliminar completamente el check en Stage 3 path:

```typescript
// src/index.ts — nuevo comportamiento
const hasReflectMetadata = typeof Reflect !== 'undefined' && typeof (Reflect as any).getMetadata === 'function';

if (!hasReflectMetadata) {
  // En Stage 3 mode: silencioso, no se necesita reflect-metadata
  // En legacy mode: warning útil en lugar de error no descriptivo
  console.warn(
    '[TypeDI] "reflect-metadata" not detected. Legacy decorator mode requires it. ' +
      'Stage 3 decorator mode works without it.'
  );
}
```

**Alternatives considered**:

- Mantener el hard-throw actual — rompe Stage 3 users que no tienen ni necesitan `reflect-metadata`.
- Dynamic `import('reflect-metadata')` — añade complejidad async al bootstrap; incompatible con tree-shaking.
- Eliminar el check completamente — pierde el DX útil para legacy users que olvidaron importar `reflect-metadata`.

**Rationale**: El hard-throw actual (línea 5-9 de `src/index.ts`) hace que Stage 3 users reciban un error incomprensible. El check condicional sirve a ambos modos: legacy users reciben un warning útil, Stage 3 users no tienen friction. `peerDependenciesMeta.optional: true` ya está configurado en `package.json` (línea 28-31) — el guard debe reflejar esa opcionalidad.

---

### Decision: UMD bundle name — cambio directo en rollup.config.js

**Choice**: Reemplazar `name: 'ClassTransformer'` por `name: 'TypeDI'` en ambas salidas UMD del `rollup.config.js`.

**Alternatives considered**: Ninguna — es un bug trivial con una sola solución correcta.

**Rationale**: El nombre `ClassTransformer` es claramente un copy-paste de otro proyecto del TypeStack mono-repo. El bundle UMD expone el módulo como `window.ClassTransformer` en browsers, lo cual es incorrecto y confuso.

---

### Decision: Coverage threshold — mejora por tests nuevos, no bajando el umbral

**Choice**: Mantener los thresholds actuales (`statements: 75, branches: 60, functions: 75, lines: 75`) y alcanzarlos añadiendo tests para las áreas no cubiertas: handler scoping, ContainerOptions, async lifecycle, applyPropertyHandlers fix.

**Alternatives considered**:

- Bajar el threshold (e.g., a 60%) — señal de regresión de calidad; rechazado.
- Subir el threshold a 90% — ambicioso, puede bloquear CI si hay líneas no testeables; diferir para v1.1.

**Rationale**: Los tests que debemos agregar para los fixes de Fase 1 (handler scoping, ContainerOptions, applyPropertyHandlers) naturalmente mejorarán la coverage. Las áreas actualmente no cubiertas son exactamente las que vamos a tocar.

---

## Data Flow

### Fase 1 — Handler Registration y Resolution (corregido)

```
@Inject() decorator ejecutado
        │
        ▼
ContainerRegistry.defaultContainer.registerHandler(handler)
        │  handler queda en defaultContainer.handlers[]
        │
        ▼
Container.get(ServiceA)
        │
        ▼
getServiceValue(metadata)
        │
        ├──► new ServiceA(...constructorParams)  ← initializeParams() usa findHandler()
        │                                              │
        │                                              ▼
        │                                    getAllHandlers()  [recorre this → parent chain]
        │                                              │
        │                                    handler.value(containerInstance)
        │                                              │
        │                                    containerInstance.get(DependencyType)
        │
        └──► applyPropertyHandlers(type, instance)
                    │
                    ▼
             getAllHandlers()  [recorre this → parent chain]
                    │
             handler.object === target  [FIX: comparación directa, no .constructor]
                    │
             instance[propertyName] = handler.value(this)
```

### Fase 2 — Dual-mode Decorator Dispatch

```
@Service() / @Inject() / @InjectMany() applied
        │
        ▼
  ┌─────┴─────┐
  │ isStage3? │  ← typeof arg2 === 'object' && 'kind' in arg2
  └─────┬─────┘
        │
   YES  │  NO (legacy)
        │        │
        ▼        ▼
  Stage3Handler  LegacyHandler
        │        │
        │        ├── Reflect.getMetadata('design:paramtypes', ...)
        │        ├── Reflect.getMetadata('design:type', ...)
        │        └── registerHandler() en defaultContainer
        │
        ├── context.addInitializer() para @Service
        ├── Symbol.metadata como storage para tipo
        └── NO usa reflect-metadata
```

### ContainerOptions — lookup flow con opciones implementadas

```
container.get(ServiceId)
        │
        ▼
allowSingletonLookup !== false?
  YES → global = defaultContainer.metadataMap.get(id)
  NO  → global = undefined
        │
        ▼
lookupStrategy === 'localOnly'?
  YES & !local → throw ServiceNotFoundError
  NO → continúa con lógica de herencia actual
```

---

## File Changes

| File                                             | Action          | Description                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/container-instance.class.ts`                | Modify          | (1) Fix `applyPropertyHandlers` TD-12: comparar `handler.object === currentTarget` en lugar de `handler.object.constructor === currentTarget`. (2) Añadir `options: Partial<ContainerOptions>` al constructor. (3) Implementar `lookupStrategy` y `allowSingletonLookup` en `get()`, `getAsync()`, `getMany()`. (4) Extender `reset()` para limpiar `this.handlers` en `resetServices` strategy. |
| `src/container-registry.class.ts`                | Modify          | Menor: propagación de `ContainerOptions` si se necesita en Fase 2                                                                                                                                                                                                                                                                                                                                |
| `src/decorators/inject.decorator.ts`             | Modify          | Fase 1: sin cambios funcionales. Fase 2: añadir overload Stage 3, dispatch vía `isStage3Context()`.                                                                                                                                                                                                                                                                                              |
| `src/decorators/inject-many.decorator.ts`        | Modify          | Idem `inject.decorator.ts`                                                                                                                                                                                                                                                                                                                                                                       |
| `src/decorators/service.decorator.ts`            | Modify          | Idem. Fase 2: `context.addInitializer(() => container.set(metadata))` para Stage 3                                                                                                                                                                                                                                                                                                               |
| `src/index.ts`                                   | Modify          | Convertir hard-throw a warning condicional; exportar nuevas interfaces de Fase 2                                                                                                                                                                                                                                                                                                                 |
| `src/interfaces/container-options.interface.ts`  | Modify          | Ningún cambio de forma; la interface ya está correcta. Añadir JSDoc con valores por defecto.                                                                                                                                                                                                                                                                                                     |
| `src/decorators/stage3/service.decorator.ts`     | Create (Fase 2) | Implementación Stage 3 pura de `@Service` usando `ClassDecoratorContext`                                                                                                                                                                                                                                                                                                                         |
| `src/decorators/stage3/inject.decorator.ts`      | Create (Fase 2) | Implementación Stage 3 de `@Inject` usando `Symbol.metadata`                                                                                                                                                                                                                                                                                                                                     |
| `src/decorators/stage3/inject-many.decorator.ts` | Create (Fase 2) | Implementación Stage 3 de `@InjectMany`                                                                                                                                                                                                                                                                                                                                                          |
| `src/decorators/stage3/metadata.ts`              | Create (Fase 2) | Helpers: `Symbol.metadata` polyfill, lectura/escritura de metadatos en Stage 3                                                                                                                                                                                                                                                                                                                   |
| `src/utils/is-stage3-context.util.ts`            | Create (Fase 2) | Type guard `isStage3Context(arg): arg is DecoratorContext`                                                                                                                                                                                                                                                                                                                                       |
| `rollup.config.js`                               | Modify          | `name: 'ClassTransformer'` → `name: 'TypeDI'` (2 ocurrencias)                                                                                                                                                                                                                                                                                                                                    |
| `package.json`                                   | Modify          | Fase 1 (ya aplicado en v0.16.0): exports, engines, peerDeps. Pendiente: verificar `"sideEffects": false` es correcto con el nuevo guard de reflect-metadata.                                                                                                                                                                                                                                     |
| `jest.config.js`                                 | Modify          | Mantener thresholds actuales; verificar que nuevos tests los superen                                                                                                                                                                                                                                                                                                                             |
| `test/handler-scoping.spec.ts`                   | Create          | Tests de aislamiento de handlers entre containers; regresión TD-07                                                                                                                                                                                                                                                                                                                               |
| `test/container-options.spec.ts`                 | Create          | Tests de `lookupStrategy` y `allowSingletonLookup`                                                                                                                                                                                                                                                                                                                                               |
| `test/apply-property-handlers.spec.ts`           | Create          | Tests de herencia de handlers en jerarquía de clases (regresión TD-12)                                                                                                                                                                                                                                                                                                                           |
| `test/stage3-decorators.spec.ts`                 | Create (Fase 2) | Tests de decoradores Stage 3 sin `reflect-metadata`                                                                                                                                                                                                                                                                                                                                              |

---

## Interfaces / Contracts

### ContainerInstance constructor actualizado (Fase 1)

```typescript
// src/container-instance.class.ts
export class ContainerInstance implements AsyncDisposable {
  // Nuevo: recibe opciones en constructor
  constructor(
    id: ContainerIdentifier,
    parent?: ContainerInstance,
    options?: Partial<ContainerOptions> // nuevo parámetro
  ) {
    this.id = id;
    this.options = options ?? {};
    if (parent) this._parent = parent;
  }

  private readonly options: Partial<ContainerOptions>;

  // reset() actualizado: limpiar handlers cuando strategy es 'resetServices'
  public reset(options: { strategy: 'resetValue' | 'resetServices' } = { strategy: 'resetValue' }): this {
    switch (options.strategy) {
      case 'resetServices':
        this.metadataMap.forEach(service => this.disposeServiceInstance(service));
        this.metadataMap.clear();
        this.multiServiceIds.clear();
        this.handlers.length = 0; // ← NUEVO: limpiar handlers locales
        break;
    }
    return this;
  }
}
```

### Dual-mode decorator signature (Fase 2)

```typescript
// Firma Stage 3 (TC39 Decorators)
type ClassDecoratorContext = {
  kind: 'class';
  name: string | undefined;
  addInitializer(initializer: () => void): void;
  metadata: Record<string | symbol, unknown>;
};

// @Service sobrecargado para ambos modos
export function Service<T = unknown>(): ClassDecorator; // legacy
export function Service<T = unknown>(options: ServiceOptions<T>): ClassDecorator; // legacy con opciones
export function Service<T = unknown>( // Stage 3
  options?: ServiceOptions<T>
): (target: abstract new (...args: any[]) => T, context: ClassDecoratorContext) => void;

// Implementación unificada que detecta el modo en runtime
export function Service<T>(options: ServiceOptions<T> = {}) {
  return function (target: any, context?: any) {
    if (isStage3Context(context)) {
      // Stage 3 path: usa context.addInitializer y Symbol.metadata
      context.addInitializer(function (this: any) {
        registerServiceMetadata(target, options, context.metadata);
      });
    } else {
      // Legacy path: usa Reflect.getMetadata, registra inmediatamente
      const serviceMetadata = buildServiceMetadata(target, options);
      ContainerRegistry.defaultContainer.set(serviceMetadata);
    }
  };
}
```

### isStage3Context utility (Fase 2)

```typescript
// src/utils/is-stage3-context.util.ts
export interface Stage3ClassContext {
  kind: 'class';
  name: string | undefined;
  addInitializer(initializer: () => void): void;
  metadata: Record<string | symbol, unknown>;
}

export function isStage3Context(arg: unknown): arg is Stage3ClassContext {
  return typeof arg === 'object' && arg !== null && 'kind' in arg && (arg as any).kind === 'class';
}
```

### Stage 3 metadata storage (Fase 2)

```typescript
// src/decorators/stage3/metadata.ts

// Polyfill: Symbol.metadata no disponible en Node.js < 22
if (typeof Symbol.metadata === 'undefined') {
  (Symbol as any).metadata = Symbol('Symbol.metadata');
}

const INJECT_METADATA_KEY = Symbol('typedi:inject');
const INJECT_MANY_METADATA_KEY = Symbol('typedi:inject-many');

export interface ParameterInjectMetadata {
  index: number;
  identifier: ServiceIdentifier;
}

// En Stage 3, el almacenamiento de metadatos de parámetros requiere
// que los decoradores de parámetros TC39 estén disponibles (aún no en Stage 3).
// Por esto, Stage 3 mode en Fase 2 soporta SOLO property injection y class decorators,
// NO constructor parameter injection. Ver Open Questions.
export function setPropertyInjectMetadata(
  metadata: Record<string | symbol, unknown>,
  propertyKey: string | symbol,
  identifier: ServiceIdentifier
): void {
  const existing = (metadata[INJECT_METADATA_KEY] as Map<string | symbol, ServiceIdentifier>) ?? new Map();
  existing.set(propertyKey, identifier);
  metadata[INJECT_METADATA_KEY] = existing;
}
```

---

## Testing Strategy

| Layer                                        | What to Test                                                                                               | Approach                                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit — handler scoping (TD-07)               | Handlers del container A no afectan al container B; `reset({ strategy: 'resetServices' })` limpia handlers | `test/handler-scoping.spec.ts`: crear dos containers, registrar handlers en cada uno, verificar aislamiento; luego reset y verificar handlers vacíos                     |
| Unit — applyPropertyHandlers (TD-12)         | Property injection funciona en clases heredadas; handler del padre se aplica a instancia del hijo          | `test/apply-property-handlers.spec.ts`: clase `Base` con `@Inject()` property, clase `Child extends Base`, verificar que `Container.get(Child).myService` está inyectado |
| Unit — ContainerOptions.lookupStrategy       | `localOnly` lanza `ServiceNotFoundError` cuando no hay servicio local aunque exista en global              | `test/container-options.spec.ts`: registrar servicio en global, crear container con `lookupStrategy: 'localOnly'`, verificar que `.get()` lanza                          |
| Unit — ContainerOptions.allowSingletonLookup | `false` impide que singletons globales sean visibles desde el container                                    | Mismo archivo: registrar singleton en global, crear container con `allowSingletonLookup: false`, verificar que `.get()` lanza                                            |
| Unit — UMD name                              | El bundle UMD exporta `window.TypeDI` no `window.ClassTransformer`                                         | Verificar en el output compilado de rollup (puede ser test de smoke en CI)                                                                                               |
| Integration — async lifecycle                | `Container.init()` llama `onInit` en servicios async; `dispose()` llama `onDestroy`                        | Tests existentes en `test/github-issues/` — ampliar con casos de `ContainerOptions`                                                                                      |
| Regresión — tests existentes                 | Los 119 tests actuales pasan sin modificación tras los fixes                                               | Ejecutar `npm test` y verificar 0 regresiones                                                                                                                            |
| Fase 2 — Stage 3 decorators                  | `@Service`, `@Inject`, `@InjectMany` funcionan sin `experimentalDecorators` y sin `reflect-metadata`       | `test/stage3-decorators.spec.ts` con `tsconfig.spec.stage3.json` que omite `experimentalDecorators` y `emitDecoratorMetadata`                                            |
| Fase 2 — legacy compat                       | Mismo decorador funciona en proyecto con `experimentalDecorators: true`                                    | Tests existentes no deben romperse — son el test de compat                                                                                                               |
| Fase 2 — performance                         | Resolución de dependencias Stage 3 no más lenta que legacy ±5%                                             | Benchmark simple con `performance.now()` para 1000 resoluciones; puede ser manual en PR                                                                                  |

---

## Migration / Rollout

### Fase 1 — v1.0.0 (sin breaking changes)

1. **Handler fix (TD-07 + TD-12)**: Los usuarios con tests que dependían (incorrectamente) del leak de handlers entre containers verán fallos. Esto es un bug fix, no un breaking change, pero se documenta en CHANGELOG como "behavioral fix". Se provee escape hatch: `ContainerOptions.legacyGlobalHandlers: true` (deprecado desde v1.0, eliminado en v2.0) si el impacto resulta mayor de lo esperado.

2. **ContainerOptions**: Retrocompatible. Containers creados sin opciones se comportan idénticamente a v0.x.

3. **UMD bundle**: Breaking para usuarios del bundle UMD en browsers que usen `window.ClassTransformer`. Documentar en CHANGELOG. El scope es pequeño (UMD es raro en proyectos TS modernos).

4. **reflect-metadata guard**: Cambia de hard-throw a warning. Retrocompatible — nadie que importara correctamente `reflect-metadata` notará cambio.

### Fase 2 — v2.0.0 (opt-in, con migration guide)

1. **Stage 3 opt-in**: Los usuarios que quieran Stage 3 deben:
   - Cambiar `tsconfig.json`: eliminar `experimentalDecorators: true` y `emitDecoratorMetadata: true`
   - No importar `reflect-metadata` (opcional pero recomendado eliminarlo para reducir bundle)
   - Constructor injection **no está disponible** en Stage 3 mode (ver Open Questions) — migrar a property injection

2. **Legacy compat permanente**: No se elimina el modo legacy en v2.0. Los proyectos con `experimentalDecorators: true` siguen funcionando sin cambios.

3. **`@typedi/legacy` alias**: Publicar alias en npm apuntando a `typedi@^1.0.0` para proyectos que no puedan migrar.

4. **Migration guide**: Documento con los 5 patrones más comunes y su equivalente Stage 3.

---

## Open Questions

- [ ] **Constructor injection en Stage 3**: TC39 Parameter Decorators no están en Stage 3. En Fase 2 Stage 3 mode, ¿aceptamos que constructor injection no esté disponible y solo se soporte property injection? ¿O implementamos un workaround usando `static inject = [ServiceA, ServiceB]` array como hace Angular? Necesita decisión antes de implementar Fase 2.

- [ ] **`inheritanceStrategy` en ContainerOptions**: La spec define `none | definitionOnly | definitionWithValues`. La implementación actual hace algo parecido a `definitionWithValues` implícitamente. ¿Implementamos las 3 opciones en Fase 1 o diferimos a Fase 2? (Recomendación: diferir — demasiado riesgo en Fase 1.)

- [ ] **`onConflict` en ContainerOptions**: Actualmente `ContainerRegistry.registerContainer` lanza si el ID ya existe (equivalente a `throw`). ¿Implementamos `overwrite` y `returnExisting` en Fase 1? (Recomendación: implementar `returnExisting` en Fase 1 ya que es el default documentado, diferir `overwrite`.)

- [ ] **`legacyGlobalHandlers` escape hatch**: ¿Lo incluimos en v1.0 como safety net para el handler leak fix, o confiamos en que el fix es lo suficientemente no-disruptivo? Depende del feedback del proposal review.

- [ ] **`sideEffects: false` en package.json**: El guard de `reflect-metadata` en `src/index.ts` es un side effect (modifica `Symbol.metadata` con el polyfill y hace `console.warn`). ¿Mover el polyfill a un archivo separado importado explícitamente, o cambiar `sideEffects` a lista de archivos específicos?
