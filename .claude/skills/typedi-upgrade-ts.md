# sc:typedi-upgrade-ts

## Description

TypeScript modernization skill for TypeDI. Handles upgrades from TypeScript 4.x to 5.x, updates language targets, and enables modern TS features.

## When to Use

Use this skill when you need to:

- Upgrade TypeScript version (4.9.5 → 5.5+)
- Update target ECMAScript version (ES2018 → ES2022+)
- Enable strict type checking
- Migrate to modern module resolution (node16/nodenext)
- Fix breaking changes from TS upgrades
- Update type definitions

## Current State

| Setting           | Current  | Target          |
| ----------------- | -------- | --------------- |
| TypeScript        | 4.9.5    | 5.5+            |
| Target            | ES2018   | ES2022          |
| Module            | commonjs | nodenext        |
| Module Resolution | node     | node16/nodenext |
| Strict Mode       | Partial  | Full            |

## tsconfig Files to Update

```bash
# Production configs
tsconfig.prod.cjs.json
tsconfig.prod.esm2015.json
tsconfig.prod.esm5.json
tsconfig.prod.types.json

# Development/Test configs
tsconfig.json
tsconfig.test.json
tsconfig.spec.json
```

## Usage Examples

```bash
/typedi-upgrade-ts --version=5.5
/typedi-upgrade-ts --target=ES2022
/typedi-upgrade-ts --strict
/typedi-upgrade-ts --module=nodenext
/typedi-upgrade-ts --all
```

## Options

| Option      | Description                             |
| ----------- | --------------------------------------- |
| `--version` | Target TS version (default: 5.5)        |
| `--target`  | ES target: ES2020, ES2021, ES2022       |
| `--strict`  | Enable all strict type checking options |
| `--module`  | Module system: nodenext, node16, esnext |
| `--all`     | Apply all modernization changes         |

## Breaking Changes to Handle

1. **in operator with strict null checks** - More precise type narrowing
2. **Decorator metadata** - Changes in emitDecoratorMetadata
3. **Tuple type labels** - Optional elements in tuples
4. **extends conditions** - Conditional type constraints
5. **Promise resolution** - Promise handling improvements

## Post-Upgrade Checklist

- [ ] All tests pass
- [ ] No type errors in source
- [ ] No type errors in tests
- [ ] Build succeeds for all targets
- [ ] Type definitions are correct
- [ ] No implicit any errors
- [ ] Decorator metadata works correctly

## Related Files

- `package.json` - Update typescript dependency
- `tsconfig*.json` - Configuration files
- `src/**/*.ts` - Source files needing type fixes
