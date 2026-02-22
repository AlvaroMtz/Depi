# Decorators Specification

## Purpose

This spec defines the behavioral requirements for TypeDI decorators in **Fase 2 — v2.0.0**. It introduces dual-mode decorator support: decorators MUST continue working with the legacy `experimentalDecorators: true` path, AND MUST work with TC39 Stage 3 decorators (TypeScript 5.0+, no `emitDecoratorMetadata`).

The three affected decorators are: `@Service`, `@Inject`, `@InjectMany`.

> **Risk note (R1 from proposal):** TC39 Parameter Decorators are NOT in Stage 3. The Stage 3 path therefore does NOT support constructor parameter injection via metadata. Constructor injection in Stage 3 mode requires explicit `@Inject()` at each parameter site using a Stage 3-compatible parameter decorator API (future work) or via factory-based registration. This limitation MUST be documented clearly.

## Status

**Phase**: Fase 2 — v2.0.0
**State**: New spec (no prior decorators spec exists)

---

## Requirements

### Requirement: Decorator Mode Detection

TypeDI MUST automatically detect which decorator standard is active at runtime and apply the correct internal path.

Detection MUST be based on:

1. **Legacy path**: `Reflect.metadata` is available (i.e., `reflect-metadata` is installed) AND the decorator is called with a `target` that is a constructor function (TypeScript `experimentalDecorators` calling convention).
2. **Stage 3 path**: The decorator is called with a `DecoratorContext` object (the second argument is an object with a `kind` property per the TC39 spec).

The detection MUST happen per-decorator invocation so that a codebase CAN mix legacy and Stage 3 decorators during a migration period, though this is NOT recommended.

#### Scenario: Stage 3 decorator context detected

- GIVEN a TypeScript project with `experimentalDecorators: false` (default in TS 5.0+)
- WHEN `@Service()` is applied to a class
- THEN the decorator receives a `ClassDecoratorContext` as its second argument
- AND TypeDI processes it via the Stage 3 path
- AND no error is thrown due to missing `Reflect.metadata`

#### Scenario: Legacy decorator context detected

- GIVEN a TypeScript project with `experimentalDecorators: true`
- WHEN `@Service()` is applied to a class
- THEN the decorator receives the class constructor as its sole argument (or `target` in `ClassDecorator` form)
- AND TypeDI processes it via the legacy path
- AND `Reflect.metadata` / `Reflect.getMetadata` are used for parameter type resolution

---

### Requirement: @Service — Stage 3 Dual-Mode

`@Service()` MUST accept both the TC39 Stage 3 class decorator signature and the legacy `experimentalDecorators` signature.

**Legacy signature (existing):**

```typescript
function Service<T>(options?: ServiceOptions<T>): ClassDecorator;
```

**Stage 3 signature (new):**

```typescript
function Service<T>(
  options?: ServiceOptions<T>
): (target: abstract new (...args: any[]) => T, context: ClassDecoratorContext) => void;
```

Both signatures MUST accept the same `ServiceOptions<T>` configuration object. The resulting behavior MUST be identical: the decorated class is registered in `ContainerRegistry.defaultContainer` with the provided options.

In Stage 3 mode, `@Service()` MUST NOT rely on `reflect-metadata` for registration. Service metadata MUST be constructed from explicit options or from the class reference itself (using `Symbol.metadata` if available, or the class constructor as the service id).

#### Scenario: @Service() registers class in Stage 3 mode

- GIVEN a project using Stage 3 decorators (no `experimentalDecorators`)
- AND `reflect-metadata` is NOT installed
- WHEN `@Service() class MyService {}` is declared
- THEN `ContainerRegistry.defaultContainer.has(MyService)` returns `true`
- AND `Container.get(MyService)` returns a `MyService` instance

#### Scenario: @Service() with explicit id in Stage 3 mode

- GIVEN `@Service({ id: 'my-service' }) class MyService {}`
- WHEN `Container.get('my-service')` is called
- THEN a `MyService` instance is returned
- AND the service id is `'my-service'`

