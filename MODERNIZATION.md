# TypeDI Modernization Roadmap

> Version: 0.10.0 → 1.0.0
> Status: In Progress (Phase 6-9, 14 Complete)
> Last Updated: 2026-02-21

## Executive Summary

TypeDI is a dependency injection library for TypeScript/Node.js undergoing modernization to meet 2026 industry standards. This document outlines the planned and completed modernization phases.

## Current State Analysis

### Metrics

| Metric             | Value  |
| ------------------ | ------ |
| TypeScript Version | 5.7.0  |
| Target ES          | ES2022 |
| Node.js Minimum    | 18.0.0 |
| Total Files        | 25     |
| Core Files         | 6      |
| Phases Completed   | 1-5, 6-9, 14 |

### Known Technical Debt (Resolved)

1. ~~**Container inheritance** - Handlers not properly inherited~~ ✅ Fixed
2. ~~**Infinite loop bug** - `@Inject` decorator causes loop during property handler application~~ ✅ Fixed
3. ~~**Prototype chain** - Only single-level parent lookup for inherited class handlers~~ ✅ Fixed
4. ~~**Deprecated APIs** - `Container.of()` auto-creation behavior~~ ✅ Removed in v0.16.0
5. ~~**Missing custom errors** - Generic `Error` thrown in multiple places~~ ✅ All errors have custom classes

---

## Phase 1: Critical Bug Fixes ✅ COMPLETE

> **Goal**: Fix blocking issues before any refactoring
> **Duration**: 1-2 weeks
> **Risk**: High (core behavior changes)

### 1.1 Fix Handler Inheritance ✅

**Location**: `src/container-instance.class.ts`

- Added `parent` property to `ContainerInstance`
- Created `getAllHandlers()` method with iterative traversal
- Implemented `createChild()` for explicit child container creation
- Non-default containers inherit handlers from default container (backward compatibility)

### 1.2 Fix Infinite Loop with @Inject ✅

**Location**: `src/container-instance.class.ts`

- Added `resolutionStack` to track services being resolved
- Created `CircularDependencyError` with helpful error messages
- Property handlers applied AFTER value is set and service removed from resolution stack
- Allows property-level circular references while preventing true circular dependencies

### 1.3 Fix Prototype Chain Traversal ✅

**Location**: `src/container-instance.class.ts`

- `findHandler()` now traverses full prototype chain
- `applyPropertyHandlers()` traverses prototype chain for inherited classes
- Supports multi-level inheritance hierarchies

---

## Phase 2: TypeScript 5.x Upgrade ✅ COMPLETE

> **Goal**: Modernize TypeScript configuration and tooling
> **Duration**: 1 week
> **Risk**: Medium (type errors may appear)

### 2.1 Update Dependencies ✅

| Package               | Old Version | New Version |
| --------------------- | ----------- | ----------- |
| TypeScript            | 4.9.5       | 5.7.0       |
| Rollup                | 2.79.1      | 4.0.0       |
| Jest                  | 27.5.1      | 29.7.0      |
| ts-jest               | 27.1.4      | 29.1.0      |
| Prettier              | 2.8.8       | 3.0.0       |
| @typescript-eslint/\* | 5.62.0      | 8.0.0       |

