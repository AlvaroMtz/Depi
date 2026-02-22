# Container Specification

## Purpose

This spec defines the behavioral requirements for `ContainerInstance` — the core dependency injection container in TypeDI. It covers three areas that are currently missing or broken in the develop branch:

1. **ContainerOptions** — interface is defined but not wired into the constructor
2. **Handler scoping** — handlers registered via `@Inject()` are currently global, leaking between containers and test runs
3. **Async lifecycle** — `Symbol.asyncDispose` is implemented; `init()` exists; requirements formalize the contract
4. **Handler matching (TD-12)** — `applyPropertyHandlers` matching logic is incorrect (uses `handler.object.constructor === currentTarget` instead of `handler.object === currentTarget`)

## Status

**Phase**: Fase 1 — v1.0.0
**State**: New spec (no prior container spec exists)

---

## Requirements

### Requirement: ContainerOptions Constructor Integration

`ContainerInstance` MUST accept an optional `ContainerOptions` parameter in its constructor and MUST respect all declared options during its lifetime.

The current `ContainerOptions` interface declares three options:

| Option                 | Type                                                   | Default            |
| ---------------------- | ------------------------------------------------------ | ------------------ |
| `onConflict`           | `'throw' \| 'overwrite' \| 'returnExisting'`           | `'returnExisting'` |
| `lookupStrategy`       | `'allowLookup' \| 'localOnly'`                         | `'allowLookup'`    |
| `allowSingletonLookup` | `boolean`                                              | `true`             |
| `inheritanceStrategy`  | `'none' \| 'definitionOnly' \| 'definitionWithValues'` | `'none'`           |

The constructor signature MUST become:

```
ContainerInstance(id: ContainerIdentifier, parent?: ContainerInstance, options?: Partial<ContainerOptions>)
```

Unspecified options MUST use their declared defaults.

#### Scenario: Default options applied when none provided

- GIVEN a `ContainerInstance` constructed without options
- WHEN the container is used for service resolution
- THEN `lookupStrategy` behaves as `'allowLookup'` (parent/global lookup is performed)
- AND `allowSingletonLookup` is `true` (singletons are found in default container)

#### Scenario: lookupStrategy 'localOnly' prevents parent lookup

- GIVEN a child container created with `{ lookupStrategy: 'localOnly' }`
- AND a service registered only in the parent container
- WHEN `childContainer.get(ServiceClass)` is called
- THEN a `ServiceNotFoundError` is thrown
- AND the parent container is NOT consulted

#### Scenario: lookupStrategy 'allowLookup' falls through to parent

- GIVEN a child container created with `{ lookupStrategy: 'allowLookup' }`
- AND a service registered only in the parent container
- WHEN `childContainer.get(ServiceClass)` is called
- THEN the service instance is returned from the parent
- AND no error is thrown

#### Scenario: allowSingletonLookup false skips default container

- GIVEN a container created with `{ allowSingletonLookup: false }`
- AND a service registered with `scope: 'singleton'` in the default container
- WHEN `container.get(ServiceClass)` is called on the non-default container
- THEN a `ServiceNotFoundError` is thrown
- AND the default container is NOT consulted

#### Scenario: onConflict 'throw' raises error on duplicate registration

- GIVEN a `ContainerInstance` with `{ onConflict: 'throw' }`
- AND a service with identifier `'my-service'` already registered in `ContainerRegistry`
- WHEN a second container is created with the same id
- THEN a `ContainerCannotBeCreatedError` (or equivalent) is thrown
- AND the existing container is preserved

#### Scenario: onConflict 'returnExisting' returns the same container

- GIVEN a `ContainerInstance` with `{ onConflict: 'returnExisting' }`
- AND a container with the same id already exists in `ContainerRegistry`
- WHEN a second container is created with the same id
- THEN the existing container instance is returned
- AND no new container is registered

---

### Requirement: Handler Scoping — Per-Container, Not Global

Handlers registered via `@Inject()` and `@InjectMany()` decorators MUST be scoped to the container on which `registerHandler()` is called.

