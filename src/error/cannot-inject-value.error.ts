import { TypeDIError } from './typedi-error.base';
import { Constructable } from '../types/constructable.type';

/**
 * Thrown when DI cannot inject value into property decorated by @Inject decorator.
 *
 * Error code: TDI-003
 * @docs https://typedi.io/errors/TDI-003
 */
export class CannotInjectValueError extends TypeDIError {
  public name = 'CannotInjectValueError';

  constructor(
    private target: Constructable<unknown>,
    private propertyName: string
  ) {
    const message = `Cannot inject value into "${target.name}.${propertyName}".`;

    super(message, {
      code: 'TDI-003',
      suggestion:
        `Make sure reflect-metadata is imported and the service is registered. ` +
        `Don't use interfaces without service tokens as injection values.`,
      helpUrl: 'https://typedi.io/errors/TDI-003',
    });
  }
}
