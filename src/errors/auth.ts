import { LivePayError } from './base.js';

export class LivePayAuthError extends LivePayError {
  constructor(message: string = 'Authentication failed. Please check your LivePay API key.') {
    super(message);
    this.name = 'LivePayAuthError';
  }
}
