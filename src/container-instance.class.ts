import { ServiceNotFoundError } from './error/service-not-found.error';
import { CannotInstantiateValueError } from './error/cannot-instantiate-value.error';
import { CircularDependencyError } from './error/circular-dependency.error';
import { Token } from './token.class';
import { Constructable } from './types/constructable.type';
import { ServiceIdentifier } from './types/service-identifier.type';
import { ServiceMetadata } from './interfaces/service-metadata.interface';
import { ServiceOptions } from './interfaces/service-options.interface';
import { EMPTY_VALUE } from './empty.const';
import { ContainerIdentifier } from './types/container-identifier.type';
import { Handler } from './interfaces/handler.interface';
import { ContainerRegistry } from './container-registry.class';
import { ContainerScope } from './types/container-scope.type';
import { ContainerOptions } from './interfaces/container-options.interface';

/**
 * TypeDI can have multiple containers.
 * One container is ContainerInstance.
 *
 * Implements AsyncDisposable to support modern resource cleanup patterns.
 * You can use `await using` statement to automatically dispose containers:
 *
 * @example
 * ```ts
 * {
 *   await using container = new ContainerInstance('temp');
 *   container.set({ id: 'service', type: Service });
 *   // container is automatically disposed at the end of scope
 * }
 * ```
 */
export class ContainerInstance implements AsyncDisposable {
  /** Container instance id. */
  public readonly id!: ContainerIdentifier;

  /**
   * Symbol.asyncDispose implementation for explicit disposal and `await using` statements.
   * This is an alias for the dispose() method.
   */
  [Symbol.asyncDispose](): Promise<void> {
    return this.dispose();
  }

  /** Metadata for all registered services in this container. */
  private metadataMap: Map<ServiceIdentifier, ServiceMetadata<unknown>> = new Map();

  /**
   * Services registered with 'multiple: true' are saved as simple services
   * with a generated token and the mapping between the original ID and the
   * generated one is stored here. This is handled like this to allow simplifying
   * the inner workings of the service instance.
   */
  private multiServiceIds: Map<ServiceIdentifier, { tokens: Token<unknown>[]; scope: ContainerScope }> = new Map();

  /**
   * All registered handlers. The @Inject() decorator uses handlers internally to mark a property for injection.
   **/
  private readonly handlers: Handler[] = [];

  /**
   * Parent container for inheritance support.
   * When a container has a parent, it inherits handlers from the parent.
   */
  private _parent?: ContainerInstance;

  /**
   * Tracks services currently being resolved to detect circular dependencies.
   */
  private resolutionStack: ServiceIdentifier[] = [];

  /**
   * Indicates if the container has been disposed or not.
   * Any function call should fail when called after being disposed.
   */
  private disposed: boolean = false;

  /**
   * Container-level options that control lookup behavior.
   */
  private readonly _options: Pick<ContainerOptions, 'lookupStrategy' | 'allowSingletonLookup'>;

  constructor(
    id: ContainerIdentifier,
    parent?: ContainerInstance,
    options?: Partial<Pick<ContainerOptions, 'lookupStrategy' | 'allowSingletonLookup'>>
  ) {
    this.id = id;
    if (parent) {
      this._parent = parent;
    }
    this._options = { lookupStrategy: 'allowLookup', allowSingletonLookup: true, ...options };

    // Don't register in constructor to avoid circular initialization
    // Registration will happen when the container is accessed via ContainerRegistry
  }

  /**
   * Gets the parent container, lazily resolving to defaultContainer for backward compatibility.
   */
  private get parent(): ContainerInstance | undefined {
    if (this._parent !== undefined) {
      return this._parent;
    }

    // For backward compatibility: if no parent is specified and this is not the default container,
    // use the default container as parent
    if (this.id !== 'default') {
      try {
        const defaultContainer = ContainerRegistry.defaultContainer;
        if (defaultContainer !== this) {
          this._parent = defaultContainer;
          return this._parent;
        }
      } catch {
        // ContainerRegistry not yet initialized, ignore
      }
    }

    return undefined;
  }

  /**
   * Registers the container with the ContainerRegistry.
   * This is called separately to avoid circular initialization issues.
   */
  register(): void {
    try {
      ContainerRegistry.registerContainer(this);
    } catch {
      // Already registered or registry not ready, ignore
    }
  }

