# sc:typedi-fix-container

## Description

Container inheritance and behavior fix skill for TypeDI. Addresses the known limitations and TODOs in the container inheritance system.

## When to Use

Use this skill when you need to:

- Fix container inheritance issues
- Resolve handler system limitations
- Address deprecated functionality
- Implement proper child container behavior
- Fix service resolution in inherited containers

## Known Issues

### 1. Container Inheritance (TODO)

Location: `src/container-instance.class.ts:421-427`

```typescript
// TODO: need to rework container inheritance, because:
// - handlers are not inherited by child containers
// - this is deprecated functionality
```

**Problem**: Child containers don't properly inherit handlers from parent containers.

### 2. Deprecated Functionality

Location: `src/container-instance.class.ts:251-252`

```typescript
// deprecated functionality
// Container.of(ContainerId) creates a new container with parent
```

**Problem**: The current inheritance pattern is deprecated but still in use.

### 3. Handler System Limitations

Location: `src/container-instance.class.ts`

**Problem**: Handlers registered on parent containers are not visible to child containers, causing inconsistent behavior.

## Container Architecture

```
ContainerRegistry (global)
    |
    +-- ContainerInstance (root)
         |
         +-- ContainerInstance (child)
              |
              +-- ContainerInstance (grandchild)
```

## Usage Examples

```bash
/typedi-fix-container --analyze
/typedi-fix-container --inheritance
/typedi-fix-container --handlers
/typedi-fix-container --deprecate
/typedi-fix-container --all
```

## Options

| Option          | Description                                  |
| --------------- | -------------------------------------------- |
| `--analyze`     | Analyze current container inheritance issues |
| `--inheritance` | Fix container inheritance implementation     |
| `--handlers`    | Fix handler system inheritance               |
| `--deprecate`   | Remove/handle deprecated functionality       |
| `--all`         | Apply all container fixes                    |

## Implementation Plan

### Phase 1: Analysis

1. Map all container inheritance usage
2. Identify handler registration patterns
3. Document deprecated functionality usage
4. Analyze test expectations

### Phase 2: Handler Inheritance

```typescript
// New approach: Handlers should be inherited
class ContainerInstance {
  private handlers: Map<string, Handler[]> = new Map();

  getHandlers(type: string): Handler[] {
    const handlers = [...(this.handlers.get(type) || [])];
    // Merge parent handlers
    if (this.parent) {
      handlers.push(...this.parent.getHandlers(type));
    }
    return handlers;
  }
}
```

### Phase 3: Container Scoping

```typescript
// Proper child container creation
class ContainerInstance {
  static createChild(parent: ContainerInstance): ContainerInstance {
    const child = new ContainerInstance();
    child.parent = parent;
    child.inheritHandlers(parent);
    return child;
  }
}
```

## Related Files

```
src/container-instance.class.ts (493 lines - main file)
src/container-registry.class.ts (105 lines)
src/interfaces/service-metadata.interface.ts
src/types/container-scope.type.ts
test/container-instance.spec.ts
```

## Test Cases to Verify

```typescript
// Handler inheritance
describe('Container Inheritance', () => {
  it('should inherit handlers from parent', () => {});
  it('should not affect parent handlers', () => {});
  it('should resolve services using inherited handlers', () => {});
});

// Child container behavior
describe('Child Container', () => {
  it('should create isolated scope', () => {});
  it('should inherit singleton services', () => {});
  it('should not inherit container-scoped services', () => {});
});
```

## Breaking Changes to Consider

1. **Handler inheritance behavior** - May change resolution order
2. **Child container creation** - New API for creating child containers
3. **Deprecated API removal** - Remove `Container.of()` pattern

## Migration Guide for Users

### Before (deprecated)

```typescript
const childContainer = Container.of(parentId);
```

### After (new)

```typescript
const childContainer = parentContainer.createChild();
```

## Backward Compatibility

Provide a compatibility layer:

```typescript
/**
 * @deprecated Use container.createChild() instead
 */
static of(id: string): ContainerInstance {
  console.warn('Container.of() is deprecated. Use container.createChild()');
  // ... compatibility implementation
}
```
