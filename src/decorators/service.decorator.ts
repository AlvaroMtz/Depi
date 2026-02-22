import { ContainerRegistry } from '../container-registry.class';
import { ServiceMetadata } from '../interfaces/service-metadata.interface';
import { ServiceOptions } from '../interfaces/service-options.interface';
import { EMPTY_VALUE } from '../empty.const';
import { Constructable } from '../types/constructable.type';
import { isStage3Context } from '../utils/stage3-detector.util';

/**
 * Marks class as a service that can be injected using Container.
 * Supports both legacy (experimentalDecorators) and TC39 Stage 3 decorator modes.
 */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export function Service<T = unknown>(): Function;
export function Service<T = unknown>(options: ServiceOptions<T>): Function;
export function Service<T>(options: ServiceOptions<T> = {}): Function {
  return function (targetOrValue: any, contextOrUndefined?: any): any {
    if (isStage3Context(contextOrUndefined)) {
      /** Stage 3 path — contextOrUndefined is a ClassDecoratorContext */
      const context = contextOrUndefined as {
        kind: string;
        name: string;
        addInitializer: (fn: (this: any) => void) => void;
        metadata?: object;
      };

      if (context.kind !== 'class') {
        throw new Error('@Service can only be used as a class decorator.');
      }

      context.addInitializer(function (this: any) {
        /** 'this' is the class constructor after it is fully defined */
        const serviceMetadata: ServiceMetadata<T> = {
          id: options.id || this,
          type: this as unknown as Constructable<T>,
          factory: (options as any).factory || undefined,
          multiple: options.multiple || false,
          eager: options.eager || false,
          scope: options.scope || 'container',
          referencedBy: new Map().set(ContainerRegistry.defaultContainer.id, ContainerRegistry.defaultContainer),
          value: EMPTY_VALUE,
        };

        ContainerRegistry.defaultContainer.set(serviceMetadata);
      });

      /** Mark in Symbol.metadata so the container can verify registration */
      if (context.metadata) {
        (context.metadata as any)['typedi:registered'] = true;
      }
    } else {
      /** Legacy path — targetOrValue is the class constructor */
      const targetConstructor = targetOrValue;
      const serviceMetadata: ServiceMetadata<T> = {
        id: options.id || targetConstructor,
        type: targetConstructor as unknown as Constructable<T>,
        factory: (options as any).factory || undefined,
        multiple: options.multiple || false,
        eager: options.eager || false,
        scope: options.scope || 'container',
        referencedBy: new Map().set(ContainerRegistry.defaultContainer.id, ContainerRegistry.defaultContainer),
        value: EMPTY_VALUE,
      };

      ContainerRegistry.defaultContainer.set(serviceMetadata);
    }
  };
}
