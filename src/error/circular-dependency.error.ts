import { ServiceIdentifier } from '../types/service-identifier.type';
import { Token } from '../token.class';

/**
 * Thrown when a circular dependency is detected during service resolution.
 */
export class CircularDependencyError extends Error {
  public name = 'CircularDependencyError';

  /** Normalized identifier name used in the error message. */
  private normalizedIdentifier: string = '<UNKNOWN_IDENTIFIER>';

  /** Stack of services being resolved when the circular dependency was detected. */
  public resolutionPath: ServiceIdentifier[] = [];

  get message(): string {
    const pathString = this.resolutionPath
      .map(id => {
        if (typeof id === 'string') return `"${id}"`;
        if (id instanceof Token) return `Token<${id.name || 'UNSET_NAME'}>`;
        return id.name || '(unknown class)';
      })
      .join(' -> ');

    return (
      `Circular dependency detected for service "${this.normalizedIdentifier}". ` +
      `Resolution path: ${pathString} -> "${this.normalizedIdentifier}". ` +
      `Break the circular dependency by using lazy injection or refactoring your code.`
    );
  }

  constructor(identifier: ServiceIdentifier, resolutionPath: ServiceIdentifier[] = []) {
    super();

    this.resolutionPath = resolutionPath;

    if (typeof identifier === 'string') {
      this.normalizedIdentifier = identifier;
    } else if (identifier instanceof Token) {
      this.normalizedIdentifier = `Token<${identifier.name || 'UNSET_NAME'}>`;
    } else if (identifier && (identifier.name || identifier.prototype?.name)) {
      this.normalizedIdentifier =
        `MaybeConstructable<${identifier.name}>` ||
        `MaybeConstructable<${(identifier.prototype as { name: string })?.name}>`;
    }
  }
}