**Current behavior (broken):** Both decorators call `ContainerRegistry.defaultContainer.registerHandler(handler)`, so all handlers accumulate in the default container and bleed across test runs and child containers.

**Required behavior:** The `@Inject()` and `@InjectMany()` decorators MUST register handlers on the container that is active at decoration time (the default container for module-level decorators), but `registerHandler()` on a container MUST only affect that container's own handler array — not any other container's array.

When a child container resolves a service, it MUST consult its own handler array first, then walk up the parent chain. It MUST NOT read from unrelated sibling containers.

The `reset({ strategy: 'resetServices' })` call on a container MUST clear that container's handler array in addition to its metadata maps, ensuring no cross-test contamination.

#### Scenario: Handlers do not leak between independent containers

- GIVEN two independent `ContainerInstance` objects `A` and `B` (neither is parent/child of the other)
- AND a handler registered in container `A` via `A.registerHandler(h)`
- WHEN container `B` resolves a service of the same type
- THEN container `B` does NOT apply handler `h`
- AND the property is NOT injected in services resolved from `B`

#### Scenario: Child container inherits parent handlers

- GIVEN a parent container with a registered handler for `MyService.myProp`
- AND a child container created via `parent.createChild('child')`
- WHEN the child container resolves `MyService`
- THEN `myProp` is injected using the handler inherited from the parent
- AND the handler is resolved using the child container's `get()` (correct scoping of resolved value)

#### Scenario: reset clears handlers for that container only

- GIVEN a container `C` with two registered handlers `h1` and `h2`
- AND a parent container `P` with handler `h0`
- WHEN `C.reset({ strategy: 'resetServices' })` is called
- THEN `C`'s handler array is empty
- AND `P`'s handler array still contains `h0`
- AND subsequent service resolution from `C` does NOT apply `h1` or `h2`

#### Scenario: No cross-test contamination in sequential test runs

- GIVEN test A registers `@Inject()`-decorated services and calls `Container.reset({ strategy: 'resetServices' })`
- WHEN test B starts and creates a fresh `ContainerInstance`
- THEN the new container's handler array is empty
- AND services resolved in test B do NOT receive injections configured in test A

---

### Requirement: Handler Matching Fix (TD-12)

The `applyPropertyHandlers` method MUST correctly match handlers to the target class being instantiated.

**Current bug:** The matching condition `handler.object.constructor === currentTarget` is incorrect for class decorators. When `@Inject()` decorates a property on `MyService`, `handler.object` is the prototype of `MyService` (i.e., `MyService.prototype`), not an instance. Therefore `handler.object.constructor === currentTarget` correctly equals `MyService`, but the traversal logic uses `Object.getPrototypeOf(currentTarget)` which walks the constructor chain — not the prototype chain of the instance. This causes mismatches for subclasses.

**Required behavior:** Handler matching MUST use `handler.object === target` for an exact match on the constructor, or `handler.object === Object.getPrototypeOf(currentTarget).prototype` when traversing the prototype chain. The matching strategy MUST be consistent with how `handler.object` is populated by `registerHandler`.

#### Scenario: Direct class property injection works

- GIVEN `class MyService { @Inject() dep: DepService }`
- WHEN the container resolves `MyService`
- THEN `instance.dep` is populated with a `DepService` instance
- AND no TypeError is thrown

#### Scenario: Inherited property injection works

- GIVEN `class BaseService { @Inject() dep: DepService }`
- AND `class ChildService extends BaseService {}`
- WHEN the container resolves `ChildService`
- THEN `instance.dep` is populated with a `DepService` instance (inherited from `BaseService`)
- AND the handler is applied exactly once (not duplicated)

#### Scenario: Unrelated class does not receive injection

- GIVEN `class ServiceA { @Inject() dep: DepService }`
- AND `class ServiceB {}` (no injection decorators)
- WHEN the container resolves `ServiceB`
- THEN `ServiceB` instance does NOT have a `dep` property set
- AND no injection side effects from `ServiceA`'s handlers are applied

