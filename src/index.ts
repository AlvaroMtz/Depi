import { isLegacyMetadataAvailable } from './utils/metadata-mode.util';

// Polyfill Symbol.metadata for TC39 Stage 3 decorator metadata proposal
// Required for Stage 3 dual-mode decorator support
if (typeof (Symbol as any).metadata === 'undefined') {
  (Symbol as any).metadata = Symbol('Symbol.metadata');
}

/**
 * Returns true when reflect-metadata APIs needed by legacy decorators exist.
 */
export function checkReflectMetadata(): boolean {
  return isLegacyMetadataAvailable();
}

/** This is an internal package, so we don't re-export it on purpose. */
import { ContainerRegistry } from './container-registry.class';

export * from './decorators/inject-many.decorator';
export * from './decorators/inject.decorator';
export * from './decorators/service.decorator';

export * from './error/typedi-error.base';
export * from './error/cannot-inject-value.error';
export * from './error/cannot-instantiate-value.error';
export * from './error/circular-dependency.error';
export * from './error/container-disposed.error';
export * from './error/container-registration.error';
export * from './error/service-not-found.error';
export * from './error/service-resolution.error';

export { Handler } from './interfaces/handler.interface';
export { ServiceMetadata } from './interfaces/service-metadata.interface';
export { ServiceOptions } from './interfaces/service-options.interface';
export { Constructable } from './types/constructable.type';
export { ServiceIdentifier } from './types/service-identifier.type';

export { ContainerInstance } from './container-instance.class';
export { Token } from './token.class';

/** We export the default container under the Container alias. */
export const Container = ContainerRegistry.defaultContainer;
export default Container;
