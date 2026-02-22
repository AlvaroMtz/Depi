import 'reflect-metadata';
import { Container } from '../../src/index';
import { Service } from '../../src/decorators/service.decorator';
import { Inject } from '../../src/decorators/inject.decorator';
import { InjectMany } from '../../src/decorators/inject-many.decorator';

describe('Decorators dual mode (Stage 3 + legacy)', () => {
  beforeEach(() => Container.reset({ strategy: 'resetServices' }));

  it('registers @Service in Stage 3 mode via class initializer', () => {
    const initializers: Array<(this: any) => void> = [];
    const context = {
      kind: 'class',
      name: 'Stage3Service',
      metadata: {},
      addInitializer: (initializer: (this: any) => void) => initializers.push(initializer),
    };

    class Stage3Service {}

    const decorator = Service({ scope: 'singleton' });
    decorator(Stage3Service, context as any);

    expect(Container.has(Stage3Service)).toBe(false);
    initializers.forEach(initializer => initializer.call(Stage3Service));

    expect(Container.has(Stage3Service)).toBe(true);
    expect(Container.get(Stage3Service)).toBeInstanceOf(Stage3Service);
    expect(Container.get(Stage3Service)).toBe(Container.get(Stage3Service));
  });

  it('resolves @Inject and @InjectMany Stage 3 field initializers', () => {
    class DepService {}

    Container.set({ id: DepService, type: DepService });
    Container.set({ id: 'handlers', value: 'a', multiple: true });
    Container.set({ id: 'handlers', value: 'b', multiple: true });

    const injectInitializer = Inject(() => DepService)(undefined, { kind: 'field', name: 'dep' } as any) as (
      this: any,
      value: unknown
    ) => unknown;

    const injectManyInitializer = InjectMany('handlers')(undefined, { kind: 'field', name: 'handlers' } as any) as (
      this: any,
      value: unknown
    ) => unknown;

    const instance = { constructor: class Stage3Consumer {} };

    expect(injectInitializer.call(instance, undefined)).toBeInstanceOf(DepService);
    expect(injectManyInitializer.call(instance, undefined)).toEqual(['a', 'b']);
  });

  it('throws clear error for unsupported Stage 3 injection kinds', () => {
    expect(() => Inject()(undefined, { kind: 'method', name: 'run' } as any)).toThrow(
      'Constructor parameter injection requires experimentalDecorators mode'
    );
    expect(() => InjectMany()(undefined, { kind: 'accessor', name: 'items' } as any)).toThrow(
      'Constructor parameter injection requires experimentalDecorators mode'
    );
  });

  it('throws helpful legacy error when reflect-metadata API is unavailable', () => {
    const originalGetMetadata = (Reflect as any).getMetadata;

    try {
      (Reflect as any).getMetadata = undefined;

      expect(() => Inject()({} as any, 'dep')).toThrow(
        'reflect-metadata is required for legacy decorator mode. Install it via: npm install reflect-metadata'
      );
    } finally {
      (Reflect as any).getMetadata = originalGetMetadata;
    }
  });
});