  /**
   * Gets all handlers for this container, including inherited handlers from parent containers.
   * Uses iterative approach to avoid stack overflow with deep hierarchies.
   */
  private getAllHandlers(): Handler[] {
    const result: Handler[] = [...this.handlers];
    let current = this.parent;

    // Collect handlers from all containers in the hierarchy
    // Use a simple iteration - no recursion to avoid stack overflow
    const seen = new Set<string>();
    while (current) {
      const key = typeof current.id === 'string' ? current.id : String(current.id);
      if (seen.has(key)) break; // Prevent circular references
      seen.add(key);

      result.push(...current.handlers);
      current = current.parent;
    }

    return result;
  }

  /**
   * Creates a child container that inherits handlers from this container.
   *
   * @param childId The unique identifier for the child container
   * @returns A new child container instance
   */
  public createChild(childId: ContainerIdentifier): ContainerInstance {
    this.throwIfDisposed();

    const child = new ContainerInstance(childId, this);
    child.register();
    return child;
  }

  /**
   * Checks if the service with given name or type is registered service container.
   * Optionally, parameters can be passed in case if instance is initialized in the container for the first time.
   */
  public has<T = unknown>(identifier: ServiceIdentifier<T>): boolean {
    this.throwIfDisposed();

    return !!this.metadataMap.has(identifier) || !!this.multiServiceIds.has(identifier);
  }

  /**
   * Retrieves the service with given name or type from the service container.
   * Optionally, parameters can be passed in case if instance is initialized in the container for the first time.
   */
  public get<T = unknown>(identifier: ServiceIdentifier<T>): T {
    this.throwIfDisposed();

    /**
     * When lookupStrategy is 'localOnly', any cross-container lookup is forbidden.
     * We still honour allowSingletonLookup for the normal 'allowLookup' strategy.
     */
    const allowExternalLookup = this._options.lookupStrategy !== 'localOnly' && this._options.allowSingletonLookup;
    const global = allowExternalLookup ? ContainerRegistry.defaultContainer.metadataMap.get(identifier) : undefined;
    const local = this.metadataMap.get(identifier);
    /** If the service is registered as global we load it from there, otherwise we use the local one. */
    const metadata = global?.scope === 'singleton' ? global : local;

    /** This should never happen as multi services are masked with custom token in Container.set. */
    if (metadata && metadata.multiple === true) {
      throw new Error(`Cannot resolve multiple values for ${String(identifier)} service!`);
    }

    /** Otherwise it's returned from the current container. */
    if (metadata) {
      // Warn if trying to get an async service synchronously
      if (metadata.async) {
        console.warn(
          `Service "${String(identifier)}" requires async initialization. ` +
            `Use "await Container.getAsync()" instead.`
        );
      }
      return this.getServiceValue(metadata);
    }

    /**
     * If it's the first time requested in the child container we load it from parent and set it.
     * This path is only reachable when allowExternalLookup is true (lookupStrategy !== 'localOnly').
     */
    if (global && this !== ContainerRegistry.defaultContainer) {
      const clonedService = { ...global };
      clonedService.value = EMPTY_VALUE;

      /**
       * We need to immediately set the empty value from the root container
       * to prevent infinite lookup in cyclic dependencies.
       */
      this.set(clonedService);

      const value = this.getServiceValue(clonedService);
      this.set({ ...clonedService, value });

      return value;
    }

    throw new ServiceNotFoundError(identifier);
  }

  /**
   * Asynchronously retrieves and initializes a service.
   * Use this for services with async initialization (factories or lifecycle hooks).
   */
  public async getAsync<T = unknown>(identifier: ServiceIdentifier<T>): Promise<T> {
    this.throwIfDisposed();

    const allowExternalLookup = this._options.lookupStrategy !== 'localOnly' && this._options.allowSingletonLookup;
    const global = allowExternalLookup ? ContainerRegistry.defaultContainer.metadataMap.get(identifier) : undefined;
    const local = this.metadataMap.get(identifier);
    const metadata = global?.scope === 'singleton' ? global : local;

    if (metadata && metadata.multiple === true) {
      throw new Error(`Cannot resolve multiple values for ${String(identifier)} service!`);
    }

    if (metadata) {
      return (await this.getServiceValueAsync(metadata)) as T;
    }

    if (global && this !== ContainerRegistry.defaultContainer) {
      const clonedService = { ...global };
      clonedService.value = EMPTY_VALUE;
      this.set(clonedService);
      const value = await this.getServiceValueAsync(clonedService);
      this.set({ ...clonedService, value });
      return value as T;
    }

    throw new ServiceNotFoundError(identifier);
  }

