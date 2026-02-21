import 'reflect-metadata';
import { Service, Container } from '../../src/index';
import { Token } from '../../src/token.class';
import { CircularDependencyError } from '../../src/error/circular-dependency.error';
import { ServiceNotFoundError } from '../../src/error/service-not-found.error';
import { CannotInstantiateValueError } from '../../src/error/cannot-instantiate-value.error';
import { ContainerDisposedError } from '../../src/error/container-disposed.error';
import { ContainerRegistrationError } from '../../src/error/container-registration.error';
import { ServiceResolutionError } from '../../src/error/service-resolution.error';

describe('Custom Error Classes', () => {
  beforeEach(() => Container.reset({ strategy: 'resetValue' }));

  describe('CircularDependencyError', () => {
    it('should have correct error name', () => {
      const error = new CircularDependencyError('TestService');
      expect(error.name).toBe('CircularDependencyError');
    });

    it('should format message for string identifier', () => {
      const error = new CircularDependencyError('MyService');
      expect(error.message).toContain('"MyService"');
      expect(error.message).toContain('Circular dependency detected');
    });

    it('should format message for class identifier', () => {
      @Service()
      class TestClass {}

      const error = new CircularDependencyError(TestClass);
      expect(error.message).toContain('TestClass');
    });

    it('should format message for Token identifier', () => {
      const MyToken = new Token('MyToken');
      const error = new CircularDependencyError(MyToken);
      expect(error.message).toContain('Token<MyToken>');
    });

    it('should format message for Token without name', () => {
      const UnnamedToken = new Token();
      const error = new CircularDependencyError(UnnamedToken);
      expect(error.message).toContain('Token<UNSET_NAME>');
    });

    it('should include resolution path in message', () => {
      const error = new CircularDependencyError('ServiceC', ['ServiceA', 'ServiceB']);
      expect(error.message).toContain('"ServiceA" -> "ServiceB" -> "ServiceC"');
      expect(error.message).toContain('Resolution path:');
    });

    it('should store resolution path', () => {
      const path = ['ServiceA', 'ServiceB'];
      const error = new CircularDependencyError('ServiceC', path);
      expect(error.resolutionPath).toEqual(path);
    });

    it('should handle empty resolution path', () => {
      const error = new CircularDependencyError('ServiceA', []);
      expect(error.message).toContain('Resolution path:  -> "ServiceA"');
    });

    it('should handle mixed identifier types in resolution path', () => {
      const StringToken = new Token('StringToken');
      class MyClass {}

      const path = ['ServiceA', StringToken, MyClass];
      const error = new CircularDependencyError('ServiceD', path);

      expect(error.message).toContain('ServiceA');
      expect(error.message).toContain('Token<StringToken>');
      expect(error.message).toContain('MyClass');
    });

    it('should provide helpful error message with suggestions', () => {
      const error = new CircularDependencyError('MyService', ['ServiceA', 'ServiceB']);
      expect(error.message).toContain('Break the circular dependency');
      expect(error.message).toContain('lazy injection');
    });

    it('should handle class with name property', () => {
      class NamedClass {
        static name = 'NamedClassName';
      }

      const error = new CircularDependencyError(NamedClass as any);
      expect(error.message).toContain('NamedClassName');
    });

    it('should handle class with prototype.name', () => {
      class TestClass {}

      const error = new CircularDependencyError(TestClass);
      expect(error.message).toContain('TestClass');
    });

    it('should handle unknown identifier gracefully', () => {
      const error = new CircularDependencyError(null as any);
      expect(error.message).toContain('<UNKNOWN_IDENTIFIER>');
    });
  });

  describe('ServiceNotFoundError', () => {
    it('should have correct error name', () => {
      const error = new ServiceNotFoundError('TestService');
      expect(error.name).toBe('ServiceNotFoundError');
    });

    it('should format message for string identifier', () => {
      const error = new ServiceNotFoundError('MyService');
      expect(error.message).toContain('"MyService"');
      expect(error.message).toContain('was not found');
    });

    it('should format message for class identifier', () => {
      @Service()
      class TestClass {}

      const error = new ServiceNotFoundError(TestClass);
      expect(error.message).toContain('TestClass');
    });

    it('should format message for Token identifier', () => {
      const MyToken = new Token('MyToken');
      const error = new ServiceNotFoundError(MyToken);
      expect(error.message).toContain('Token<MyToken>');
    });

    it('should format message for Token without name', () => {
      const UnnamedToken = new Token();
      const error = new ServiceNotFoundError(UnnamedToken);
      expect(error.message).toContain('Token<UNSET_NAME>');
    });

    it('should provide helpful registration suggestions', () => {
      const error = new ServiceNotFoundError('MyService');
      expect(error.message).toContain('Container.set');
      expect(error.message).toContain('@Service()');
    });

    it('should be thrown for missing services', () => {
      expect(() => Container.get('NonExistentService')).toThrow(ServiceNotFoundError);
    });

    it('should handle class with name property', () => {
      class NamedClass {
        static name = 'NamedClassName';
      }

      const error = new ServiceNotFoundError(NamedClass as any);
      expect(error.message).toContain('NamedClassName');
    });

    it('should handle class with prototype.name', () => {
      class TestClass {}

      const error = new ServiceNotFoundError(TestClass);
      expect(error.message).toContain('TestClass');
    });

    it('should handle unknown identifier gracefully', () => {
      const error = new ServiceNotFoundError(null as any);
      expect(error.message).toContain('<UNKNOWN_IDENTIFIER>');
    });
  });

  describe('CannotInstantiateValueError', () => {
    it('should have correct error name', () => {
      const error = new CannotInstantiateValueError('TestService');
      expect(error.name).toBe('CannotInstantiateValueError');
    });

    it('should format message for string identifier', () => {
      const error = new CannotInstantiateValueError('MyService');
      expect(error.message).toContain('"MyService"');
      expect(error.message).toContain('Cannot instantiate');
    });

    it('should format message for class identifier', () => {
      @Service()
      class TestClass {}

      const error = new CannotInstantiateValueError(TestClass);
      expect(error.message).toContain('TestClass');
    });

    it('should format message for Token identifier', () => {
      const MyToken = new Token('MyToken');
      const error = new CannotInstantiateValueError(MyToken);
      expect(error.message).toContain('Token<MyToken>');
    });

    it('should format message for Token without name', () => {
      const UnnamedToken = new Token();
      const error = new CannotInstantiateValueError(UnnamedToken);
      expect(error.message).toContain('Token<UNSET_NAME>');
    });

    it('should mention missing factory or type', () => {
      const error = new CannotInstantiateValueError('MyService');
      expect(error.message).toContain('metadata');
      expect(error.message).toContain('factory');
      expect(error.message).toContain('type');
    });

    it('should handle class with name property', () => {
      class NamedClass {
        static name = 'NamedClassName';
      }

      const error = new CannotInstantiateValueError(NamedClass as any);
      expect(error.message).toContain('NamedClassName');
    });

    it('should handle class with prototype.name', () => {
      class TestClass {}

      const error = new CannotInstantiateValueError(TestClass);
      expect(error.message).toContain('TestClass');
    });

    it('should handle unknown identifier gracefully', () => {
      const error = new CannotInstantiateValueError(null as any);
      expect(error.message).toContain('<UNKNOWN_IDENTIFIER>');
    });
  });

  describe('Error instances', () => {
    it('should be instanceof Error', () => {
      const circularError = new CircularDependencyError('Test');
      const notFoundError = new ServiceNotFoundError('Test');
      const instantiateError = new CannotInstantiateValueError('Test');

      expect(circularError).toBeInstanceOf(Error);
      expect(notFoundError).toBeInstanceOf(Error);
      expect(instantiateError).toBeInstanceOf(Error);
    });

    it('should have stack traces', () => {
      const circularError = new CircularDependencyError('Test');
      const notFoundError = new ServiceNotFoundError('Test');
      const instantiateError = new CannotInstantiateValueError('Test');

      expect(circularError.stack).toBeDefined();
      expect(notFoundError.stack).toBeDefined();
      expect(instantiateError.stack).toBeDefined();
    });
  });

  describe('ContainerDisposedError', () => {
    it('should have correct error name', () => {
      const error = new ContainerDisposedError('test-container');
      expect(error.name).toBe('ContainerDisposedError');
    });

    it('should format message with container ID', () => {
      const error = new ContainerDisposedError('my-container');
      expect(error.message).toContain('"my-container"');
      expect(error.message).toContain('disposed');
      expect(error.message).toContain('can no longer be used');
    });

    it('should store container ID', () => {
      const error = new ContainerDisposedError('test-container');
      expect(error.containerId).toBe('test-container');
    });

    it('should suggest creating a new container', () => {
      const error = new ContainerDisposedError('test-container');
      expect(error.message).toContain('Create a new container');
    });

    it('should be instanceof Error', () => {
      const error = new ContainerDisposedError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have stack trace', () => {
      const error = new ContainerDisposedError('test');
      expect(error.stack).toBeDefined();
    });
  });

  describe('ContainerRegistrationError', () => {
    it('should have correct error name', () => {
      const error = new ContainerRegistrationError('test-container', 'MyService', 'Duplicate registration');
      expect(error.name).toBe('ContainerRegistrationError');
    });

    it('should format message for string identifier', () => {
      const error = new ContainerRegistrationError('my-container', 'MyService', 'Duplicate registration');
      expect(error.message).toContain('"MyService"');
      expect(error.message).toContain('"my-container"');
      expect(error.message).toContain('Duplicate registration');
    });

    it('should format message for Token identifier', () => {
      const MyToken = new Token('MyToken');
      const error = new ContainerRegistrationError('my-container', MyToken, 'Invalid configuration');
      expect(error.message).toContain('Token<MyToken>');
      expect(error.message).toContain('Invalid configuration');
    });

    it('should format message for Token without name', () => {
      const UnnamedToken = new Token();
      const error = new ContainerRegistrationError('my-container', UnnamedToken, 'Test reason');
      expect(error.message).toContain('Token<UNSET_NAME>');
    });

    it('should format message for class identifier', () => {
      class TestClass {}
      const error = new ContainerRegistrationError('my-container', TestClass, 'Test reason');
      expect(error.message).toContain('TestClass');
    });

    it('should store container ID and reason', () => {
      const error = new ContainerRegistrationError('test-container', 'Service', 'Test reason');
      expect(error.containerId).toBe('test-container');
      expect(error.reason).toBe('Test reason');
    });

    it('should be instanceof Error', () => {
      const error = new ContainerRegistrationError('test', 'Service', 'reason');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have stack trace', () => {
      const error = new ContainerRegistrationError('test', 'Service', 'reason');
      expect(error.stack).toBeDefined();
    });
  });

  describe('ServiceResolutionError', () => {
    it('should have correct error name', () => {
      const error = new ServiceResolutionError('test-container', 'MyService');
      expect(error.name).toBe('ServiceResolutionError');
    });

    it('should format message for string identifier', () => {
      const error = new ServiceResolutionError('my-container', 'MyService');
      expect(error.message).toContain('"MyService"');
      expect(error.message).toContain('"my-container"');
      expect(error.message).toContain('Failed to resolve');
    });

    it('should format message for Token identifier', () => {
      const MyToken = new Token('MyToken');
      const error = new ServiceResolutionError('my-container', MyToken);
      expect(error.message).toContain('Token<MyToken>');
    });

    it('should format message for Token without name', () => {
      const UnnamedToken = new Token();
      const error = new ServiceResolutionError('my-container', UnnamedToken);
      expect(error.message).toContain('Token<UNSET_NAME>');
    });

    it('should format message for class identifier', () => {
      class TestClass {}
      const error = new ServiceResolutionError('my-container', TestClass);
      expect(error.message).toContain('TestClass');
    });

    it('should include cause error in message when provided', () => {
      const causeError = new Error('Underlying error');
      const error = new ServiceResolutionError('test-container', 'MyService', causeError);
      expect(error.message).toContain('Underlying error');
      expect(error.message).toContain('Underlying error: Underlying error');
    });

    it('should store container ID and cause', () => {
      const causeError = new Error('Test');
      const error = new ServiceResolutionError('test-container', 'Service', causeError);
      expect(error.containerId).toBe('test-container');
      expect(error.cause).toBe(causeError);
    });

    it('should handle missing cause', () => {
      const error = new ServiceResolutionError('test-container', 'Service');
      expect(error.cause).toBeUndefined();
      expect(error.message).not.toContain('Underlying error');
    });

    it('should be instanceof Error', () => {
      const error = new ServiceResolutionError('test', 'Service');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have stack trace', () => {
      const error = new ServiceResolutionError('test', 'Service');
      expect(error.stack).toBeDefined();
    });
  });
});
