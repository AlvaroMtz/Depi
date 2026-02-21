# sc:typedi-test

## Description

Testing framework modernization skill for TypeDI. Updates Jest, enables strict mode in tests, improves coverage, and modernizes test practices.

## When to Use

Use this skill when you need to:

- Update Jest version (27.5.1 → 29.x+)
- Enable strict mode in test tsconfig
- Improve test coverage
- Add integration tests
- Fix failing tests after upgrades
- Modernize test patterns

## Current Test Stack

| Tool        | Current Version | Target Version |
| ----------- | --------------- | -------------- |
| Jest        | 27.5.1          | 29.x+          |
| ts-jest     | 27.1.5          | 29.x+          |
| @types/jest | 27.5.0          | 29.x+          |

## Test Configuration Issues

### Current tsconfig.test.json

```json
{
  "strict": false, // ❌ Should be true
  "sourceMap": false, // ❌ Should be true for debugging
  "noImplicitAny": false // ❌ Should be true
}
```

### Current jest.config.js

```javascript
{
  coverageThreshold: {
    global: {
      statements: 0,   // ❌ Should be higher
      branches: 0,
      functions: 0,
      lines: 0
    }
  }
}
```

## Usage Examples

```bash
/typedi-test --analyze
/typedi-test --upgrade
/typedi-test --strict
/typedi-test --coverage
/typedi-test --add-integration
/typedi-test --all
```

## Options

| Option              | Description                   |
| ------------------- | ----------------------------- |
| `--analyze`         | Analyze current test setup    |
| `--upgrade`         | Upgrade Jest and dependencies |
| `--strict`          | Enable strict mode in tests   |
| `--coverage`        | Improve coverage thresholds   |
| `--add-integration` | Add integration test suite    |
| `--all`             | Apply all test updates        |

## Implementation Steps

### Step 1: Update Dependencies

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0",
    "jest-environment-node": "^29.7.0"
  }
}
```

### Step 2: New jest.config.js

```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/test/**/*.spec.ts', '**/test/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/types/**'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
        useESM: false,
      },
    ],
  },
};
```

### Step 3: Update tsconfig.test.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "types": ["node", "jest"]
  },
  "include": ["test/**/*.ts", "src/**/*.ts"]
}
```

### Step 4: Update Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

## Test Structure

```
test/
├── unit/
│   ├── container-instance.spec.ts
│   ├── service.spec.ts
│   └── inject.spec.ts
├── integration/
│   ├── end-to-end.spec.ts
│   ├── inheritance.spec.ts
│   └── circular-deps.spec.ts
└── fixtures/
    ├── services/
    └── containers/
```

## Test Cases to Add

### Integration Tests

```typescript
describe('Container Integration', () => {
  describe('Circular Dependencies', () => {
    it('should handle direct circular dependencies', () => {});
    it('should handle indirect circular dependencies', () => {});
    it('should provide helpful error for circular deps', () => {});
  });

  describe('Async Initialization', () => {
    it('should support async factory functions', () => {});
    it('should wait for async services', () => {});
  });

  describe('Container Inheritance', () => {
    it('should inherit handlers from parent', () => {});
    it('should create isolated scopes', () => {});
  });
});
```

## Performance Benchmarks

Add performance test suite:

```typescript
describe('Performance', () => {
  it('should resolve 1000 services in <10ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      container.get(Service);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(10);
  });
});
```

## Coverage Goals

| Area       | Current | Target |
| ---------- | ------- | ------ |
| Statements | Unknown | 80%+   |
| Branches   | Unknown | 75%+   |
| Functions  | Unknown | 80%+   |
| Lines      | Unknown | 80%+   |

## Related Files

```
jest.config.js
tsconfig.test.json
package.json (scripts)
test/**/*.spec.ts
.github/workflows/test.yml
```

## CI/CD Integration

Update GitHub Actions:

```yaml
- name: Run Tests
  run: npm run test:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Known Test Issues to Fix

1. **Strict mode failures** - Fix type errors when enabling strict
2. **Flaky tests** - Identify and fix timing-dependent tests
3. **Missing edge cases** - Add tests for error conditions
4. **Async service tests** - Add async initialization tests