  /**
   * Initialize all eager and async services in the container.
   * Call this at application startup to ensure all services are ready.
   */
  public async init(): Promise<void> {
    this.throwIfDisposed();

    const asyncServices: Array<{ id: ServiceIdentifier; metadata: ServiceMetadata }> = [];

    // Collect all services that need initialization
    this.metadataMap.forEach((metadata, id) => {
      if (metadata.eager || metadata.async) {
        asyncServices.push({ id, metadata });
      }
    });

    // Initialize all services concurrently
    await Promise.all(
      asyncServices.map(async ({ id, metadata }) => {
        if (metadata.value === EMPTY_VALUE) {
          const value = metadata.async ? await this.getServiceValueAsync(metadata) : this.getServiceValue(metadata);
          // Update the metadata with the initialized value
          metadata.value = value;
        } else if (metadata.async && metadata.lifecycle?.onInit) {
          // Call onInit if already instantiated
          await metadata.lifecycle.onInit(metadata.value);
        }
      })
    );
  }

  /**
   * Gets all instances registered in the container of the given service identifier.
   * Used when service defined with multiple: true flag.
   */
  public getMany<T = unknown>(identifier: ServiceIdentifier<T>): T[] {
    this.throwIfDisposed();

    const allowExternalLookup = this._options.lookupStrategy !== 'localOnly' && this._options.allowSingletonLookup;
    const globalIdMap = allowExternalLookup
      ? ContainerRegistry.defaultContainer.multiServiceIds.get(identifier)
      : undefined;
    const localIdMap = this.multiServiceIds.get(identifier);

    /**
     * If the service is registered as singleton we load it from default
     * container, otherwise we use the local one.
     */
    if (globalIdMap?.scope === 'singleton') {
      return globalIdMap.tokens.map(generatedId => ContainerRegistry.defaultContainer.get<T>(generatedId));
    }

    if (localIdMap) {
      return localIdMap.tokens.map(generatedId => this.get<T>(generatedId));
    }

    throw new ServiceNotFoundError(identifier);
  }

  /**
   * Sets a value for the given type or service name in the container.
   */
  public set<T = unknown>(serviceOptions: ServiceOptions<T>): this {
    this.throwIfDisposed();

    /**
     * If the service is marked as singleton, we set it in the default container.
     * (And avoid an infinite loop via checking if we are in the default container or not.)
     */
    if (serviceOptions.scope === 'singleton' && ContainerRegistry.defaultContainer !== this) {
      ContainerRegistry.defaultContainer.set(serviceOptions);

      return this;
    }

    const newMetadata: ServiceMetadata<T> = {
      /**
       * Typescript cannot understand that if ID doesn't exists then type must exists based on the
       * typing so we need to explicitly cast this to a `ServiceIdentifier`
       */
      id: ((serviceOptions as any).id || (serviceOptions as any).type) as ServiceIdentifier,
      type: (serviceOptions as ServiceMetadata<T>).type || null,
      factory: (serviceOptions as ServiceMetadata<T>).factory,
      value: (serviceOptions as ServiceMetadata<T>).value || EMPTY_VALUE,
      multiple: serviceOptions.multiple || false,
      eager: serviceOptions.eager || false,
      scope: serviceOptions.scope || 'container',
      /** We allow overriding the above options via the received config object. */
      ...serviceOptions,
      referencedBy: new Map().set(this.id, this),
    };

    /** If the incoming metadata is marked as multiple we mask the ID and continue saving as single value. */
    if (serviceOptions.multiple) {
      const maskedToken = new Token(`MultiMaskToken-${String(newMetadata.id)}`);
      const existingMultiGroup = this.multiServiceIds.get(newMetadata.id);

      if (existingMultiGroup) {
        existingMultiGroup.tokens.push(maskedToken);
      } else {
        this.multiServiceIds.set(newMetadata.id, { scope: newMetadata.scope, tokens: [maskedToken] });
      }

      /**
       * We mask the original metadata with this generated ID, mark the service
       * as  and continue multiple: false and continue. Marking it as
       * non-multiple is important otherwise Container.get would refuse to
       * resolve the value.
       */
      newMetadata.id = maskedToken;
      newMetadata.multiple = false;
    }

    const existingMetadata = this.metadataMap.get(newMetadata.id);

    if (existingMetadata) {
      /** Service already exists, we overwrite it. (This is legacy behavior.) */
      Object.assign(existingMetadata, newMetadata);
    } else {
      /** This service hasn't been registered yet, so we register it. */
      this.metadataMap.set(newMetadata.id, newMetadata);
    }

    /**
     * If the service is eager, we need to create an instance immediately except
     * when the service is also marked as transient. In that case we ignore
     * the eager flag to prevent creating a service what cannot be disposed later.
     *
     * Note: For async services, we don't initialize eagerly here - the user
     * should call Container.init() to initialize all eager services.
     */
    if (newMetadata.eager && newMetadata.scope !== 'transient' && !newMetadata.async) {
      this.get(newMetadata.id);
    }

    return this;
  }