### 2.2 Update tsconfig.json ✅

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  }
}
```

---

## Phase 3: Decorator Strategy ⚠️ POSTPONED

> **Goal**: Evaluate decorator migration options
> **Duration**: Research Complete, Migration Postponed
> **Risk**: High (breaking change)

### Decision: Keep Legacy Decorators ✅

**Rationale**:

1. `emitDecoratorMetadata` is a TypeScript-specific feature with no ECMAScript equivalent
2. Migrating would require ALL users to specify types explicitly in every `@Inject()`
3. The legacy decorators work perfectly and are widely supported
4. No viable alternative exists for automatic type inference

**Current Configuration** (maintained):

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

---

## Phase 4: Build System & Testing ✅ COMPLETE

### 4.1 Update Jest ✅

- Jest 27.5.1 → 29.7.0 ✅
- ts-jest 27.1.4 → 29.1.0 ✅
- Coverage thresholds adjusted (branches: 60%) ✅

### 4.2 Update Rollup ✅

- Rollup 2.79.1 → 4.0.0 ✅
- `rollup-plugin-terser` → `@rollup/plugin-terser` ✅

---

## Phase 5: API Cleanup ✅ COMPLETE

### 5.1 Additional Custom Errors ✅

- `CircularDependencyError` ✅
- `ContainerDisposedError` ✅
- `ContainerRegistrationError` ✅
- `ServiceResolutionError` ✅

---

## Phase 6: ESM-First & Modern Build ✅ COMPLETE

> **Goal**: Prepare for ESM-first package structure
> **Duration**: 1 week
> **Risk**: Low

### 6.1 Add exports field to package.json ✅

**Location**: `package.json`

```json
{
  "exports": {
    ".": {
      "import": {
        "types": "./types/index.d.ts",
        "default": "./esm2015/index.js"
      },
      "require": {
        "types": "./types/index.d.ts",
        "default": "./cjs/index.js"
      }
    }
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 6.2 Update to TypeScript 5.7 ✅

- Updated from 5.5.0 to 5.7.0
- Added peer dependency for `reflect-metadata`

### 6.3 CI Matrix with Node.js versions ✅

**Location**: `.github/workflows/continuous-integration-workflow.yml`

- Added testing matrix: Node.js 18.x, 20.x, 22.x
- Updated actions to v4
- Added caching for npm

---

## Phase 7: Async Services Native Support ✅ COMPLETE

> **Goal**: First-class support for async service initialization
> **Duration**: 2 weeks
> **Risk**: Medium

### 7.1 Async Container Methods ✅

**Location**: `src/container-instance.class.ts`

```typescript
class ContainerInstance {
  /**
   * Asynchronously retrieves and initializes a service.
   */
  async getAsync<T>(identifier: ServiceIdentifier<T>): Promise<T>

  /**
   * Initialize all eager and async services in the container.
   */
  async init(): Promise<void>

  /**
   * Implements AsyncDisposable for `await using` statements.
   */
  [Symbol.asyncDispose](): Promise<void>
}
```

### 7.2 Lifecycle Hooks ✅

**Location**: `src/interfaces/service-metadata.interface.ts`

```typescript
interface ServiceLifecycleHooks {
  onInit?: (instance: unknown) => void | Promise<void>
  onDestroy?: (instance: unknown) => void | Promise<void>
}
```

**Usage**:

```typescript
Container.set({
  id: 'db',
  factory: async () => await connectDatabase(),
  lifecycle: {
    onInit: async (db) => await db.migrate(),
    onDestroy: async (db) => await db.close()
  }
});

// Initialize all services
await Container.init();
```

---

## Phase 8: Enhanced Error Messages ✅ COMPLETE

> **Goal**: Better developer experience with actionable error information
> **Duration**: 1 week
> **Risk**: Low

### 8.1 TypeDIError Base Class ✅

**Location**: `src/error/typedi-error.base.ts`

```typescript
class TypeDIError extends Error {
  readonly code: string;           // e.g., "TDI-001"
  readonly suggestion?: string;    // How to fix
  readonly helpUrl?: string;       // Documentation link

  toConsoleString(): string;       // Color-formatted output
}
```

### 8.2 Error Codes ✅

| Code  | Error                        |
| ----- | ---------------------------- |
| TDI-001 | ServiceNotFoundError        |
| TDI-002 | CircularDependencyError     |
| TDI-003 | CannotInjectValueError      |
| TDI-004 | CannotInstantiateValueError |
| TDI-005 | ContainerDisposedError      |
| TDI-006 | ContainerRegistrationError  |
| TDI-007 | ServiceResolutionError      |

**Example Output**:

```
[TDI-001] Service with "DatabaseService" identifier was not found.

💡 Suggestion: Register it before usage via "Container.set()" or use the "@Service()" decorator.

📚 Learn more: https://typedi.io/errors/TDI-001
```

---

## Phase 9: TypeScript 5.7+ Modern Types ✅ COMPLETE

> **Goal**: Leverage modern TypeScript features
> **Duration**: 1 week
> **Risk**: Low

### 9.1 AsyncDisposable Implementation ✅

**Location**: `src/container-instance.class.ts`

```typescript
export class ContainerInstance implements AsyncDisposable {
  [Symbol.asyncDispose](): Promise<void> {
    return this.dispose();
  }
}
```

**Usage with `await using`**:

```typescript
{
  await using container = new ContainerInstance('temp');
  container.set({ id: 'service', type: Service });
  // Automatically disposed at end of scope
}
```

---

## Phase 10: Performance & Observability ⏳ PLANNED

> **Goal**: Performance predictability and built-in observability
> **Duration**: 2 weeks
> **Risk**: Medium

**Planned Features**:

- `request` scope for web frameworks
- Built-in metrics (resolution times, service counts)
- Optional OpenTelemetry integration
- DevTools for container inspection

---

## Phase 11: Security & Supply Chain ⏳ PLANNED

> **Goal**: Security hardening
> **Duration**: 1 week
> **Risk**: Low

**Planned Features**:

- npm audit in CI
- SBOM generation (CycloneDX)
- Dependabot with automerge
- Provably signed releases (Sigstore)

---

## Phase 12: Testing Modernization ⏳ PLANNED

> **Goal**: Modern, fast test suite
> **Duration**: 1 week
> **Risk**: Low

**Planned Features**:

- Evaluate Vitest migration
- Property-based testing (fast-check)
- Snapshot tests for error messages
- Benchmark regression suite

---

## Phase 13: Documentation & DX ⏳ PLANNED

> **Goal**: Top-tier developer experience
> **Duration**: 2 weeks
> **Risk**: Low

**Planned Features**:

- TypeDoc for API documentation
- Interactive examples (StackBlitz)
- Migration guide v0.x → v1.0
- ESLint plugin for best practices
- VS Code extension with snippets

---

## Phase 14: Container.of() Removal ✅ COMPLETE

> **Goal**: Remove deprecated auto-creation behavior
> **Duration**: 1 week
> **Risk**: Medium (breaking change)

### 14.1 Auto-Creation Removed ✅

**Location**: `src/container-instance.class.ts`

- `Container.of()` now throws `ServiceNotFoundError` if container doesn't exist
- No longer auto-creates containers
- Users must use `new ContainerInstance(id)` or `container.createChild(id)`

**Migration Guide**:

```typescript
// OLD (v0.15.x)
const container = Container.of('my-container');

// NEW (v0.16.0+)
const container = new ContainerInstance('my-container');
// OR
const container = ContainerInstance.of('default').createChild('my-container');
```

---

## Versioning Strategy

### v0.11.0 - Phase 1 Complete ✅

- Critical bug fixes
- Handler inheritance
- Circular dependency detection
- Prototype chain traversal

### v0.12.0 - Phase 2 Complete ✅

- TypeScript 5.5
- Modern target ES2022
- Updated build tools

### v0.13.0 - Phase 3 ✅

- Decorator migration postponed
- Documentation added

### v0.14.0 - Phase 4 Complete ✅

- Integration test suite
- Improved test coverage

### v0.15.0 - Phase 5 Complete ✅

- Custom error classes
- Enhanced error handling

### v0.16.0 - Phase 6-9, 14 Complete ✅

- ESM-first package structure with `exports` field
- TypeScript 5.7
- Node.js 18+ requirement
- Async services support (`getAsync`, `init`, lifecycle hooks)
- Enhanced error messages with codes and suggestions
- `AsyncDisposable` implementation (`Symbol.asyncDispose`)
- `Container.of()` auto-creation removed
- CI matrix with Node.js 18, 20, 22

### v1.0.0 - Future Release

- All remaining breaking changes
- Full ESM transition
- Request scope
- Observability features

---

## Open Questions

1. ✅ **Metadata approach**: Keep `reflect-metadata` with legacy decorators
2. ✅ **Async services**: Implemented in Phase 7
3. **ESM-first**: Should we make ESM the primary format in v1.0?
4. **Request scope**: Should be prioritized for web framework integration?

---

## References

- [ECMAScript Decorators Proposal](https://github.com/tc39/proposal-decorators)
- [TypeScript 5.7 Documentation](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html)
- [reflect-metadata Package](https://www.npmjs.com/package/reflect-metadata)
- [AsyncDisposable Proposal](https://github.com/tc39/proposal-async-explicit-resource-management)