#### Scenario: @Service() registers class in legacy mode (no regression)

- GIVEN a project using `experimentalDecorators: true` with `reflect-metadata` installed
- WHEN `@Service() class LegacyService {}` is declared
- THEN `Container.has(LegacyService)` returns `true`
- AND `Container.get(LegacyService)` returns a `LegacyService` instance
- AND behavior is identical to v1.x

#### Scenario: @Service() with scope option preserved across modes

- GIVEN `@Service({ scope: 'singleton' }) class SingletonService {}`
- WHEN resolved in either Stage 3 or legacy mode
- THEN `Container.get(SingletonService) === Container.get(SingletonService)` (same reference)

---

### Requirement: @Inject — Stage 3 Dual-Mode

`@Inject()` MUST support both Stage 3 and legacy decorator invocations for **property injection**.

**Constructor parameter injection** in Stage 3 mode MUST NOT be supported (TC39 parameter decorators are not Stage 3). If `@Inject()` is used on a constructor parameter in Stage 3 mode, it MUST throw a `TypeError` at decoration time with a message indicating that constructor parameter injection requires legacy mode.

**Legacy signature (existing — property + constructor param):**

```typescript
function Inject(typeOrIdentifier?: ...): ParameterDecorator | PropertyDecorator
```

**Stage 3 signature (new — property only):**

```typescript
function Inject(typeOrIdentifier?: ...):
  (target: undefined, context: ClassFieldDecoratorContext) => void
```

In Stage 3 mode, the handler MUST be registered with the container using the `ClassFieldDecoratorContext.name` (the property name as a string or symbol) and the class reference from `ClassFieldDecoratorContext.class` (available in the `addInitializer` callback).

#### Scenario: @Inject() property injection in Stage 3 mode

- GIVEN a Stage 3 project without `reflect-metadata`
- AND:

  ```typescript
  @Service()
  class DepService {}

  @Service()
  class MyService {
    @Inject(() => DepService)
    dep!: DepService;
  }
  ```

- WHEN `Container.get(MyService)` is called
- THEN `instance.dep` is a `DepService` instance
- AND no error is thrown

#### Scenario: @Inject() with Token in Stage 3 mode

- GIVEN a `Token<string>` named `MY_TOKEN` with value `'hello'` registered in the container
- AND:
  ```typescript
  @Service()
  class MyService {
    @Inject(MY_TOKEN)
    value!: string;
  }
  ```
- WHEN `Container.get(MyService)` is called in Stage 3 mode
- THEN `instance.value` equals `'hello'`

#### Scenario: @Inject() constructor parameter injection throws in Stage 3 mode

- GIVEN a Stage 3 project (no `experimentalDecorators`)
- AND `@Inject()` applied to a constructor parameter
- WHEN the class is declared
- THEN a `TypeError` is thrown at decoration time
- AND the error message MUST contain `'Constructor parameter injection requires experimentalDecorators mode'`

#### Scenario: @Inject() property injection in legacy mode (no regression)

- GIVEN a project with `experimentalDecorators: true`
- AND:
  ```typescript
  @Service()
  class MyService {
    @Inject()
    dep!: DepService;
  }
  ```
- WHEN `Container.get(MyService)` is called
- THEN `instance.dep` is a `DepService` instance

#### Scenario: @Inject() constructor parameter injection in legacy mode (no regression)

- GIVEN a project with `experimentalDecorators: true` and `emitDecoratorMetadata: true`
- AND:
  ```typescript
  @Service()
  class MyService {
    constructor(@Inject() private dep: DepService) {}
  }
  ```
- WHEN `Container.get(MyService)` is called
- THEN `instance.dep` is a `DepService` instance
- AND no error is thrown

---

### Requirement: @InjectMany — Stage 3 Dual-Mode

`@InjectMany()` MUST support both Stage 3 and legacy decorator invocations for **property injection**.

The same constraint as `@Inject()` applies: constructor parameter injection MUST NOT be supported in Stage 3 mode.

