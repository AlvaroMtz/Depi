import { ContainerRegistry } from '../container-registry.class';
import { Token } from '../token.class';
import { CannotInjectValueError } from '../error/cannot-inject-value.error';
import { resolveToTypeWrapper } from '../utils/resolve-to-type-wrapper.util';
import { Constructable } from '../types/constructable.type';
import { ServiceIdentifier } from '../types/service-identifier.type';
import { isStage3Context } from '../utils/stage3-detector.util';

/**
 * Injects a list of services into a class property or constructor parameter.
 * Supports both legacy (experimentalDecorators) and TC39 Stage 3 decorator modes.
 *
 * Note (R-DEC-04): In Stage 3 mode, constructor parameter injection is not supported
 * by the TC39 decorator specification. Use field (property) injection instead.
 */
export function InjectMany(): Function;
export function InjectMany(type?: (type?: any) => Function): Function;
export function InjectMany(serviceName?: string): Function;
export function InjectMany(token: Token<any>): Function;
export function InjectMany(
  typeOrIdentifier?: ((type?: never) => Constructable<unknown>) | ServiceIdentifier<unknown>
): Function {
  return function (target: unknown, contextOrPropertyName?: unknown, index?: number): unknown {
    if (isStage3Context(contextOrPropertyName)) {
      /** Stage 3 path — contextOrPropertyName is a ClassFieldDecoratorContext or similar */
      const context = contextOrPropertyName as {
        kind: string;
        name: string | symbol;
      };

      if (context.kind === 'class') {
        throw new Error('@InjectMany cannot be used as a class decorator. Use @Service instead.');
      }

      if (context.kind !== 'field') {
        throw new Error(
          `@InjectMany is not supported on "${context.kind}" in Stage 3 mode. ` +
            'Use it on class fields (properties) only. ' +
            'Constructor parameter injection requires experimentalDecorators mode.'
        );
      }

      /** Field decorator — return an initializer function that resolves the services */
      return function (this: any, _initialValue: unknown): unknown {
        const targetConstructor = (this as { constructor: Constructable<unknown> }).constructor;

        if (typeOrIdentifier === undefined) {
          throw new CannotInjectValueError(targetConstructor, String(context.name));
        }

        /** Resolve the service identifier from the provided token/type */
        let serviceId: ServiceIdentifier<unknown>;

        if (typeof typeOrIdentifier === 'function' && !(typeOrIdentifier instanceof Token)) {
          /** Lazy type: () => MyClass format */
          serviceId = (typeOrIdentifier as CallableFunction)();
        } else {
          /** Eager type: string, Token, or direct class reference */
          serviceId = typeOrIdentifier as ServiceIdentifier<unknown>;
        }

        if (serviceId === undefined || serviceId === Object) {
          throw new CannotInjectValueError(targetConstructor, String(context.name));
        }

        return ContainerRegistry.defaultContainer.getMany<unknown>(serviceId);
      };
    } else {
      /** Legacy path — target/propertyName/index as per experimentalDecorators */
      const propertyName = contextOrPropertyName as string | Symbol;
      const legacyTarget = target as Object;
      const typeWrapper = resolveToTypeWrapper(typeOrIdentifier, legacyTarget, propertyName, index);

      /** If no type was inferred, or the general Object type was inferred we throw an error. */
      if (typeWrapper === undefined || typeWrapper.eagerType === undefined || typeWrapper.eagerType === Object) {
        throw new CannotInjectValueError(legacyTarget as Constructable<unknown>, propertyName as string);
      }

      ContainerRegistry.defaultContainer.registerHandler({
        object: legacyTarget as Constructable<unknown>,
        propertyName: propertyName as string,
        index: index,
        value: containerInstance => {
          const evaluatedLazyType = typeWrapper.lazyType();

          /** If no type was inferred lazily, or the general Object type was inferred we throw an error. */
          if (evaluatedLazyType === undefined || evaluatedLazyType === Object) {
            throw new CannotInjectValueError(legacyTarget as Constructable<unknown>, propertyName as string);
          }

          return containerInstance.getMany<unknown>(evaluatedLazyType);
        },
      });
    }
  };
}