---

### Requirement: Async Lifecycle — Symbol.asyncDispose

`ContainerInstance` MUST implement the `AsyncDisposable` interface by exposing `[Symbol.asyncDispose](): Promise<void>` as an alias for `dispose()`.

`ContainerInstance.dispose()` MUST:

1. Call `lifecycle.onDestroy` hooks (if defined on service metadata) for all instantiated services, awaiting each result.
2. Call `.dispose()` method on service instances that expose it (sync or async), after lifecycle hooks.
3. Clear `metadataMap` and `multiServiceIds` after all disposals complete.
4. Set `this.disposed = true`.
5. Cause all subsequent method calls on the disposed container to throw `'Cannot use container after it has been disposed.'`

The `init()` method MUST initialize all services with `eager: true` or `async: true` concurrently via `Promise.all`. For async services, the `lifecycle.onInit` hook (if defined) MUST be called after instantiation.

#### Scenario: await using auto-disposes container at scope exit

- GIVEN a container created with `await using container = new ContainerInstance('temp')`
- AND services registered in the container
- WHEN the block scope exits (normally or via exception)
- THEN `container[Symbol.asyncDispose]()` is called automatically
- AND all service `onDestroy` hooks are awaited
- AND the container is marked as disposed

#### Scenario: dispose() calls onDestroy hooks

- GIVEN a service registered with `lifecycle.onDestroy = async (instance) => { instance.cleanup() }`
- AND the service has been instantiated (value is set)
- WHEN `container.dispose()` is called
- THEN `onDestroy` is called with the service instance
- AND `onDestroy` is awaited before `metadataMap` is cleared

#### Scenario: dispose() calls .dispose() on service instances

- GIVEN a service instance that has a `.dispose(): Promise<void>` method
- AND no `lifecycle.onDestroy` is configured
- WHEN `container.dispose()` is called
- THEN the service's `.dispose()` method is called and awaited
- AND the service's value is reset to `EMPTY_VALUE`

#### Scenario: Method calls after dispose throw

- GIVEN a container that has been disposed via `container.dispose()`
- WHEN any method (`.get()`, `.set()`, `.has()`, `.reset()`, etc.) is called on it
- THEN an error with message `'Cannot use container after it has been disposed.'` is thrown

#### Scenario: init() initializes all eager and async services

- GIVEN a container with three services:
  - `ServiceA` with `eager: true`
  - `ServiceB` with `async: true`
  - `ServiceC` with no flags
- WHEN `await container.init()` is called
- THEN `ServiceA` is instantiated synchronously
- AND `ServiceB` is instantiated asynchronously and its `onInit` hook is awaited
- AND `ServiceC` is NOT instantiated until explicitly requested

#### Scenario: Warn on synchronous get of async service

- GIVEN a service registered with `async: true`
- WHEN `container.get(AsyncService)` is called (synchronously)
- THEN a `console.warn` is emitted informing the caller to use `getAsync()`
- AND the service value is still returned (best-effort)

---

### Requirement: Circular Dependency Detection

The container MUST detect circular constructor dependencies and throw a `CircularDependencyError` that includes the full resolution chain.

Property-level circular references (via `@Inject()`) MUST NOT be treated as errors, since the instance is created before property handlers are applied.

#### Scenario: Constructor circular dependency throws

- GIVEN `class A { constructor(@Inject() b: B) {} }` and `class B { constructor(@Inject() a: A) {} }`
- WHEN `container.get(A)` is called
- THEN a `CircularDependencyError` is thrown
- AND the error message includes both `A` and `B` in the dependency chain

#### Scenario: Property circular reference resolves without error

- GIVEN `class A { @Inject() b: B }` and `class B { @Inject() a: A }`
- WHEN `container.get(A)` is called
- THEN both `A` and `B` are instantiated successfully
- AND `a.b` is an instance of `B`
- AND `b.a` is an instance of `A`
