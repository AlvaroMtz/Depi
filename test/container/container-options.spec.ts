/**
 * Integration tests for ContainerOptions — lookupStrategy and allowSingletonLookup.
 *
 * Task 1.10: Verifies that the options wired in Task 1.3 correctly control
 * lookup behaviour in get() and getAsync() (Tasks 1.4 and 1.5).
 */
import 'reflect-metadata';
import { Container } from '../../src/index';
import { ContainerInstance } from '../../src/container-instance.class';
import { ContainerRegistry } from '../../src/container-registry.class';
import { ServiceNotFoundError } from '../../src/error/service-not-found.error';

describe('ContainerOptions', () => {
  /** Reset the default container before each test to avoid cross-test contamination. */
  beforeEach(() => Container.reset({ strategy: 'resetServices' }));

  // ---------------------------------------------------------------------------
  // lookupStrategy
  // ---------------------------------------------------------------------------

  describe('lookupStrategy', () => {
    it('default (allowLookup) resolves singletons from the global container', () => {
      // Register a singleton in the default (global) container.
      Container.set({ id: 'global-singleton', value: 'hello-singleton', scope: 'singleton' });

      // A child container with the default options must find the singleton via parent lookup.
      const child = new ContainerInstance('child-allowLookup');
      child.register();

      expect(child.get<string>('global-singleton')).toBe('hello-singleton');

      ContainerRegistry.removeContainer(child);
    });

    it('localOnly throws ServiceNotFoundError for services not registered locally', async () => {
      // Register a service in the default container.
      Container.set({ id: 'global-service', value: 'from-global', scope: 'singleton' });

      // A container with lookupStrategy: 'localOnly' must NOT fall back to the global container.
      const child = new ContainerInstance('child-localOnly', undefined, { lookupStrategy: 'localOnly' });
      child.register();

      expect(() => child.get('global-service')).toThrow(ServiceNotFoundError);
      await expect(child.getAsync('global-service')).rejects.toBeInstanceOf(ServiceNotFoundError);

      ContainerRegistry.removeContainer(child);
    });

    it('localOnly resolves services that are registered locally', () => {
      const child = new ContainerInstance('child-localOnly-local', undefined, { lookupStrategy: 'localOnly' });
      child.register();

      child.set({ id: 'local-service', value: 'local-value' });
      expect(child.get<string>('local-service')).toBe('local-value');

      ContainerRegistry.removeContainer(child);
    });
  });

  // ---------------------------------------------------------------------------
  // allowSingletonLookup
  // ---------------------------------------------------------------------------

  describe('allowSingletonLookup', () => {
    it('true (default) allows finding singletons in the defaultContainer', () => {
      Container.set({ id: 'singleton-svc', value: 'singleton-value', scope: 'singleton' });

      const child = new ContainerInstance('child-singletonAllowed', undefined, { allowSingletonLookup: true });
      child.register();

      expect(child.get<string>('singleton-svc')).toBe('singleton-value');

      ContainerRegistry.removeContainer(child);
    });

    it('false does not look up singletons in the defaultContainer', () => {
      Container.set({ id: 'singleton-svc-2', value: 'should-not-find', scope: 'singleton' });

      const child = new ContainerInstance('child-singletonDisabled', undefined, { allowSingletonLookup: false });
      child.register();

      expect(() => child.get('singleton-svc-2')).toThrow(ServiceNotFoundError);

      ContainerRegistry.removeContainer(child);
    });

    it('false still resolves services registered locally', () => {
      const child = new ContainerInstance('child-singletonDisabled-local', undefined, { allowSingletonLookup: false });
      child.register();

      child.set({ id: 'my-local', value: 42 });
      expect(child.get<number>('my-local')).toBe(42);

      ContainerRegistry.removeContainer(child);
    });
  });

  // ---------------------------------------------------------------------------
  // Default values
  // ---------------------------------------------------------------------------

  describe('default option values', () => {
    it('lookupStrategy defaults to allowLookup', () => {
      // Access the private field via any-cast to verify the default without
      // depending on external behaviour that might be affected by other state.
      const child = new ContainerInstance('child-defaults-lookup') as any;
      expect(child._options.lookupStrategy).toBe('allowLookup');
    });

    it('allowSingletonLookup defaults to true', () => {
      const child = new ContainerInstance('child-defaults-singleton') as any;
      expect(child._options.allowSingletonLookup).toBe(true);
    });

    it('partial options are merged with defaults', () => {
      const child = new ContainerInstance('child-partial-opts', undefined, {
        lookupStrategy: 'localOnly',
      }) as any;
      expect(child._options.lookupStrategy).toBe('localOnly');
      expect(child._options.allowSingletonLookup).toBe(true); // default preserved
    });
  });
});
