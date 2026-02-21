# sc:typedi-analyze

## Description

Comprehensive analysis skill for the TypeDI dependency injection library. Performs deep codebase analysis to identify issues, technical debt, and modernization opportunities.

## When to Use

Use this skill when you need to:

- Analyze the current state of TypeDI codebase
- Identify technical debt and deprecated patterns
- Understand the impact of changes across the codebase
- Find circular dependencies or architectural issues
- Analyze service metadata and container behavior
- Review error handling patterns

## Key Analysis Areas

### Core Components

- `ContainerInstance` - Main DI container (493 lines)
- `ContainerRegistry` - Container management
- `Service` decorator - Registration logic
- `Inject` decorator - Injection logic
- `Token` class - Service identification

### Common Issues to Detect

1. **Deprecated APIs** - Old Node.js APIs, outdated patterns
2. **TODO comments** - Incomplete implementations (marked in code)
3. **Circular dependencies** - Service reference cycles
4. **Inheritance issues** - Container inheritance limitations
5. **Type safety** - Missing type definitions, any types
6. **Error handling** - Inconsistent error patterns

## Usage Examples

```bash
/typedi-analyze --scope=container
/typedi-analyze --focus=decorators
/typedi-analyze --find=circular-deps
/typedi-analyze --review=file:src/container-instance.class.ts
```

## Options

| Option     | Description                                      |
| ---------- | ------------------------------------------------ |
| `--scope`  | Focus area: container, decorators, errors, types |
| `--focus`  | Specific component to analyze                    |
| `--find`   | Issue type: circular-deps, todos, deprecated     |
| `--review` | Specific file path to review                     |

## Output Format

The analysis returns:

1. Executive summary of findings
2. Detailed issues with file:line references
3. Impact assessment (low/medium/high)
4. Recommended actions with priorities
5. Related files that may need updates
