import { TypeDIError } from '../../src/error/typedi-error.base';

describe('TypeDIError', () => {
  describe('constructor', () => {
    it('should set name to "TypeDIError"', () => {
      const error = new TypeDIError('test message');
      expect(error.name).toBe('TypeDIError');
    });

    it('should use default code "TDI-000" when no code provided', () => {
      const error = new TypeDIError('test message');
      expect(error.code).toBe('TDI-000');
    });

    it('should use custom code when provided', () => {
      const error = new TypeDIError('test message', { code: 'TDI-042' });
      expect(error.code).toBe('TDI-042');
    });

    it('should store suggestion when provided', () => {
      const error = new TypeDIError('test message', { suggestion: 'Try this fix' });
      expect(error.suggestion).toBe('Try this fix');
    });

    it('should leave suggestion undefined when not provided', () => {
      const error = new TypeDIError('test message');
      expect(error.suggestion).toBeUndefined();
    });

    it('should store helpUrl when provided', () => {
      const error = new TypeDIError('test message', { helpUrl: 'https://example.com/docs' });
      expect(error.helpUrl).toBe('https://example.com/docs');
    });

    it('should leave helpUrl undefined when not provided', () => {
      const error = new TypeDIError('test message');
      expect(error.helpUrl).toBeUndefined();
    });

    it('should be instanceof Error', () => {
      const error = new TypeDIError('test message');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have a stack trace', () => {
      const error = new TypeDIError('test message');
      expect(error.stack).toBeDefined();
    });
  });

  describe('toString()', () => {
    it('should return "[code] message" without suggestion or helpUrl', () => {
      const error = new TypeDIError('something went wrong', { code: 'TDI-001' });
      expect(error.toString()).toBe('[TDI-001] something went wrong');
    });

    it('should return "[TDI-000] message" with default code', () => {
      const error = new TypeDIError('something went wrong');
      expect(error.toString()).toBe('[TDI-000] something went wrong');
    });

    it('should include suggestion when provided', () => {
      const error = new TypeDIError('bad error', {
        code: 'TDI-010',
        suggestion: 'Check your imports',
      });
      const result = error.toString();
      expect(result).toContain('💡 Suggestion: Check your imports');
    });

    it('should include helpUrl when provided', () => {
      const error = new TypeDIError('bad error', {
        code: 'TDI-010',
        helpUrl: 'https://docs.example.com/error',
      });
      const result = error.toString();
      expect(result).toContain('📚 Learn more: https://docs.example.com/error');
    });

    it('should include both suggestion and helpUrl when both provided', () => {
      const error = new TypeDIError('bad error', {
        code: 'TDI-099',
        suggestion: 'Fix the thing',
        helpUrl: 'https://docs.example.com',
      });
      const result = error.toString();
      expect(result).toContain('[TDI-099] bad error');
      expect(result).toContain('💡 Suggestion: Fix the thing');
      expect(result).toContain('📚 Learn more: https://docs.example.com');
    });

    it('should not include suggestion label when no suggestion', () => {
      const error = new TypeDIError('test', { code: 'TDI-001' });
      expect(error.toString()).not.toContain('💡');
    });

    it('should not include helpUrl label when no helpUrl', () => {
      const error = new TypeDIError('test', { code: 'TDI-001' });
      expect(error.toString()).not.toContain('📚');
    });
  });

  describe('toConsoleString()', () => {
    it('should include the error message', () => {
      const error = new TypeDIError('console output message', { code: 'TDI-001' });
      expect(error.toConsoleString()).toContain('console output message');
    });

    it('should include ANSI escape sequences (color codes)', () => {
      const error = new TypeDIError('test message', { code: 'TDI-001' });
      const result = error.toConsoleString();
      // ANSI escape sequences start with \x1b[
      expect(result).toContain('\x1b[');
    });

    it('should include the error code', () => {
      const error = new TypeDIError('test message', { code: 'TDI-042' });
      expect(error.toConsoleString()).toContain('TDI-042');
    });

    it('should include suggestion with ANSI coloring when provided', () => {
      const error = new TypeDIError('test message', {
        code: 'TDI-001',
        suggestion: 'Add @Service() decorator',
      });
      const result = error.toConsoleString();
      expect(result).toContain('Add @Service() decorator');
      expect(result).toContain('💡 Suggestion:');
    });

    it('should include helpUrl with ANSI coloring when provided', () => {
      const error = new TypeDIError('test message', {
        code: 'TDI-001',
        helpUrl: 'https://docs.example.com',
      });
      const result = error.toConsoleString();
      expect(result).toContain('https://docs.example.com');
      expect(result).toContain('📚 Learn more:');
    });

    it('should not include suggestion section when no suggestion', () => {
      const error = new TypeDIError('test', { code: 'TDI-001' });
      expect(error.toConsoleString()).not.toContain('💡');
    });

    it('should not include helpUrl section when no helpUrl', () => {
      const error = new TypeDIError('test', { code: 'TDI-001' });
      expect(error.toConsoleString()).not.toContain('📚');
    });

    it('should include reset ANSI code', () => {
      const error = new TypeDIError('test message', { code: 'TDI-001' });
      // Reset code is \x1b[0m
      expect(error.toConsoleString()).toContain('\x1b[0m');
    });
  });
});
