/**
 * Base class for TypeDI errors with enhanced error information.
 * Provides error codes, suggestions, and help URLs for better developer experience.
 */
export class TypeDIError extends Error {
  /**
   * Error code in format TDI-XXX for easy identification and lookup.
   */
  public readonly code: string;

  /**
   * Optional suggestion to help fix the error.
   */
  public readonly suggestion?: string;

  /**
   * Optional URL to documentation for this error.
   */
  public readonly helpUrl?: string;

  constructor(message: string, options: { code?: string; suggestion?: string; helpUrl?: string } = {}) {
    super(message);
    this.name = 'TypeDIError';
    this.code = options.code || 'TDI-000';

    if (options.suggestion) {
      this.suggestion = options.suggestion;
    }

    if (options.helpUrl) {
      this.helpUrl = options.helpUrl;
    }

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TypeDIError);
    }
  }

  /**
   * Formats the error with all available information.
   * Includes code, message, suggestion, and help URL.
   */
  public toString(): string {
    let output = `[${this.code}] ${this.message}`;

    if (this.suggestion) {
      output += `\n\n💡 Suggestion: ${this.suggestion}`;
    }

    if (this.helpUrl) {
      output += `\n\n📚 Learn more: ${this.helpUrl}`;
    }

    return output;
  }

  /**
   * Returns a formatted string suitable for console output with colors (in supported terminals).
   */
  public toConsoleString(): string {
    const reset = '\x1b[0m';
    const red = '\x1b[31m';
    const yellow = '\x1b[33m';
    const blue = '\x1b[34m';
    const cyan = '\x1b[36m';

    let output = `${red}[${this.code}]${reset} ${this.message}`;

    if (this.suggestion) {
      output += `\n\n${yellow}💡 Suggestion:${reset} ${this.suggestion}`;
    }

    if (this.helpUrl) {
      output += `\n\n${blue}📚 Learn more:${reset} ${cyan}${this.helpUrl}${reset}`;
    }

    return output;
  }
}
