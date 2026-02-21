# sc:typedi-update-build

## Description

Build system modernization skill for TypeDI. Updates build tools, consolidates configuration, and enables modern build practices.

## When to Use

Use this skill when you need to:

- Update build dependencies (Rollup, ts-node, etc.)
- Consolidate multiple tsconfig files
- Enable ESBuild for faster builds
- Modernize package.json exports
- Set up proper ESM support
- Optimize bundle sizes

## Current Build Stack

| Tool       | Current Version | Target Version  |
| ---------- | --------------- | --------------- |
| Rollup     | 2.79.1          | 4.x             |
| TypeScript | 4.9.5           | 5.5+            |
| ts-node    | 10.9.2          | 10.9.x (latest) |
| rimraf     | 3.0.2           | 5.x+            |

## Current Build Outputs

```
cjs/         - CommonJS (main)
esm5/        - ES5 modules (legacy)
esm2015/     - ES2015 modules (outdated)
types/       - Type definitions
```

## Target Build Outputs

```
dist/
  cjs/       - CommonJS (Node.js compatibility)
  esm/       - ES2022 modules (modern)
  types/     - Type definitions
```

## Usage Examples

```bash
/typedi-update-build --analyze
/typedi-update-build --rollup
/typedi-update-build --esbuild
/typedi-update-build --tsconfig
/typedi-update-build --package
/typedi-update-build --all
```

## Options

| Option       | Description                         |
| ------------ | ----------------------------------- |
| `--analyze`  | Analyze current build setup         |
| `--rollup`   | Update Rollup to v4 with new config |
| `--esbuild`  | Add ESBuild for faster dev builds   |
| `--tsconfig` | Consolidate tsconfig files          |
| `--package`  | Update package.json exports         |
| `--all`      | Apply all build updates             |

## Implementation Steps

### Step 1: Update Dependencies

```json
{
  "devDependencies": {
    "rollup": "^4.0.0",
    "@rollup/plugin-typescript": "^11.0.0",
    "@rollup/plugin-node-resolve": "^15.0.0",
    "esbuild": "^0.19.0",
    "typescript": "^5.5.0",
    "ts-node": "^10.9.2",
    "rimraf": "^5.0.0"
  }
}
```

### Step 2: Consolidate tsconfig

Merge multiple configs into:

```
tsconfig.json           - Base config
tsconfig.build.json     - Production build
tsconfig.test.json      - Test configuration
```

### Step 3: New Rollup Config

```javascript
// rollup.config.mjs
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/cjs/index.js',
        format: 'cjs',
        exports: 'named',
      },
      {
        file: 'dist/esm/index.js',
        format: 'esm',
      },
    ],
    plugins: [resolve(), typescript({ tsconfig: './tsconfig.build.json' })],
  },
];
```

### Step 4: Update package.json

```json
{
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "require": "./dist/cjs/index.js",
      "import": "./dist/esm/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "npm run build:clean && npm run build:rollup",
    "build:clean": "rimraf dist",
    "build:rollup": "rollup -c",
    "build:types": "tsc --project tsconfig.build.json --emitDeclarationOnly",
    "dev": "ts-node src/index.ts"
  }
}
```

### Step 5: Add ESBuild for Dev

```json
{
  "scripts": {
    "dev": "esbuild src/index.ts --platform=node --format=cjs --watch",
    "build:fast": "esbuild src/index.ts --bundle --minify"
  }
}
```

## Build Performance Comparison

| Task       | Current | With ESBuild | Improvement |
| ---------- | ------- | ------------ | ----------- |
| Full build | ~10s    | ~2s          | 5x faster   |
| Watch mode | ~5s     | ~100ms       | 50x faster  |
| Type check | ~8s     | ~8s          | Same        |

## Related Files

```
package.json
rollup.config.js
tsconfig*.json
.github/workflows/ci.yml
```

## Breaking Changes

1. **Import paths** - May need adjustment for ESM
2. **Conditional exports** - New import syntax for users
3. **File structure** - `dist/` instead of multiple folders

## Migration Guide for Users

### Before

```javascript
const { Container } = require('typedi');
```

### After

```javascript
// CJS
const { Container } = require('typedi');

// ESM
import { Container } from 'typedi';
```

## CI/CD Updates

Update GitHub Actions to use new build:

```yaml
- name: Build
  run: npm run build

- name: Type Check
  run: tsc --noEmit
```