  /**
   * Removes services with a given service identifiers.
   */
  public remove(identifierOrIdentifierArray: ServiceIdentifier | ServiceIdentifier[]): this {
    this.throwIfDisposed();

    if (Array.isArray(identifierOrIdentifierArray)) {
      identifierOrIdentifierArray.forEach(id => this.remove(id));
    } else {
      const serviceMetadata = this.metadataMap.get(identifierOrIdentifierArray);

      if (serviceMetadata) {
        this.disposeServiceInstance(serviceMetadata);
        this.metadataMap.delete(identifierOrIdentifierArray);
      }
    }

    return this;
  }

  /**
   * Gets a separate container instance for the given instance id.
   *
   * @deprecated Use `createChild()` for child containers or create ContainerInstance directly.
   * This method will be removed in v1.0.0.
   *
   * @deprecated Auto-creating containers is deprecated and will be removed in v1.0.0.
   * Use `new ContainerInstance(id)` or `container.createChild(id)` instead.
   */
  public of(containerId: ContainerIdentifier = 'default'): ContainerInstance {
    this.throwIfDisposed();

    if (containerId === 'default') {
      return ContainerRegistry.defaultContainer;
    }

    if (ContainerRegistry.hasContainer(containerId)) {
      return ContainerRegistry.getContainer(containerId);
    }

    // Auto-creation is deprecated and will be removed in v1.0.0
    // For now, we keep it with a deprecation warning
    const idStr = typeof containerId === 'string' ? containerId : String(containerId);
    console.warn(
      `[TypeDI] Container.of("${idStr}") auto-creation is deprecated and will be removed in v1.0.0. ` +
        `Use 'new ContainerInstance("${idStr}")' or 'container.createChild("${idStr}")' instead.`
    );

    const container = new ContainerInstance(containerId);
    container.register();
    return container;
  }

  /**
   * Registers a new handler.
   */
  public registerHandler(handler: Handler): ContainerInstance {
    this.handlers.push(handler);
    return this;
  }

  /**
   * Helper method that imports given services.
   */
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  public import(services: Function[]): ContainerInstance {
    this.throwIfDisposed();

    return this;
  }

  /**
   * Completely resets the container by removing all previously registered services from it.
   */
  public reset(options: { strategy: 'resetValue' | 'resetServices' } = { strategy: 'resetValue' }): this {
    this.throwIfDisposed();

    switch (options.strategy) {
      case 'resetValue':
        this.metadataMap.forEach(service => this.disposeServiceInstance(service));
        break;
      case 'resetServices':
        this.metadataMap.forEach(service => this.disposeServiceInstance(service));
        this.metadataMap.clear();
        this.multiServiceIds.clear();
        this.handlers.length = 0;
        break;
      default:
        throw new Error('Received invalid reset strategy.');
    }
    return this;
  }

