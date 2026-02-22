import 'reflect-metadata';
import { Container, ContainerInstance } from '../../src/index';
import { Service } from '../../src/decorators/service.decorator';

function registerStage3Service(target: Function, options?: Parameters<typeof Service>[0]): void {
  const initializers: Array<(this: any) => void> = [];
  const context = {
    kind: 'class',
    name: target.name,
    metadata: {},
    addInitializer: (initializer: (this: any) => void) => initializers.push(initializer),
  };

  const decorator = Service(options as never);
  decorator(target, context as never);
  initializers.forEach(initializer => initializer.call(target));
}

describe('Stage 3 @Service lifecycle basics', () => {
  beforeEach(() => Container.reset({ strategy: 'resetServices' }));

  it('registers and resolves a Stage 3 service', () => {
    class Stage3Service {}

    registerStage3Service(Stage3Service);

    expect(Container.has(Stage3Service)).toBe(true);
    expect(Container.get(Stage3Service)).toBeInstanceOf(Stage3Service);
  });

  it('keeps singleton scope behavior in Stage 3 mode', () => {
    class SingletonStage3Service {}

    registerStage3Service(SingletonStage3Service, { scope: 'singleton' });

    const first = Container.get(SingletonStage3Service);
    const childContainer = new ContainerInstance('stage3-singleton-child');
    const second = childContainer.get(SingletonStage3Service);

    expect(first).toBe(second);
  });

  it('initializes eager services before first explicit get', () => {
    class EagerStage3Service {
      static instances = 0;

      constructor() {
        EagerStage3Service.instances += 1;
      }
    }

    registerStage3Service(EagerStage3Service, { eager: true });

    expect(EagerStage3Service.instances).toBe(1);
    expect(Container.get(EagerStage3Service)).toBeInstanceOf(EagerStage3Service);
    expect(EagerStage3Service.instances).toBe(1);
  });

  it('resolves Stage 3 services even when Reflect.getMetadata is unavailable', () => {
    const originalGetMetadata = (Reflect as any).getMetadata;

    try {
      (Reflect as any).getMetadata = undefined;

      class Stage3ServiceWithoutReflect {}

      registerStage3Service(Stage3ServiceWithoutReflect);

      expect(Container.get(Stage3ServiceWithoutReflect)).toBeInstanceOf(Stage3ServiceWithoutReflect);
    } finally {
      (Reflect as any).getMetadata = originalGetMetadata;
    }
  });
});
