import { TypeDIError } from './typedi-error.base';
import { ServiceIdentifier } from '../types/service-identifier.type';
import { Token } from '../token.class';

/**
 * Thrown when a circular dependency is detected during service resolution.
 *
 * Error code: TDI-002
 * @docs https://typedi.io/errors/TDI-002
 */
export class CircularDependencyError extends TypeDIError {
  public name = 'CircularDependencyError';

  /** Normalized identifier name used in the error message. */
  private normalizedIdentifier: string = '<UNKNOWN_IDENTIFIER>';

  /** Stack of services being resolved when the circular dependency was detected. */
  public resolutionPath: ServiceIdentifier[] = [];

  constructor(identifier: ServiceIdentifier, resolutionPath: ServiceIdentifier[] = []) {
    const normalizedIdentifier = (() => {
      if (identifier === null || identifier === undefined) {
        return '<UNKNOWN_IDENTIFIER>';
      }
      if (typeof identifier === 'string') {
        return identifier;
      } else if (identifier instanceof Token) {
        return `Token<${identifier.name || 'UNSET_NAME'}>`;
      } else if (identifier && (identifier.name || identifier.prototype?.name)) {
        return (
          identifier.name ||
          (identifier.prototype as { name: string })?.name ||
          'UnknownService'
        );
      }
      return String(identifier);
    })();

    const pathString = resolutionPath
      .map(id => {
        if (typeof id === 'string') return `"${id}"`;
        if (id instanceof Token) return `Token<${id.name || 'UNSET_NAME'}>`;
        return id.name || '(unknown class)';
      })
      .join(' -> ');

    const message = `Circular dependency detected for service "${normalizedIdentifier}". ` +
      `Resolution path: ${pathString} -> "${normalizedIdentifier}". ` +
      `Break the circular dependency by using lazy injection or refactoring your code.`;

    super(message, {
      code: 'TDI-002',
      suggestion: `Break the circular dependency by using lazy injection with @Inject(() => Service) or refactoring your code to use an intermediary service.`,
      helpUrl: 'https://typedi.io/errors/TDI-002',
    });

    this.normalizedIdentifier = normalizedIdentifier;
    this.resolutionPath = resolutionPath;
  }
}
