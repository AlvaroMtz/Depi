import 'reflect-metadata';
import { Container } from '../../src/index';
import { Service } from '../../src/decorators/service.decorator';
import { Inject } from '../../src/decorators/inject.decorator';

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

describe('Stage 3 and legacy interoperability', () => {
  beforeEach(() => Container.reset({ strategy: 'resetServices' }));

  it('resolves a legacy @Service dependency from a Stage 3 @Inject consumer', () => {
    @Service()
    class LegacyDependency {}

    const depInitializer = Inject(() => LegacyDependency)(undefined, { kind: 'field', name: 'dep' } as never) as (
      this: unknown,
      value: unknown
    ) => LegacyDependency;

    class Stage3Consumer {
      dep: LegacyDependency = depInitializer.call(this, undefined);
    }

    registerStage3Service(Stage3Consumer);

    expect(Container.get(Stage3Consumer).dep).toBeInstanceOf(LegacyDependency);
  });

  it('resolves a Stage 3 @Service dependency from a legacy @Inject consumer', () => {
    class Stage3Dependency {}
    registerStage3Service(Stage3Dependency);

    @Service()
    class LegacyConsumer {
      @Inject(() => Stage3Dependency)
      dep!: Stage3Dependency;
    }

    expect(Container.get(LegacyConsumer).dep).toBeInstanceOf(Stage3Dependency);
  });

  it('resolves legacy and Stage 3 services from the same container without conflicts', () => {
    @Service()
    class LegacyService {}

    class Stage3Service {}
    registerStage3Service(Stage3Service);

    expect(Container.get(LegacyService)).toBeInstanceOf(LegacyService);
    expect(Container.get(Stage3Service)).toBeInstanceOf(Stage3Service);
  });
});
