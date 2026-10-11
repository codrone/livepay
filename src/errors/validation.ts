import { LivePayError } from './base.js';

export class LivePayValidationError extends LivePayError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'LivePayValidationError';
    this.field = field;
  }
}
