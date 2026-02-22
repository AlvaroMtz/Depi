# Packaging Specification

## Purpose

This spec defines the packaging and distribution requirements for TypeDI v1.0.0. It covers the `package.json` structure, conditional exports for ESM/CJS consumers, peer dependency declarations, UMD bundle naming, and build target modernization. All requirements in this spec are non-breaking with respect to the public API.

## Status

**Phase**: Fase 1 — v1.0.0
**State**: New spec (no prior packaging spec exists)

---

## Requirements

### Requirement: Conditional Exports Map

The `package.json` MUST include a top-level `"exports"` field that maps the package root (`"."`) to separate ESM and CJS entry points using the `"import"` and `"require"` conditions respectively.

Each condition MUST expose both a JavaScript entry point and a TypeScript types entry point.

The `"exports"` map MUST be the authoritative resolution path. The legacy `"main"`, `"module"`, and `"typings"` fields SHOULD be retained for backward compatibility with tooling that does not support `"exports"` (e.g., Jest < 28, older bundlers), but they MUST NOT conflict with the `"exports"` map.

The package MUST set `"type": "commonjs"` so that `.js` files inside `cjs/` are interpreted as CommonJS by Node.js, and ESM output MUST use `.mjs` extension or reside in a directory covered by a `package.json` with `"type": "module"`.

#### Scenario: ESM consumer resolves correct entry

- GIVEN a consumer project configured with `"type": "module"` or using a bundler in ESM mode
- WHEN they `import { Container } from 'typedi'`
- THEN the runtime resolves to the `esm2015/index.js` entry point
- AND the TypeScript compiler resolves types from `types/index.d.ts`

#### Scenario: CJS consumer resolves correct entry

- GIVEN a consumer project using CommonJS (`require`)
- WHEN they `const { Container } = require('typedi')`
- THEN the runtime resolves to the `cjs/index.js` entry point
- AND the TypeScript compiler resolves types from `types/index.d.ts`

#### Scenario: publint validation passes without warnings

- GIVEN the published package tarball (via `npm pack`)
- WHEN validated with `publint` or `are-the-types-wrong`
- THEN zero warnings or errors are reported for the `"exports"` field
- AND both ESM and CJS paths exist in the tarball

#### Scenario: Sub-path imports are blocked

- GIVEN a consumer who attempts to import a sub-path (e.g., `typedi/internal`)
- WHEN that sub-path is not listed in the `"exports"` map
- THEN the import MUST fail with a `Package subpath not defined` error in Node.js >=12

---

### Requirement: Engine Constraint

The `package.json` MUST declare an `"engines"` field restricting Node.js to `>=18.0.0`.

This constraint exists because:

- `Symbol.asyncDispose` is available natively in Node.js >=20.4 and can be polyfilled in Node.js 18 via the `--harmony-explicit-resource-management` flag or via the `disposablestack` polyfill.
- Node.js 18 is the minimum active LTS at time of v1.0.0 release.
- ES2022 build target output (async/await, optional chaining, logical assignment) requires a modern runtime.

The CI pipeline MUST verify the package on Node.js 18, 20, and 22 LTS.

#### Scenario: Package installs on supported Node.js

- GIVEN a machine running Node.js 18.x, 20.x, or 22.x
- WHEN the consumer runs `npm install typedi`
- THEN the installation succeeds without engine warnings

#### Scenario: Package warns or fails on unsupported Node.js

- GIVEN a machine running Node.js 16.x or lower
- WHEN the consumer runs `npm install typedi`
- THEN npm emits an engine compatibility warning (or error if `--engine-strict` is set)

---

### Requirement: reflect-metadata as Optional Peer Dependency

`reflect-metadata` MUST be moved from `devDependencies` to `peerDependencies`.

The peer dependency entry MUST be declared as **optional** via `peerDependenciesMeta`:

```json
"peerDependenciesMeta": {
  "reflect-metadata": {
    "optional": true
  }
}
```

The accepted version range MUST be `"^0.1.0 || ^0.2.0"` to support both the legacy and the current major.