  /**
   * Disposes all services in the container.
   * Calls onDestroy lifecycle hooks if defined.
   */
  public async dispose(): Promise<void> {
    // Collect all dispose promises
    const disposePromises: Promise<void>[] = [];

    this.metadataMap.forEach(service => {
      const promise = this.disposeServiceInstanceAsync(service);
      if (promise) {
        disposePromises.push(promise);
      }
    });

    // Wait for all async disposals to complete
    await Promise.all(disposePromises);

    // Clear the metadata maps
    this.metadataMap.clear();
    this.multiServiceIds.clear();

    /** We mark the container as disposed, forbidding any further interaction with it. */
    this.disposed = true;
  }

  private throwIfDisposed() {
    if (this.disposed) {
      throw new Error('Cannot use container after it has been disposed.');
    }
  }

  /**
   * Gets the value belonging to passed in `ServiceMetadata` instance.
   *
   * - if `serviceMetadata.value` is already set it is immediately returned
   * - otherwise the requested type is resolved to the value saved to `serviceMetadata.value` and returned
   */
  private getServiceValue(serviceMetadata: ServiceMetadata<unknown>): any {
    let value: unknown = EMPTY_VALUE;

    /**
     * If the service value has been set to anything prior to this call we return that value.
     * NOTE: This part builds on the assumption that transient dependencies has no value set ever.
     */
    if (serviceMetadata.value !== EMPTY_VALUE) {
      return serviceMetadata.value;
    }

    /** If both factory and type is missing, we cannot resolve the requested ID. */
    if (!serviceMetadata.factory && !serviceMetadata.type) {
      throw new CannotInstantiateValueError(serviceMetadata.id);
    }

    /**
     * Detect circular dependencies by checking if this service is already being resolved.
     */
    if (this.resolutionStack.includes(serviceMetadata.id)) {
      throw new CircularDependencyError(serviceMetadata.id, [...this.resolutionStack]);
    }

    /** Mark this service as being resolved */
    this.resolutionStack.push(serviceMetadata.id);

    try {
      /**
       * If a factory is defined it takes priority over creating an instance via `new`.
       * The return value of the factory is not checked, we believe by design that the user knows what he/she is doing.
       */
      if (serviceMetadata.factory) {
        /**
         * If we received the factory in the [Constructable<Factory>, "functionName"] format, we need to create the
         * factory first and then call the specified function on it.
         */
        if (serviceMetadata.factory instanceof Array) {
          let factoryInstance;

          try {
            /** Try to get the factory from TypeDI first, if failed, fall back to simply initiating the class. */
            factoryInstance = this.get<any>(serviceMetadata.factory[0]);
          } catch (error) {
            if (error instanceof ServiceNotFoundError) {
              factoryInstance = new serviceMetadata.factory[0]();
            } else {
              throw error;
            }
          }

          value = factoryInstance[serviceMetadata.factory[1]](this, serviceMetadata.id);
        } else {
          /** If only a simple function was provided we simply call it. */
          value = serviceMetadata.factory(this, serviceMetadata.id);
        }
      }

      /**
       * If no factory was provided and only then, we create the instance from the type if it was set.
       */
      if (!serviceMetadata.factory && serviceMetadata.type) {
        const constructableTargetType: Constructable<unknown> = serviceMetadata.type;
        // setup constructor parameters for a newly initialized service
        const paramTypes: unknown[] = (Reflect as any)?.getMetadata('design:paramtypes', constructableTargetType) || [];
        const params = this.initializeParams(constructableTargetType, paramTypes);

        // "extra feature" - always pass container instance as the last argument to the service function
        // this allows us to support javascript where we don't have decorators and emitted metadata about dependencies
        // need to be injected, and user can use provided container to get instances he needs
        params.push(this);

        value = new constructableTargetType(...params);
      }

      /** If this is not a transient service, and we resolved something, then we set it as the value. */
      if (serviceMetadata.scope !== 'transient' && value !== EMPTY_VALUE) {
        serviceMetadata.value = value;
      }

      if (value === EMPTY_VALUE) {
        /** This branch should never execute, but better to be safe than sorry. */
        throw new CannotInstantiateValueError(serviceMetadata.id);
      }

      /**
       * Remove this service from the resolution stack BEFORE applying property handlers.
       * This allows property handlers to circularly reference this service without triggering
       * the circular dependency detection, since the instance is already created and stored.
       */
      const index = this.resolutionStack.indexOf(serviceMetadata.id);
      if (index !== -1) {
        this.resolutionStack.splice(index, 1);
      }

      /**
       * Apply property handlers AFTER the value has been set and the service is removed from resolution stack.
       * This prevents infinite loops because @Inject decorators call Container.get,
       * which will now find the already-set value and return it immediately.
       *
       * Property circular references are allowed since the instance already exists.
       */
      if (serviceMetadata.type) {
        this.applyPropertyHandlers(serviceMetadata.type, value as Record<string, any>);
      }

      return value;
    } finally {
      /** Clean up - ensure service is removed from the resolution stack */
      const index = this.resolutionStack.indexOf(serviceMetadata.id);
      if (index !== -1) {
        this.resolutionStack.splice(index, 1);
      }
    }
  }

