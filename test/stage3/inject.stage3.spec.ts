import 'reflect-metadata';
import { Container } from '../../src/index';
import { Service } from '../../src/decorators/service.decorator';
import { Inject } from '../../src/decorators/inject.decorator';
import { InjectMany } from '../../src/decorators/inject-many.decorator';

function registerStage3Service(target: Function): void {
  const initializers: Array<(this: any) => void> = [];
  const context = {
    kind: 'class',
    name: target.name,
    metadata: {},
    addInitializer: (initializer: (this: any) => void) => initializers.push(initializer),
  };

  Service()(target, context as never);
  initializers.forEach(initializer => initializer.call(target));
}

describe('Stage 3 @Inject and @InjectMany', () => {
  beforeEach(() => Container.reset({ strategy: 'resetServices' }));

  it('injects a property via @Inject in Stage 3 mode', () => {
    class DepService {}
    registerStage3Service(DepService);

    const depInitializer = Inject(() => DepService)(undefined, { kind: 'field', name: 'dep' } as never) as (
      this: unknown,
      value: unknown
    ) => DepService;

    class ConsumerService {
      dep: DepService = depInitializer.call(this, undefined);
    }

    registerStage3Service(ConsumerService);

    expect(Container.get(ConsumerService).dep).toBeInstanceOf(DepService);
  });

  it('injects multiple values via @InjectMany in Stage 3 mode', () => {
    Container.set({ id: 'stage3:handlers', value: 'a', multiple: true });
    Container.set({ id: 'stage3:handlers', value: 'b', multiple: true });

    const manyInitializer = InjectMany('stage3:handlers')(undefined, { kind: 'field', name: 'handlers' } as never) as (
      this: unknown,
      value: unknown
    ) => string[];

    class ConsumerService {
      handlers: string[] = manyInitializer.call(this, undefined);
    }

    registerStage3Service(ConsumerService);

    expect(Container.get(ConsumerService).handlers).toEqual(['a', 'b']);
  });

  it('throws a clear error for unsupported constructor parameter injection in Stage 3 mode', () => {
    expect(() => Inject()(undefined, { kind: 'method', name: 'constructor' } as never)).toThrow(
      'Constructor parameter injection requires experimentalDecorators mode.'
    );
  });

  it('works in Stage 3 path when reflect-metadata API is unavailable', () => {
    const originalGetMetadata = (Reflect as any).getMetadata;

    try {
      (Reflect as any).getMetadata = undefined;
      Container.set({ id: 'stage3:value', value: 'hello-stage3' });

      const valueInitializer = Inject('stage3:value')(undefined, { kind: 'field', name: 'value' } as never) as (
        this: unknown,
        value: unknown
      ) => string;
      const instance = { constructor: class ConsumerService {} };

      expect(valueInitializer.call(instance, undefined)).toBe('hello-stage3');
    } finally {
      (Reflect as any).getMetadata = originalGetMetadata;
    }
  });
});
