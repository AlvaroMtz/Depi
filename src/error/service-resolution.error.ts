import { TypeDIError } from './typedi-error.base';
import { ServiceIdentifier } from '../types/service-identifier.type';
import { Token } from '../token.class';

/**
 * Thrown when service resolution fails for reasons other than "not found".
 * Use ServiceNotFoundError for missing services.
 *
 * Error code: TDI-007
 * @docs https://typedi.io/errors/TDI-007
 */
export class ServiceResolutionError extends TypeDIError {
  public name = 'ServiceResolutionError';

  /** Normalized identifier name used in the error message. */
  private normalizedIdentifier: string = '<UNKNOWN_IDENTIFIER>';

  /** Container ID where the resolution failed */
  public containerId: string;

  /** Underlying error that caused the resolution failure */
  public cause?: Error;

  constructor(containerId: string, identifier: ServiceIdentifier, cause?: Error) {
    let normalizedIdentifier: string;

    if (typeof identifier === 'string') {
      normalizedIdentifier = identifier;
    } else if (identifier instanceof Token) {
      normalizedIdentifier = `Token<${identifier.name || 'UNSET_NAME'}>`;
    } else if (identifier && (identifier.name || identifier.prototype?.name)) {
      normalizedIdentifier =
        `MaybeConstructable<${identifier.name}>` ||
        `MaybeConstructable<${(identifier.prototype as { name: string })?.name}>`;
    } else {
      normalizedIdentifier = String(identifier);
    }

    let message = `Failed to resolve service "${normalizedIdentifier}" in container "${containerId}".`;
    if (cause) {
      message += ` Underlying error: ${cause.message}`;
    }

    super(message, {
      code: 'TDI-007',
      suggestion: cause
        ? `Fix the underlying error and ensure the service is properly registered.`
        : `Check that the service is registered and its dependencies can be resolved.`,
      helpUrl: 'https://typedi.io/errors/TDI-007',
    });

    this.containerId = containerId;
    this.cause = cause;
    this.normalizedIdentifier = normalizedIdentifier;
  }
}