  /**
   * Initializes all parameter types for a given target service class.
   */
  private initializeParams(target: Function, paramTypes: any[]): unknown[] {
    return paramTypes.map((paramType, index) => {
      // Use the improved findHandler method that traverses the prototype chain
      const paramHandler = this.findHandler(target, index);

      if (paramHandler) return paramHandler.value(this);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (paramType && paramType.name && !this.isPrimitiveParamType(paramType.name)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return this.get(paramType);
      }

      return undefined;
    });
  }

  /**
   * Finds a handler for the given target and parameter index.
   * Traverses the full prototype chain to support multi-level inheritance.
   */
  private findHandler(target: Function, index: number): Handler | undefined {
    const allHandlers = this.getAllHandlers();

    // First, try to find an exact match for the target
    const exactMatch = allHandlers.find(handler => {
      return handler.object === target && handler.index === index;
    });

    if (exactMatch) return exactMatch;

    // If not found, traverse the prototype chain
    let currentPrototype = Object.getPrototypeOf(target);

    while (currentPrototype && currentPrototype !== Object.prototype) {
      const prototypeMatch = allHandlers.find(handler => {
        return handler.object === currentPrototype && handler.index === index;
      });

      if (prototypeMatch) return prototypeMatch;

      currentPrototype = Object.getPrototypeOf(currentPrototype);
    }

    return undefined;
  }

  /**
   * Checks if given parameter type is primitive type or not.
   */
  private isPrimitiveParamType(paramTypeName: string): boolean {
    return ['string', 'boolean', 'number', 'object'].includes(paramTypeName.toLowerCase());
  }

  /**
   * Applies all registered handlers on a given target class.
   * Traverses the prototype chain to find handlers for inherited classes.
   */
  private applyPropertyHandlers(target: Function, instance: { [key: string]: any }) {
    const allHandlers = this.getAllHandlers();

    allHandlers.forEach(handler => {
      if (typeof handler.index === 'number') return;

      // Check if this handler applies to the target or any prototype in the chain
      let currentTarget: Function | null = target;
      let applies = false;

      while (currentTarget && currentTarget !== Object.prototype) {
        if (handler.object === currentTarget.prototype || handler.object === currentTarget) {
          applies = true;
          break;
        }
        currentTarget = Object.getPrototypeOf(currentTarget);
      }

      if (!applies) return;

      if (handler.propertyName) {
        instance[handler.propertyName] = handler.value(this);
      }
    });
  }

  /**
   * Checks if the given service metadata contains a destroyable service instance and destroys it in place. If the service
   * contains a callable function named `destroy` it is called but not awaited and the return value is ignored..
   *
   * @param serviceMetadata the service metadata containing the instance to destroy
   * @param force when true the service will be always destroyed even if it's cannot be re-created
   */
  private disposeServiceInstance(serviceMetadata: ServiceMetadata, force = false) {
    this.throwIfDisposed();

    /** We reset value only if we can re-create it (aka type or factory exists). */
    const shouldResetValue = force || !!serviceMetadata.type || !!serviceMetadata.factory;

    if (shouldResetValue) {
      /** If we wound a function named destroy we call it without any params. */
      if (typeof (serviceMetadata?.value as Record<string, unknown>)['dispose'] === 'function') {
        try {
          (serviceMetadata.value as { dispose: CallableFunction }).dispose();
        } catch (error) {
          /** We simply ignore the errors from the destroy function. */
        }
      }

      serviceMetadata.value = EMPTY_VALUE;
    }
  }

