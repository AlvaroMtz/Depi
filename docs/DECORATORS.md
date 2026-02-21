# TypeDI Decorators

## Why TypeDI Uses Legacy Decorators

TypeDI currently uses TypeScript's `experimentalDecorators` with `emitDecoratorMetadata`. This document explains why and discusses future plans.

## The Short Version

TypeDI **requires** `emitDecoratorMetadata` to automatically determine what to inject. The ECMAScript Stage 3 decorator proposal **does not include type metadata**, making it incompatible with TypeDI's automatic type inference.

## How TypeDI Uses Decorators

### Automatic Type Inference

With `emitDecoratorMetadata`, TypeScript emits type information that TypeDI uses at runtime:

```typescript
@Service()
class ExampleService {
  // TypeDI automatically knows to inject a Logger instance
  constructor(logger: Logger) {}
}
```

This works because TypeScript compiles to:

```javascript
Reflect.defineMetadata('design:paramtypes', [Logger], ExampleService);
```

TypeDI reads this metadata at runtime to know that `Logger` should be injected.

### Manual Type Specification (Alternative)

Without metadata, you would need to specify every type explicitly:

```typescript
@Service()
class ExampleService {
  // Without metadata, you must specify the type
  constructor(@Inject(() => Logger) logger: Logger) {}
}
```

This is more verbose and defeats the purpose of a type-safe DI system.

## Configuration Requirements

To use TypeDI, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

And in your entry file (before any decorators):

```typescript
import 'reflect-metadata';
```

## Why Not ECMAScript Stage 3 Decorators?

The ECMAScript Stage 3 decorator proposal reached Stage 3 in 2023 and is supported in TypeScript 5.0+. However:

1. **No Type Metadata**: Stage 3 decorators do NOT include type metadata emission
2. **No Replacement**: There is no ECMAScript proposal equivalent to `emitDecoratorMetadata`
3. **Breaking Change**: Migrating would require all users to manually specify types

### Example: Stage 3 vs Legacy

```typescript
// Legacy (current TypeDI)
@Service()
class Service {
  constructor(dep: Dependency) {}
}

// Stage 3 (not supported by TypeDI)
@Service
class Service {
  // No way to know what "dep" is without manual specification
  constructor(dep: unknown) {}
}
```

## Future Plans

### Waiting for ECMAScript Metadata

TypeDI will continue using legacy decorators until one of the following happens:

1. **ECMAScript adds a metadata API** - A standard way to attach type information to classes
2. **TypeScript adds metadata to Stage 3 decorators** - An extension for TS-specific metadata
3. **Community consensus** - A widely-adopted pattern emerges

### Hybrid Approach (Possible Future)

TypeDI could potentially support both modes:

```typescript
// Legacy mode (automatic type inference)
@UseLegacyDecorators()
@Service()
class ServiceA {
  constructor(dep: Dependency) {}
}

// Stage 3 mode (manual specification)
@UseStandardDecorators()
@Service()
class ServiceB {
  constructor(@Inject(() => Dependency) dep: Dependency) {}
}
```

This would increase maintenance burden and is not currently planned.

## Common Questions

### Are Legacy Decorators Going Away?

No. TypeScript has committed to supporting `experimentalDecorators` indefinitely:

> "We have no plans to remove support for experimental decorators."
> — TypeScript Team, 2023

### Is TypeDI Compatible with Stage 3 Decorators?

Not directly. Projects using Stage 3 decorators cannot use TypeDI's automatic type inference.

### Can I Mix Decorator Types?

No, TypeScript does not allow mixing legacy and Stage 3 decorators in the same project.

### Workarounds for Stage 3 Projects

If your project uses Stage 3 decorators, you have two options:

1. **Use manual injection everywhere**:

   ```typescript
   @Service()
   class Service {
     constructor(@Inject(() => Dependency) dep: Dependency) {}
   }
   ```

2. **Use a different DI library** - Consider libraries designed for Stage 3 decorators

## References

- [TypeScript Decorators Documentation](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [ECMAScript Decorators Proposal](https://github.com/tc39/proposal-decorators)
- [reflect-metadata NPM Package](https://www.npmjs.com/package/reflect-metadata)
- [TypeScript Issue #27319 - Decorator Metadata](https://github.com/microsoft/TypeScript/issues/27319)
