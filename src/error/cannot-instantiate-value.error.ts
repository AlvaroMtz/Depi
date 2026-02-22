import { TypeDIError } from './typedi-error.base';
import { ServiceIdentifier } from '../types/service-identifier.type';
import { Token } from '../token.class';

/**
 * Thrown when DI cannot instantiate a service.
 *
 * Error code: TDI-004
 * @docs https://typedi.io/errors/TDI-004
 */
export class CannotInstantiateValueError extends TypeDIError {
  public name = 'CannotInstantiateValueError';

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
      `Cannot instantiate the requested value for the "${normalizedIdentifier}" identifier. ` +
      `The related metadata doesn't contain a factory or a type to instantiate.`;

    super(message, {
      code: 'TDI-004',
      suggestion:
        `Make sure the service is registered with a "type" or "factory" option. ` +
        `Use "@Service()" decorator or "Container.set({ id, type: MyClass })".`,
      helpUrl: 'https://typedi.io/errors/TDI-004',
    });

    this.normalizedIdentifier = normalizedIdentifier;
  }
}