  /**
   * Asynchronously disposes a service instance.
   * Calls lifecycle onDestroy hook if defined.
   *
   * @param serviceMetadata the service metadata containing the instance to destroy
   * @returns Promise if async disposal is needed, undefined otherwise
   */
  private disposeServiceInstanceAsync(serviceMetadata: ServiceMetadata): Promise<void> | undefined {
    this.throwIfDisposed();

    const value = serviceMetadata.value;
    if (value === EMPTY_VALUE) return undefined;

    const shouldResetValue = !!serviceMetadata.type || !!serviceMetadata.factory;

    if (shouldResetValue) {
      // Call lifecycle onDestroy hook if defined
      if (serviceMetadata.lifecycle?.onDestroy) {
        return Promise.resolve()
          .then(async () => {
            await serviceMetadata.lifecycle!.onDestroy!(value);
            // Also call dispose method if it exists
            if (typeof (value as Record<string, unknown>)['dispose'] === 'function') {
              await (value as { dispose: () => Promise<void> | void }).dispose();
            }
          })
          .catch(error => {
            // Ignore errors from disposal
            console.warn(`Error disposing service "${String(serviceMetadata.id)}":`, error);
          })
          .finally(() => {
            serviceMetadata.value = EMPTY_VALUE;
          });
      }

      // Call dispose method if it exists (no async lifecycle hook)
      if (typeof (value as Record<string, unknown>)['dispose'] === 'function') {
        try {
          const disposeResult = (value as { dispose: () => Promise<void> | void }).dispose();
          if (disposeResult instanceof Promise) {
            return disposeResult.finally(() => {
              serviceMetadata.value = EMPTY_VALUE;
            });
          }
        } catch (error) {
          console.warn(`Error disposing service "${String(serviceMetadata.id)}":`, error);
        }
      }

      serviceMetadata.value = EMPTY_VALUE;
    }

    return undefined;
  }

  /**
   * Asynchronously gets and initializes a service value.
   * Supports async factories and lifecycle hooks.
   */
  private async getServiceValueAsync(serviceMetadata: ServiceMetadata<unknown>): Promise<unknown> {
    let value: unknown = EMPTY_VALUE;

    // If already initialized, return the value
    if (serviceMetadata.value !== EMPTY_VALUE) {
      return serviceMetadata.value;
    }

    // Check for async factory
    if (serviceMetadata.factory) {
      if (serviceMetadata.factory instanceof Array) {
        let factoryInstance;
        try {
          factoryInstance = this.get<any>(serviceMetadata.factory[0]);
        } catch (error) {
          if (error instanceof ServiceNotFoundError) {
            factoryInstance = new serviceMetadata.factory[0]();
          } else {
            throw error;
          }
        }
        value = factoryInstance[serviceMetadata.factory[1]](this, serviceMetadata.id);
      } else {
        value = await serviceMetadata.factory(this, serviceMetadata.id);
      }
    } else if (serviceMetadata.type) {
      const constructableTargetType: Constructable<unknown> = serviceMetadata.type;
      const paramTypes: unknown[] = (Reflect as any)?.getMetadata('design:paramtypes', constructableTargetType) || [];
      const params = this.initializeParams(constructableTargetType, paramTypes);
      params.push(this);
      value = new constructableTargetType(...params);
    } else {
      throw new CannotInstantiateValueError(serviceMetadata.id);
    }

    if (value === EMPTY_VALUE) {
      throw new CannotInstantiateValueError(serviceMetadata.id);
    }

    // Store the value if not transient
    if (serviceMetadata.scope !== 'transient') {
      serviceMetadata.value = value;
    }

    // Apply property handlers
    if (serviceMetadata.type) {
      this.applyPropertyHandlers(serviceMetadata.type, value as Record<string, any>);
    }

    // Call onInit lifecycle hook if defined
    if (serviceMetadata.lifecycle?.onInit) {
      await serviceMetadata.lifecycle.onInit(value);
    }

    return value;
  }
}
