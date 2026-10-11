import { LivePayError } from './base.js';

export class LivePayAPIError extends LivePayError {
  public readonly statusCode: number;
  public readonly responseBody?: Record<string, unknown>;
  public readonly retryAfter?: number;

  constructor(
    message: string,
    statusCode: number,
    responseBody?: Record<string, unknown>,
    retryAfter?: number,
  ) {
    super(message);
    this.name = 'LivePayAPIError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.retryAfter = retryAfter;
  }
}
