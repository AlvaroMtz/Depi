# sc:typedi-migrate-decorators

## Description

Migration skill for TypeScript decorators. Handles the transition from legacy decorators (Stage 1) to the new standard decorators proposal (Stage 3/4).

## When to Use

Use this skill when you need to:

- Migrate from experimentalDecorators to standard decorators
- Update @Service, @Inject, @InjectMany decorators
- Handle decorator metadata changes
- Maintain backward compatibility during migration
- Understand decorator implementation changes

## Background

TypeScript 5 introduces support for the new ECMAScript decorators proposal:

- **Legacy**: `experimentalDecorators` + `emitDecoratorMetadata`
- **New**: Standard decorators (Stage 3), no metadata by default

## Current Decorators in TypeDI

```typescript
// Legacy decorator pattern (current)
@Service()
class MyService {
  constructor(@Inject('dependency') private dep: Dependency) {}
}

// Uses reflect-metadata for type information
// Requires experimentalDecorators + emitDecoratorMetadata
```

## Migration Strategy

### Phase 1: Analysis

```bash
/typedi-migrate-decorators --analyze
```

Identify all decorators and their usage patterns.

### Phase 2: Implementation

```bash
/typedi-migrate-decorators --implement
```

Implement new decorator syntax.

### Phase 3: Metadata

```bash
/typedi-migrate-decorators --metadata
```

Replace reflect-metadata with custom metadata solution.

## Decorator Files to Migrate

```
src/decorators/service.decorator.ts
src/decorators/inject.decorator.ts
src/decorators/inject-many.decorator.ts
src/decorators/inject-all.decorator.ts
src/decorators/inject-many-many.decorator.ts
```

## Usage Examples

```bash
/typedi-migrate-decorators --analyze
/typedi-migrate-decorators --implement
/typedi-migrate-decorators --metadata
/typedi-migrate-decorators --compat
/typedi-migrate-decorators --all
```

## Options

| Option        | Description                     |
| ------------- | ------------------------------- |
| `--analyze`   | Analyze current decorator usage |
| `--implement` | Implement new decorator syntax  |
| `--metadata`  | Handle metadata implementation  |
| `--compat`    | Create compatibility layer      |
| `--all`       | Run full migration              |

## Key Challenges

### 1. Metadata Loss

Standard decorators don't emit type metadata by default.
**Solution**: Implement custom metadata collection or maintain compat mode.

### 2. Constructor Parameter Decorators

New syntax for parameter decorators is different.
**Solution**: Use new `context` parameter in decorators.

### 3. Field Decorators

Field decorators have new semantics.
**Solution**: Migrate to accessor/property decorators.

## New Decorator Syntax Example

```typescript
// New decorator syntax (proposed)
function Service(options?: ServiceOptions) {
  return (target: Class, context: ClassDecoratorContext) => {
    // Implementation using new context API
    const metadata = {
      id: target,
      type: target,
      scope: options?.scope || 'singleton',
    };
    // Register service
  };
}

// New parameter decorator
function Inject(token: ServiceIdentifier) {
  return (target: Class, propertyKey: string, index: number, context: ParameterDecoratorContext) => {
    // Implementation
  };
}
```

## Compatibility Approach

1. **Dual-mode support**: Support both legacy and new decorators
2. **Feature detection**: Detect which decorator mode is active
3. **Gradual migration**: Allow users to migrate incrementally
4. **Deprecation path**: Mark legacy as deprecated with migration guide

## References

- [ECMAScript Decorators Proposal](https://github.com/tc39/proposal-decorators)
- [TypeScript 5.0 Decorators](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorator-metadata)
- [Migration Guide](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#decorators)
