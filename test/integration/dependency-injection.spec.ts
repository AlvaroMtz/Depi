import 'reflect-metadata';
import { Container, Service, Inject } from '../../src/index';
import { Token } from '../../src/token.class';
import { CircularDependencyError } from '../../src/error/circular-dependency.error';
import { ServiceNotFoundError } from '../../src/error/service-not-found.error';
import { CannotInstantiateValueError } from '../../src/error/cannot-instantiate-value.error';

describe('Integration Tests', () => {
  beforeEach(() => Container.reset({ strategy: 'resetValue' }));

  describe('Complex Dependency Graphs', () => {
    it('should handle multi-level dependency chains', () => {
      @Service()
      class DatabaseService {
        query() {
          return 'data from db';
        }
      }

      @Service()
      class RepositoryService {
        constructor(private db: DatabaseService) {}

        findAll() {
          return this.db.query();
        }
      }

      @Service()
      class ApiService {
        constructor(private repo: RepositoryService) {}

        getData() {
          return this.repo.findAll();
        }
      }

      const apiService = Container.get(ApiService);
      expect(apiService.getData()).toBe('data from db');
    });

    it('should handle diamond dependencies correctly', () => {
      @Service()
      class Logger {
        logs: string[] = [];
        log(message: string) {
          this.logs.push(message);
        }
      }

      @Service()
      class ServiceA {
        constructor(private logger: Logger) {}
        doSomething() {
          this.logger.log('ServiceA did something');
        }
      }

      @Service()
      class ServiceB {
        constructor(private logger: Logger) {}
        doSomething() {
          this.logger.log('ServiceB did something');
        }
      }

      @Service()
      class Orchestrator {
        constructor(
          private serviceA: ServiceA,
          private serviceB: ServiceB,
          private logger: Logger
        ) {}
        run() {
          this.serviceA.doSomething();
          this.serviceB.doSomething();
          this.logger.log('Orchestrator finished');
        }
      }

      const orchestrator = Container.get(Orchestrator);
      orchestrator.run();

      const logger = Container.get(Logger);
      expect(logger.logs).toEqual(['ServiceA did something', 'ServiceB did something', 'Orchestrator finished']);
    });
  });

  describe('Container Hierarchies', () => {
    it('should support parent-child container relationships', () => {
      @Service()
      class BaseConfig {
        environment = 'production';
      }

      @Service()
      class FeatureFlag {
        enabled = false;
      }

      const parentContainer = Container.of('parent');
      parentContainer.set({ id: BaseConfig, type: BaseConfig });

      const childContainer = parentContainer.createChild('child');
      childContainer.set({ id: FeatureFlag, type: FeatureFlag });

      const baseConfigFromChild = childContainer.get(BaseConfig);
      expect(baseConfigFromChild.environment).toBe('production');

      const featureFlagFromChild = childContainer.get(FeatureFlag);
      expect(featureFlagFromChild.enabled).toBe(false);
    });

    it('should allow child to override parent services', () => {
      @Service()
      class Database {
        connectionString = 'parent-db';
      }

      const parentContainer = Container.of('parent');
      parentContainer.set({ id: Database, type: Database });

      const childContainer = parentContainer.createChild('child');
      const childDb = new Database();
      childDb.connectionString = 'child-db';
      childContainer.set({ id: Database, value: childDb });

      expect(parentContainer.get(Database).connectionString).toBe('parent-db');
      expect(childContainer.get(Database).connectionString).toBe('child-db');
    });
  });

  describe('Token-based Services', () => {
    it('should support multiple implementations of an interface', () => {
      interface PaymentProcessor {
        process(amount: number): boolean;
      }

      class StripePaymentProcessor implements PaymentProcessor {
        process(amount: number) {
          return true;
        }
      }

      class PayPalPaymentProcessor implements PaymentProcessor {
        process(amount: number) {
          return false;
        }
      }

      const StripeToken = new Token<PaymentProcessor>('Stripe');
      const PayPalToken = new Token<PaymentProcessor>('PayPal');

      Container.set({ id: StripeToken, type: StripePaymentProcessor });
      Container.set({ id: PayPalToken, type: PayPalPaymentProcessor });

      expect(Container.get(StripeToken).process(100)).toBe(true);
      expect(Container.get(PayPalToken).process(100)).toBe(false);
    });
  });

  describe('Property Injection', () => {
    it('should inject dependencies via @Inject decorator', () => {
      @Service()
      class Config {
        apiUrl = 'https://api.example.com';
      }

      @Service()
      class ApiService {
        @Inject(() => Config)
        private config!: Config;

        getUrl() {
          return this.config.apiUrl;
        }
      }

      const apiService = Container.get(ApiService);
      expect(apiService.getUrl()).toBe('https://api.example.com');
    });
  });

  describe('Factory Functions', () => {
    it('should support factory functions for complex initialization', () => {
      class Database {
        constructor(
          private connection: string,
          private port: number
        ) {}
        getConnection() {
          return `${this.connection}:${this.port}`;
        }
      }

      Container.set({
        id: Database,
        factory: () => new Database('localhost', 5432),
      });

      const db = Container.get(Database);
      expect(db.getConnection()).toBe('localhost:5432');
    });
  });

  describe('Lifecycle Management', () => {
    it('should call dispose on container reset', () => {
      const disposeMock = jest.fn();

      @Service()
      class DisposableService {
        dispose() {
          disposeMock();
        }
      }

      Container.get(DisposableService);
      Container.reset({ strategy: 'resetValue' });

      expect(disposeMock).toHaveBeenCalledTimes(1);
    });

    it('should call dispose when service is removed', () => {
      const disposeMock = jest.fn();

      @Service()
      class DisposableService {
        dispose() {
          disposeMock();
        }
      }

      Container.get(DisposableService);
      Container.remove(DisposableService);

      expect(disposeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Singleton vs Transient', () => {
    it('should return same instance for singleton services (default)', () => {
      @Service()
      class SingletonService {
        timestamp = Date.now();
      }

      const instance1 = Container.get(SingletonService);
      const instance2 = Container.get(SingletonService);

      expect(instance1).toBe(instance2);
      expect(instance1.timestamp).toBe(instance2.timestamp);
    });

    it('should support transient services via reset', () => {
      @Service()
      class TransientService {
        timestamp = Date.now();
      }

      const instance1 = Container.get(TransientService);
      Container.reset({ strategy: 'resetValue' });
      const instance2 = Container.get(TransientService);

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Error Handling', () => {
    it('should throw ServiceNotFoundError for missing services', () => {
      expect(() => Container.get('NonExistentService')).toThrow(ServiceNotFoundError);
    });
  });
});
