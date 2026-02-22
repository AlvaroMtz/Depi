/**
 * Determines whether a decorator argument is a TC39 Stage 3 decorator context
 * (ClassDecoratorContext, ClassFieldDecoratorContext, etc.) vs a legacy TypeScript
 * experimentalDecorators target/propertyKey pair.
 *
 * Stage 3 context objects always have a `kind` property (string).
 * Legacy decorator second arguments are either undefined (class), a string (method/property), or a number (parameter).
 */
export function isStage3Context(arg: unknown): arg is object & { kind: string } {
  return typeof arg === 'object' && arg !== null && 'kind' in arg;
}
