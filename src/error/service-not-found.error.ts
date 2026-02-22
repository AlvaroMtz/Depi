import { TypeDIError } from './typedi-error.base';
import { ServiceIdentifier } from '../types/service-identifier.type';
import { Token } from '../token.class';

/**
 * Thrown when requested service was not found.
 *
 * Error code: TDI-001
 * @docs https://typedi.io/errors/TDI-001
 */
export class ServiceNotFoundError extends TypeDIError {
  public name = 'ServiceNotFoundError';

  /** Normalized identifier name used in the error message. */
  private normalizedIdentifier: string = '<UNKNOWN_IDENTIFIER>';

  constructor(identifier: ServiceIdentifier) {
    let normalizedIdentifier: string;

    if (identifier === null || identifier === undefined) {
      normalizedIdentifier = '<UNKNOWN_IDENTIFIER>';
    } else if (typeof identifier === 'string') {
      normalizedIdentifier = identifier;
    } else if (identifier instanceof Token) {
      normalizedIdentifier = `Token<${identifier.name || 'UNSET_NAME'}>`;
    } else if (identifier && (identifier.name || identifier.prototype?.name)) {
      normalizedIdentifier =
        identifier.name || (identifier.prototype as { name: string })?.name || '<UNKNOWN_IDENTIFIER>';
    } else {
      normalizedIdentifier = String(identifier);
    }

    const message =
      `Service with "${normalizedIdentifier}" identifier was not found in the container. ` +
      `Register it before usage via explicitly calling the "Container.set" function or using the "@Service()" decorator.`;

    super(message, {
      code: 'TDI-001',
      suggestion: `Register it before usage via "Container.set()" or use the "@Service()" decorator.`,
      helpUrl: 'https://typedi.io/errors/TDI-001',
    });

    this.normalizedIdentifier = normalizedIdentifier;
  }
}