In Stage 3 mode, `@InjectMany()` MUST register a handler that calls `container.getMany(identifier)` — identical to the legacy behavior, but wired via Stage 3 field decorator context.

#### Scenario: @InjectMany() property injection in Stage 3 mode

- GIVEN multiple services registered with the same token `HANDLERS_TOKEN` and `multiple: true`
- AND:
  ```typescript
  @Service()
  class HandlerConsumer {
    @InjectMany(HANDLERS_TOKEN)
    handlers!: Handler[];
  }
  ```
- WHEN `Container.get(HandlerConsumer)` is called in Stage 3 mode
- THEN `instance.handlers` is an array containing all registered `Handler` instances
- AND the array length matches the number of registered handlers

#### Scenario: @InjectMany() in legacy mode (no regression)

- GIVEN the same setup with `experimentalDecorators: true`
- WHEN `Container.get(HandlerConsumer)` is called
- THEN `instance.handlers` contains all registered `Handler` instances
- AND behavior is identical to v1.x

---

### Requirement: No reflect-metadata Required in Stage 3 Path

When using Stage 3 decorators, TypeDI MUST NOT import or require `reflect-metadata`.

The `src/index.ts` entry point MUST conditionally guard the `import 'reflect-metadata'` (or equivalent side-effect import) so that it is only executed in legacy mode.

If `reflect-metadata` is not installed and Stage 3 decorators are used, the import guard MUST silently skip without throwing.

If `reflect-metadata` is not installed and legacy decorators are used (i.e., `Reflect.getMetadata` is called), a helpful error MUST be thrown: `'reflect-metadata is required for legacy decorator mode. Install it via: npm install reflect-metadata'`.

#### Scenario: Stage 3 mode — no reflect-metadata import

- GIVEN a Stage 3 project without `reflect-metadata` installed
- WHEN `import { Container } from 'typedi'` is executed
- THEN no `require('reflect-metadata')` is executed at module load time
- AND no `Cannot find module 'reflect-metadata'` error is thrown

#### Scenario: Legacy mode — missing reflect-metadata throws helpful error

- GIVEN a project with `experimentalDecorators: true` but WITHOUT `reflect-metadata` installed
- WHEN a service is resolved that requires `Reflect.getMetadata('design:paramtypes', ...)`
- THEN a `TypeError` (or custom `MissingReflectMetadataError`) is thrown
- AND the message MUST include installation instructions: `npm install reflect-metadata`

#### Scenario: Legacy mode — reflect-metadata installed, guard passes

- GIVEN `reflect-metadata` is installed
- AND `experimentalDecorators: true` is active
- WHEN `import { Container } from 'typedi'` is executed
- THEN `reflect-metadata` side-effects are applied (augmenting the global `Reflect` object)
- AND subsequent `Reflect.getMetadata` calls work correctly

---

### Requirement: Symbol.metadata Support in Stage 3 Path

In Stage 3 mode, TypeDI SHOULD use `Symbol.metadata` (as defined by the TC39 decorators proposal) to store and retrieve decorator-applied metadata when available.

If `Symbol.metadata` is not defined in the runtime (Node.js < 22 without polyfill), TypeDI MUST fall back to an internal `WeakMap`-based metadata registry to avoid runtime errors.

#### Scenario: Symbol.metadata available (Node.js >= 22)

- GIVEN a runtime environment where `Symbol.metadata` is defined
- WHEN `@Service()` and `@Inject()` are applied to a class
- THEN metadata is attached to `MyClass[Symbol.metadata]`
- AND the container reads metadata from `Symbol.metadata` for service resolution

#### Scenario: Symbol.metadata unavailable — WeakMap fallback

- GIVEN a runtime environment where `Symbol.metadata` is NOT defined (e.g., Node.js 18 without polyfill)
- WHEN `@Service()` and `@Inject()` are applied to a class
- THEN TypeDI stores metadata in an internal `WeakMap<Function, DecoratorMetadata>`
- AND service resolution works correctly using the WeakMap-backed metadata
- AND no `TypeError: Cannot read properties of undefined (reading 'metadata')` is thrown
