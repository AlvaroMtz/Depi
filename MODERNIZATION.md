# TypeDI Modernization Roadmap

> Version: 0.10.0 → 1.0.0
> Status: Planning
> Last Updated: 2025-02-21

## Executive Summary

TypeDI is a dependency injection library for TypeScript/Node.js that requires significant modernization to meet 2025 industry standards. This document outlines the planned modernization phases.

## Current State Analysis

### Metrics

| Metric             | Value  |
| ------------------ | ------ |
| TypeScript Version | 4.9.5  |
| Target ES          | ES2018 |
| Total Files        | 22     |
| Core Files         | 6      |
| TODOs              | 14     |
| Open Issues        | -      |

### Known Technical Debt

1. **Container inheritance** - Handlers not properly inherited (7 TODOs)
2. **Infinite loop bug** - `@Inject` decorator causes loop during property handler application
3. **Prototype chain** - Only single-level parent lookup for inherited class handlers
4. **Deprecated APIs** - `Container.of()` auto-creation behavior
5. **Missing custom errors** - Generic `Error` thrown in multiple places

---

## Phase 1: Critical Bug Fixes

> **Goal**: Fix blocking issues before any refactoring
> **Duration**: 1-2 weeks
> **Risk**: High (core behavior changes)

### 1.1 Fix Handler Inheritance

**Location**: `src/container-instance.class.ts:52-56`

**Problem**: Handlers are copied by reference from default container instead of being properly inherited.

```typescript
// Current (broken)
this.handlers = ContainerRegistry.defaultContainer?.handlers || [];

// Proposed solution
private getHandlers(): Handler[] {
  const handlers = [...this.handlers];
  if (this.parent) {
    handlers.push(...this.parent.getHandlers());
  }
  return handlers;
}
```

**Acceptance Criteria**:

- [ ] Child containers inherit handlers from parent
- [ ] Handlers from parent are read-only (cannot be modified)
- [ ] All existing tests pass
- [ ] New test cases for handler inheritance

### 1.2 Fix Infinite Loop with @Inject

**Location**: `src/container-instance.class.ts:386-389`

**Problem**: Calling `applyPropertyHandlers` during instantiation causes infinite loop because `@Inject` registers a handler that calls `Container.get`.

```typescript
// Current issue
// TODO: Calling this here, leads to infinite loop, because @Inject decorator registers a handler
// TODO: which calls Container.get, which will check if the requested type has a value set and if not
// TODO: it will start the instantiation process over.
```

**Proposed Solution**: Track instantiation state to prevent recursive resolution:

```typescript
private instantiating: Set<ServiceIdentifier> = new Set();

private getServiceValue(serviceMetadata: ServiceMetadata<unknown>): any {
  // Detect circular dependency
  if (this.instantiating.has(serviceMetadata.id)) {
    throw new CircularDependencyError(serviceMetadata.id);
  }

  this.instantiating.add(serviceMetadata.id);
  try {
    // ... existing logic
  } finally {
    this.instantiating.delete(serviceMetadata.id);
  }
}
```

**Acceptance Criteria**:

- [ ] No infinite loops during property injection
- [ ] Circular dependencies detected and reported with clear error
- [ ] All existing tests pass
- [ ] New test for circular dependency detection

### 1.3 Fix Prototype Chain Traversal

**Location**: `src/container-instance.class.ts:425-426`

**Problem**: Only single-level parent lookup for inherited class handlers.

```typescript
// Current (limited)
return handler.object === Object.getPrototypeOf(target) && handler.index === index;

// Proposed solution - traverse full chain
private findHandler(target: Function, index: number): Handler | undefined {
  let current = target;
  while (current !== Object.prototype) {
    const handler = this.handlers.find(h => h.object === current && h.index === index);
    if (handler) return handler;
    current = Object.getPrototypeOf(current);
  }
  return undefined;
}
```

**Acceptance Criteria**:

- [ ] Handlers work for multi-level inheritance
- [ ] Performance impact is minimal
- [ ] All existing tests pass
- [ ] New test for deep inheritance hierarchies

---

## Phase 2: TypeScript 5.x Upgrade

> **Goal**: Modernize TypeScript configuration and tooling
> **Duration**: 1 week
> **Risk**: Medium (type errors may appear)