The package MUST NOT `import` or `require` `reflect-metadata` unconditionally in its runtime code. Any usage of `Reflect.metadata` / `Reflect.getMetadata` MUST be guarded by a runtime availability check.

#### Scenario: Consumer without reflect-metadata (Stage 3 path — Fase 2)

- GIVEN a consumer who has NOT installed `reflect-metadata`
- AND the consumer uses Stage 3 decorators (Fase 2 opt-in)
- WHEN they import and use TypeDI
- THEN no `Cannot find module 'reflect-metadata'` error is thrown
- AND dependency injection works correctly via Stage 3 metadata

#### Scenario: Consumer with reflect-metadata (legacy path)

- GIVEN a consumer who HAS installed `reflect-metadata` (any version matching the range)
- AND the consumer uses `experimentalDecorators: true`
- WHEN they import and use TypeDI
- THEN TypeDI picks up the installed `reflect-metadata` via the guarded check
- AND all existing `@Inject()` / `@Service()` behaviors work as before

#### Scenario: npm install does not install reflect-metadata automatically

- GIVEN a fresh `npm install typedi`
- WHEN no explicit `reflect-metadata` is listed in the consumer's `package.json`
- THEN `reflect-metadata` is NOT installed automatically
- AND npm does not emit a peer dependency error (only an optional peer warning if any)

---

### Requirement: UMD Bundle Name

The Rollup-generated UMD bundle MUST export the global variable `TypeDI` (not `ClassTransformer` or any other name).

The UMD output file MUST be named `typedi.umd.js` (or `typedi.umd.min.js` for the minified variant) and located in the `dist/` or `build/` directory.

#### Scenario: Browser consumer loads UMD bundle via CDN

- GIVEN a browser environment that loads the UMD bundle via a `<script>` tag
- WHEN the bundle is loaded
- THEN `window.TypeDI` (or `globalThis.TypeDI`) is populated with the library exports
- AND `window.ClassTransformer` is NOT set

#### Scenario: UMD bundle name verified in CI

- GIVEN the UMD bundle output file
- WHEN its first 100 lines are inspected for the `name:` declaration
- THEN the string `'TypeDI'` is present
- AND the string `'ClassTransformer'` is absent

---

### Requirement: Build Target Modernization

The TypeScript compilation target for ESM and CJS outputs MUST be set to `ES2022` or higher.

The `tsconfig` files governing production builds (`tsconfig.prod.cjs.json`, `tsconfig.prod.esm2015.json`) MUST NOT use `"target": "ES5"` or `"target": "ES2015"` for primary outputs.

A legacy ES5 bundle MAY be produced as an additional artifact for backward compatibility, but it MUST NOT be the default `"exports"` resolution path.

The `"lib"` setting in production tsconfigs MUST include at minimum `["ES2022", "ESNext.Disposable"]` to support `Symbol.asyncDispose` typing.

#### Scenario: No ES5 syntax in primary outputs

- GIVEN the primary CJS output (`cjs/index.js`) and ESM output (`esm2015/index.js`)
- WHEN inspected with a JavaScript parser or `grep`
- THEN no ES5-isms (e.g., `var `, `function (...) {` for arrow functions, `__awaiter`, `__generator` helpers) are present in the primary builds

#### Scenario: TypeScript compilation succeeds with modern target

- GIVEN the production tsconfig with `"target": "ES2022"`
- WHEN `tsc --project tsconfig.prod.cjs.json` is executed
- THEN compilation completes with zero errors
- AND the output files contain native `async/await`, optional chaining, and logical assignment operators

---

### Requirement: sideEffects Declaration

The `package.json` MUST declare `"sideEffects": false` so that bundlers (webpack, Rollup, esbuild) can tree-shake unused exports.

#### Scenario: Tree-shaking works for bundlers

- GIVEN a consumer project that imports only `Container` from TypeDI
- WHEN the consumer's bundler (with `"sideEffects": false` honored) creates a production bundle
- THEN decorator-only code paths and unused service classes are eliminated from the output
