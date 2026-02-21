import { ServiceIdentifier } from '../types/service-identifier.type';
import { Token } from '../token.class';

/**
 * Thrown when a service registration fails.
 */
export class ContainerRegistrationError extends Error {
  public name = 'ContainerRegistrationError';

  /** Normalized identifier name used in the error message. */
  private normalizedIdentifier: string = '<UNKNOWN_IDENTIFIER>';

  /** Container ID where the registration failed */
  public containerId: string;

  /** Reason for the registration failure */
  public reason: string;

  get message(): string {
    return (
      `Failed to register service "${this.normalizedIdentifier}" in container "${this.containerId}". ` +
      `Reason: ${this.reason}`
    );
  }

  constructor(containerId: string, identifier: ServiceIdentifier, reason: string) {
    super();

    this.containerId = containerId;
    this.reason = reason;

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
