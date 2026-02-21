import { ServiceIdentifier } from '../types/service-identifier.type';
import { Token } from '../token.class';

/**
 * Thrown when service resolution fails for reasons other than "not found".
 * Use ServiceNotFoundError for missing services.
 */
export class ServiceResolutionError extends Error {
  public name = 'ServiceResolutionError';

  /** Normalized identifier name used in the error message. */
  private normalizedIdentifier: string = '<UNKNOWN_IDENTIFIER>';

  /** Container ID where the resolution failed */
  public containerId: string;

  /** Underlying error that caused the resolution failure */
  public cause?: Error;

  get message(): string {
    let message = `Failed to resolve service "${this.normalizedIdentifier}" in container "${this.containerId}".`;

    if (this.cause) {
      message += ` Underlying error: ${this.cause.message}`;
    }

    return message;
  }

  constructor(containerId: string, identifier: ServiceIdentifier, cause?: Error) {
    super();

    this.containerId = containerId;
    this.cause = cause;

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
