import { TypeDIError } from './typedi-error.base';

/**
 * Thrown when an operation is attempted on a disposed container.
 *
 * Error code: TDI-005
 * @docs https://typedi.io/errors/TDI-005
 */
export class ContainerDisposedError extends TypeDIError {
  public name = 'ContainerDisposedError';

  /** Container ID that was disposed */
  public containerId: string;

  constructor(containerId: string) {
    const message = `Cannot perform operation on disposed container "${containerId}". ` +
      `The container has been disposed and can no longer be used. Create a new container instance if needed.`;

    super(message, {
      code: 'TDI-005',
      suggestion: `Create a new container instance or check your disposal logic.`,
      helpUrl: 'https://typedi.io/errors/TDI-005',
    });

    this.containerId = containerId;
  }
}
