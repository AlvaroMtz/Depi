/**
 * Regression tests for handler bug fixes.
 *
 * TD-07: Handler leak — handlers accumulated in resetServices calls were not cleared,
 *        leading to stale handler application on subsequent registerHandler calls.
 * TD-12: Handler matching — subclass properties decorated with @Inject were not injected
 *        because applyPropertyHandlers used an incorrect prototype-chain comparison.
 */
import 'reflect-metadata';
import { Container } from '../../src/index';
import { Service } from '../../src/decorators/service.decorator';
import { Inject } from '../../src/decorators/inject.decorator';

describe('Handler regression tests', () => {
  beforeEach(() => Container.reset({ strategy: 'resetValue' }));

  /**
   * TD-07: reset({ strategy: 'resetServices' }) must clear the handler array.
   *
   * The spec (R-CTR-04) mandates:
   *   "C.reset({ strategy: 'resetServices' }) clears C's handler array"
   *
   * This prevents manual handlers (registered via registerHandler()) from leaking
   * into subsequent test runs that rely on a clean container state.
   */
  describe('TD-07 — reset({ strategy: resetServices }) clears handlers', () => {
    it('should clear manually registered handlers on resetServices', () => {
      let applyCount = 0;

      class DepA {}
      class Consumer {}

      Container.set({ id: DepA, type: DepA });
      Container.set({ id: Consumer, type: Consumer });

      // Register handler manually
      Container.registerHandler({
        object: Consumer,
        propertyName: 'depA',
        value: containerInstance => {
          applyCount++;
          return containerInstance.get(DepA);
        },
      });

      // First get — handler applied once
      applyCount = 0;
      Container.get(Consumer);
      expect(applyCount).toBe(1);

      // Reset with resetServices — should clear handlers
      Container.reset({ strategy: 'resetServices' });

      // Re-register services (but no re-registration of handler)
      Container.set({ id: DepA, type: DepA });
      Container.set({ id: Consumer, type: Consumer });

      // Get again — handler was cleared by reset, so property won't be injected
      applyCount = 0;
      const fresh = Container.get(Consumer);
      // Handler was cleared — applyCount should remain 0, and property should be undefined
      expect(applyCount).toBe(0);
      expect((fresh as any).depA).toBeUndefined();
    });

    it('should not clear handlers on resetValue (only resetServices clears them)', () => {
      let applyCount = 0;

      class ServiceX {}
      class ConsumerY {}

      Container.set({ id: ServiceX, type: ServiceX });
      Container.set({ id: ConsumerY, type: ConsumerY });

      Container.registerHandler({
        object: ConsumerY,
        propertyName: 'serviceX',
        value: containerInstance => {
          applyCount++;
          return containerInstance.get(ServiceX);
        },
      });

      // First get
      applyCount = 0;
      Container.get(ConsumerY);
      expect(applyCount).toBe(1);

      // Reset with resetValue — should NOT clear handlers (only resets values)
      Container.reset({ strategy: 'resetValue' });

      // Get again — handler still active because resetValue doesn't clear handlers
      applyCount = 0;
      Container.get(ConsumerY);
      expect(applyCount).toBe(1); // handler still applies
    });

    it('should maintain @Inject injections across resetValue cycles', () => {
      @Service()
      class InjectableService {
        value = 'injected-value';
      }

      @Service()
      class ServiceWithProp {
        @Inject()
        injectable: InjectableService;
      }

      // First get
      const first = Container.get(ServiceWithProp);
      expect(first.injectable).toBeInstanceOf(InjectableService);

      // Reset values only — handlers remain active
      Container.reset({ strategy: 'resetValue' });

      // Second get — injection still works because handlers were not cleared
      const second = Container.get(ServiceWithProp);
      expect(second.injectable).toBeInstanceOf(InjectableService);
      expect(second.injectable.value).toBe('injected-value');
    });
  });

  /**
   * TD-12: applyPropertyHandlers must match on the prototype chain.
   *
   * Before the fix, the comparison `handler.object.constructor === currentTarget`
   * would fail for property handlers because `handler.object` IS the prototype
   * (not the constructor), and the comparison used a wrong level of indirection.
   *
   * After the fix:
   *   `handler.object === currentTarget.prototype || handler.object === currentTarget`
   * correctly matches both direct class and inherited cases.
   */
  describe('TD-12 — applyPropertyHandlers matches prototype chain for subclasses', () => {
    it('should inject property into subclass that extends an @Service class', () => {
      @Service()
      class InjectedDep {
        value = 'injected';
      }

      @Service()
      class ParentService {
        @Inject()
        dep: InjectedDep;
      }

      @Service()
      class ChildService extends ParentService {}

      // Child should inherit the @Inject handler from the parent prototype
      const child = Container.get(ChildService);
      expect(child.dep).toBeInstanceOf(InjectedDep);
      expect(child.dep.value).toBe('injected');
    });

    it('should inject property defined on parent class when resolving subclass', () => {
      @Service()
      class Logger {
        log(msg: string) {
          return `[LOG] ${msg}`;
        }
      }

      @Service()
      class BaseHandler {
        @Inject()
        logger: Logger;
      }

      @Service()
      class ConcreteHandler extends BaseHandler {
        handle() {
          return this.logger.log('handled');
        }
      }

      const handler = Container.get(ConcreteHandler);
      expect(handler.logger).toBeInstanceOf(Logger);
      expect(handler.handle()).toBe('[LOG] handled');
    });

    it('should inject property defined directly on the subclass itself', () => {
      @Service()
      class Config {
        setting = 'prod';
      }

      @Service()
      class Base {}

      @Service()
      class Derived extends Base {
        @Inject()
        config: Config;
      }

      const derived = Container.get(Derived);
      expect(derived.config).toBeInstanceOf(Config);
      expect(derived.config.setting).toBe('prod');
    });

    it('should not inject unrelated service properties from another class', () => {
      @Service()
      class DepService {
        value = 'dep';
      }

      @Service()
      class ServiceA {
        @Inject()
        dep: DepService;
      }

      @Service()
      class ServiceB {}

      const a = Container.get(ServiceA);
      const b = Container.get(ServiceB);

      expect(a.dep).toBeInstanceOf(DepService);
      // ServiceB should NOT have any dep property set from ServiceA's handler
      expect((b as any).dep).toBeUndefined();
    });
  });
});
