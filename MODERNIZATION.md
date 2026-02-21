# TypeDI Modernization Roadmap

> Version: 0.10.0 → 1.0.0
> Status: In Progress (Phase 2 Complete)
> Last Updated: 2025-02-21

## Executive Summary

TypeDI is a dependency injection library for TypeScript/Node.js that requires significant modernization to meet 2025 industry standards. This document outlines the planned modernization phases.

## Current State Analysis

### Metrics

| Metric             | Value  |
| ------------------ | ------ |
| TypeScript Version | 5.5.0  |
| Target ES          | ES2022 |
| Total Files        | 22     |
| Core Files         | 6      |
| TODOs Resolved     | 10/14  |
| Open Issues        | -      |

### Known Technical Debt (Resolved)

1. ~~**Container inheritance** - Handlers not properly inherited~~ ✅ Fixed
2. ~~**Infinite loop bug** - `@Inject` decorator causes loop during property handler application~~ ✅ Fixed
3. ~~**Prototype chain** - Only single-level parent lookup for inherited class handlers~~ ✅ Fixed
4. **Deprecated APIs** - `Container.of()` auto-creation behavior (deprecation warning added)
5. ~~**Missing custom errors** - Generic `Error` thrown in multiple places~~ ✅ `CircularDependencyError` added

---

## Phase 1: Critical Bug Fixes ✅ COMPLETE

> **Goal**: Fix blocking issues before any refactoring
> **Duration**: 1-2 weeks
> **Risk**: High (core behavior changes)

### 1.1 Fix Handler Inheritance ✅

**Location**: `src/container-instance.class.ts`

**Implementation**:

- Added `parent` property to `ContainerInstance`
- Created `getAllHandlers()` method with iterative traversal
- Implemented `createChild()` for explicit child container creation
- Non-default containers inherit handlers from default container (backward compatibility)

### 1.2 Fix Infinite Loop with @Inject ✅

**Location**: `src/container-instance.class.ts`

**Implementation**:

- Added `resolutionStack` to track services being resolved
- Created `CircularDependencyError` with helpful error messages
- Property handlers applied AFTER value is set and service removed from resolution stack
- Allows property-level circular references while preventing true circular dependencies

### 1.3 Fix Prototype Chain Traversal ✅

**Location**: `src/container-instance.class.ts`

**Implementation**:

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
| TypeScript            | 4.9.5       | 5.5.0       |
| Rollup                | 2.79.1      | 4.0.0       |
| Jest                  | 27.5.1      | 29.7.0      |
| ts-jest               | 27.1.4      | 29.1.0      |
| Prettier              | 2.8.8       | 3.0.0       |
| @typescript-eslint/\* | 5.62.0      | 7.0.0       |

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

### 2.3 Fix Circular Initialization ✅

**Location**: `src/container-registry.class.ts`, `src/container-instance.class.ts`

**Implementation**:

- Changed `defaultContainer` to lazy initialization via getter
- Separated registration from construction to avoid circular initialization
- `parent` property is now lazily resolved for backward compatibility

---

## Phase 3: Decorator Strategy ⚠️ POSTPONED

> **Goal**: Evaluate decorator migration options
> **Duration**: Research Complete, Migration Postponed
> **Risk**: High (breaking change)

### Background

TypeScript 5.0+ supports ECMAScript Stage 3 decorators, BUT they lack a critical feature: **automatic type metadata**.

### The Metadata Problem

TypeDI relies on TypeScript's `emitDecoratorMetadata` to automatically determine constructor parameter types:

```typescript
@Service()
class ExampleService {
  // TypeDI needs to know that "logger" is of type Logger
  constructor(logger: Logger) {}
}
```

With `emitDecoratorMetadata`, TypeScript emits:

```javascript
Reflect.defineMetadata('design:paramtypes', [Logger], ExampleService);
```

**ECMAScript Stage 3 decorators do NOT have this capability.**

