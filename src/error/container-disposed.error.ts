/**
 * Thrown when an operation is attempted on a disposed container.
 */
export class ContainerDisposedError extends Error {
  public name = 'ContainerDisposedError';

  /** Container ID that was disposed */
  public containerId: string;

  get message(): string {
    return (
      `Cannot perform operation on disposed container "${this.containerId}". ` +
      `The container has been disposed and can no longer be used. ` +
      `Create a new container instance if needed.`
    );
  }

  constructor(containerId: string) {
    super();
    this.containerId = containerId;
  }
}
