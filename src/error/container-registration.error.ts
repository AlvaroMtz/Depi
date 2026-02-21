import { TypeDIError } from './typedi-error.base';
import { ServiceIdentifier } from '../types/service-identifier.type';
import { Token } from '../token.class';

/**
 * Thrown when a service registration fails.
 *
 * Error code: TDI-006
 * @docs https://typedi.io/errors/TDI-006
 */
export class ContainerRegistrationError extends TypeDIError {
  public name = 'ContainerRegistrationError';

  /** Normalized identifier name used in the error message. */
  private normalizedIdentifier: string = '<UNKNOWN_IDENTIFIER>';

  /** Container ID where the registration failed */
  public containerId: string;

  /** Reason for the registration failure */
  public reason: string;

  constructor(containerId: string, identifier: ServiceIdentifier, reason: string) {
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

    const message = `Failed to register service "${normalizedIdentifier}" in container "${containerId}". Reason: ${reason}`;

    super(message, {
      code: 'TDI-006',
      suggestion: `Check that the service options are valid and the container is not disposed.`,
      helpUrl: 'https://typedi.io/errors/TDI-006',
    });

    this.containerId = containerId;
    this.reason = reason;
    this.normalizedIdentifier = normalizedIdentifier;
  }
}