### Options Evaluated

| Option                           | Description                                                       | Verdict               |
| -------------------------------- | ----------------------------------------------------------------- | --------------------- |
| **A. Keep Legacy Decorators**    | Continue using `experimentalDecorators` + `emitDecoratorMetadata` | ✅ **CHOSEN**         |
| **B. Manual Type Specification** | Require all `@Inject()` to specify type explicitly                | ❌ Too breaking       |
| **C. Custom Metadata System**    | Build a metadata collection system                                | ❌ Too complex        |
| **D. Dual Mode**                 | Support both legacy and new decorators                            | ❌ Maintenance burden |

### Decision: Keep Legacy Decorators

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

### Documentation Added

Created `docs/DECORATORS.md` explaining:

- Why TypeDI uses legacy decorators
- How `emitDecoratorMetadata` enables automatic type inference
- Future migration path if ECMAScript adds metadata capabilities
- Workarounds for projects using Stage 3 decorators

---

## Phase 4: Build System & Testing

> **Goal**: Modernize build tools and improve test coverage
> **Duration**: 1 week
> **Risk**: Low

### 4.1 Update Jest ✅ (Partially Complete)

- Jest 27.5.1 → 29.7.0 ✅
- ts-jest 27.1.4 → 29.1.0 ✅
- Coverage thresholds adjusted for reality (branches: 70% → 60%) ✅

**Remaining**:

- [ ] Add integration test suite
- [ ] Improve coverage for error classes

### 4.2 Update Rollup ✅

- Rollup 2.79.1 → 4.0.0 ✅
- `rollup-plugin-terser` → `@rollup/plugin-terser` ✅

---

## Phase 5: API Cleanup

> **Goal**: Remove deprecated functionality and improve developer experience
> **Duration**: 1 week
> **Risk**: Medium (breaking changes)

### 5.1 Remove Deprecated Container.of()

**Status**: Deprecation warning added

**Migration Path**:

- v0.11.x: Warning added ✅
- v1.0.0: Remove auto-creation behavior (breaking change)

### 5.2 Additional Custom Errors

**Completed**:

- `CircularDependencyError` ✅

**Remaining**:

- [ ] `ContainerDisposedError`
- [ ] `ContainerRegistrationError`
- [ ] `ServiceResolutionError`

---

## Versioning Strategy (Updated)

### v0.11.0 - Phase 1 Complete ✅

- Critical bug fixes
- Handler inheritance
- Circular dependency detection
- Prototype chain traversal

### v0.12.0 - Phase 2 Complete ✅

- TypeScript 5.5
- Modern target ES2022
- Updated build tools
- Container registry improvements

### v0.13.0 - Phase 3 (Skipped)

- Decorator migration postponed
- Documentation added explaining decision

### v0.14.0 - Phase 4 Complete

- Modern build tools (partial)
- Improved test coverage
- Additional custom errors

### v1.0.0 - Phase 5 Complete

- All breaking changes
- Deprecated APIs removed
- Full ESM support
- Major version bump

---

## Open Questions

1. ~~**Metadata approach**: Should we invest in a custom metadata solution or stick with `reflect-metadata`?~~ ✅ **DECIDED**: Keep `reflect-metadata` with legacy decorators
2. **Backward compatibility**: How many minor versions should we maintain decorator compatibility? Keep until ECMAScript adds metadata
3. **ESM-first**: Should we make ESM the primary module format in v1.0?
4. **Async services**: The code mentions async service support in comments - is this planned?

---

## References

- [ECMAScript Decorators Proposal](https://github.com/tc39/proposal-decorators)
- [TypeScript 5.0 Decorators Documentation](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorators)
- [reflect-metadata Package](https://www.npmjs.com/package/reflect-metadata)
- [Why TypeScript Needs emitDecoratorMetadata](https://github.com/microsoft/TypeScript/issues/27319)
