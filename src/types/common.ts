import { RateLimitOptions } from '../utils/rate-limiter.js';

export type SupportedCurrency =
  'UGX' | 'KES' | 'GHS' | 'XAF' | 'USD' | (string & Record<never, never>);

export type SupportedNetwork =
  | 'AIRTEL'
  | 'MTN'
  | 'SAFARICOM'
  | 'AIRTELTIGO'
  | 'VODAFONE'
  | 'ORANGE'
  | (string & Record<never, never>);

export interface APIResponseEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  code?: string | number;
  reference?: string;
  internal_reference?: string;
  network?: string;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface Logger {
  debug?: (message: string, meta?: Record<string, unknown>) => void;
  info?: (message: string, meta?: Record<string, unknown>) => void;
  warn?: (message: string, meta?: Record<string, unknown>) => void;
  error?: (message: string, meta?: Record<string, unknown>) => void;
}

export interface ClientConfig {
  apiKey?: string;
  accountNumber?: string;
  webhookSecret?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  fetch?: typeof globalThis.fetch;
  logger?: Logger;
  rateLimit?: RateLimitOptions;
}

export { RateLimitOptions };