### 2.1 Update Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^22.5.1",
    "@types/jest": "^29.5.0"
  }
}
```

**Acceptance Criteria**:

- [ ] TypeScript 5.5 installed
- [ ] Build succeeds with new version
- [ ] No new type errors introduced

### 2.2 Update tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

**Acceptance Criteria**:

- [ ] Target is ES2022
- [ ] Module resolution is NodeNext
- [ ] All builds succeed
- [ ] Tests still pass

### 2.3 Consolidate tsconfig Files

**Current**: 6 separate tsconfig files

- tsconfig.json
- tsconfig.prod.cjs.json
- tsconfig.prod.esm2015.json
- tsconfig.prod.esm5.json
- tsconfig.prod.types.json
- tsconfig.spec.json

**Proposed**: 3 consolidated files

- tsconfig.json (base)
- tsconfig.build.json (extends base, production settings)
- tsconfig.test.json (extends base, test settings)

**Acceptance Criteria**:

- [ ] Only 3 tsconfig files remain
- [ ] All build outputs work correctly
- [ ] CI/CD pipeline updated

---

## Phase 3: Decorator Migration

> **Goal**: Migrate to ECMAScript standard decorators (Stage 3)
> **Duration**: 2-3 weeks
> **Risk**: High (breaking change for decorators)

### 3.1 Research & Planning

**Tasks**:

- [ ] Document current decorator usage patterns
- [ ] Research new ECMAScript decorator proposal
- [ ] Evaluate compatibility options
- [ ] Create migration guide

### 3.2 Implement New Decorators

**Files to modify**:

- `src/decorators/service.decorator.ts`
- `src/decorators/inject.decorator.ts`
- `src/decorators/inject-many.decorator.ts`

**New syntax example**:

```typescript
// Old (legacy)
export function Service<T>(options?: ServiceOptions<T>): ClassDecorator {
  return targetConstructor => {
    // ... implementation
  };
}

// New (standard)
function Service<T>(options?: ServiceOptions<T>) {
  return (target: Class, context: ClassDecoratorContext) => {
    // ... implementation using context API
  };
}
```

### 3.3 Metadata Solution

Since standard decorators don't emit metadata by default, we need to:

**Option A**: Continue using `reflect-metadata` with `emitDecoratorMetadata`
**Option B**: Implement custom metadata collection
**Option C**: Use a hybrid approach with compatibility layer

**Recommendation**: Start with Option A for backward compatibility, add Option B as opt-in.

**Acceptance Criteria**:

- [ ] New decorators work with standard decorator proposal
- [ ] Backward compatibility maintained (dual mode)
- [ ] Migration guide documented
- [ ] All tests pass with both decorator modes

---

## Phase 4: Build System & Testing

> **Goal**: Modernize build tools and improve test coverage
> **Duration**: 1 week
> **Risk**: Low

### 4.1 Update Jest to 29.x

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0"
  }
}
```

**New jest.config.js**:

```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/index.ts', '!src/**/*.interface.ts'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
};
```

**Acceptance Criteria**:

- [ ] Jest 29 installed and working
- [ ] All tests pass
- [ ] Coverage meets 80% threshold

### 4.2 Update Rollup to 4.x

```json
{
  "devDependencies": {
    "rollup": "^4.0.0",
    "@rollup/plugin-typescript": "^11.0.0",
    "@rollup/plugin-node-resolve": "^15.0.0"
  }
}
```

**Acceptance Criteria**:

- [ ] Rollup 4 builds successfully
- [ ] All output formats work (CJS, ESM)
- [ ] Bundle size analyzed and optimized

### 4.3 Add Integration Tests

**New test structure**:

```
test/
├── unit/           (existing)
└── integration/    (new)
    ├── end-to-end.spec.ts
    ├── inheritance.spec.ts
    └── circular-deps.spec.ts
```

**Acceptance Criteria**:

- [ ] Integration test suite created
- [ ] End-to-end workflows tested
- [ ] Container inheritance scenarios tested

---

## Phase 5: API Cleanup

> **Goal**: Remove deprecated functionality and improve developer experience
> **Duration**: 1 week
> **Risk**: Medium (breaking changes)

### 5.1 Remove Deprecated Container.of()

**Current behavior**:

```typescript
// Deprecated - auto-creates container
const container = Container.of('some-id');
```

**New API**:

```typescript
// Explicit creation
const container = new ContainerInstance('some-id');

// Or via registry
const container = ContainerRegistry.getContainer('some-id');
```

**Migration path**:

1. Deprecate in v0.10.x with warning
2. Remove in v1.0.0

### 5.2 Create Custom Errors

Replace generic `Error` with specific error types:

```typescript
// New errors to create
-ContainerDisposedError - ContainerRegistrationError - ServiceResolutionError;
```

**Acceptance Criteria**:

- [ ] All custom errors implemented
- [ ] Generic `Error` usage replaced
- [ ] Error messages are helpful and actionable
- [ ] Error codes for programmatic handling

---

## Versioning Strategy

### v0.11.0 - Phase 1 Complete

- Critical bug fixes
- Handler inheritance
- Circular dependency detection

### v0.12.0 - Phase 2 Complete

- TypeScript 5.x
- Modern target ES2022
- Consolidated configs

### v0.13.0 - Phase 3 Complete

- New decorator support (dual mode)
- Migration guide

### v0.14.0 - Phase 4 Complete

- Modern build tools
- Improved test coverage

### v1.0.0 - Phase 5 Complete

- All breaking changes
- Deprecated APIs removed
- Full ESM support

---

## Open Questions

1. **Metadata approach**: Should we invest in a custom metadata solution or stick with `reflect-metadata`?
2. **Backward compatibility**: How many minor versions should we maintain decorator compatibility?
3. **ESM-first**: Should we make ESM the primary module format in v1.0?
4. **Async services**: The code mentions async service support in comments - is this planned?

---

## References

- [ECMAScript Decorators Proposal](https://github.com/tc39/proposal-decorators)
- [TypeScript 5.0 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)
- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
