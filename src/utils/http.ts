import { LivePayAPIError } from '../errors/api.js';
import { LivePayAuthError } from '../errors/auth.js';
import { Logger } from '../types/common.js';
import { RateLimiter, RateLimitOptions } from './rate-limiter.js';

export interface HTTPClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  fetch?: typeof globalThis.fetch;
  logger?: Logger;
  rateLimit?: RateLimitOptions;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

export class HTTPClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly customFetch?: typeof globalThis.fetch;
  private readonly logger?: Logger;
  private readonly rateLimiter?: RateLimiter;

  constructor(options: HTTPClientOptions) {
    this.apiKey = options.apiKey;
    let base = options.baseUrl || 'https://livepay.me/api';
    while (base.endsWith('/')) {
      base = base.slice(0, -1);
    }
    this.baseUrl = base;
    this.timeout = options.timeout ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
    this.customFetch = options.fetch;
    this.logger = options.logger;
    if (options.rateLimit) {
      this.rateLimiter = new RateLimiter(options.rateLimit);
    }
  }

  public async request<T>(options: RequestOptions): Promise<T> {
    const fetchImpl = this.customFetch || globalThis.fetch;
    let cleanPath = options.path;
    while (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.slice(1);
    }
    let url = `${this.baseUrl}/${cleanPath}`;

    if (options.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      if (this.rateLimiter) {
        await this.rateLimiter.acquireToken();
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      this.logger?.debug?.('Sending HTTP request', {
        method: options.method,
        url,
        attempt: attempt + 1,
      });

      try {
        const hasBody =
          options.method !== 'GET' && options.body !== undefined && options.body !== null;

        const response = await fetchImpl(url, {
          method: options.method,
          headers,
          body: hasBody ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        let responseData: Record<string, unknown> = {};
        const text = await response.text();
        if (text && text.trim().length > 0) {
          try {
            responseData = JSON.parse(text) as Record<string, unknown>;
          } catch {
            responseData = { message: text };
          }
        }

        if (response.ok) {
          this.logger?.debug?.('HTTP request succeeded', {
            method: options.method,
            url,
            status: response.status,
          });
          return responseData as unknown as T;
        }

        let errorMessage: string = `HTTP request failed with status ${response.status}`;
        if (typeof responseData.message === 'string') {
          errorMessage = responseData.message;
        } else if (typeof responseData.error === 'string') {
          errorMessage = responseData.error;
        } else if (
          responseData.error &&
          typeof (responseData.error as Record<string, unknown>).message === 'string'
        ) {
          errorMessage = (responseData.error as Record<string, unknown>).message as string;
        }

        if (response.status === 401 || response.status === 403) {
          this.logger?.error?.('HTTP auth error', {
            status: response.status,
            message: errorMessage,
          });
          throw new LivePayAuthError(errorMessage);
        }

        const retryAfterHeader = response.headers.get('retry-after');
        const parsedRetryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
        const retryAfterSeconds =
          parsedRetryAfter !== undefined && !isNaN(parsedRetryAfter) ? parsedRetryAfter : undefined;

        const apiError = new LivePayAPIError(
          errorMessage,
          response.status,
          responseData,
          retryAfterSeconds,
        );

        if ((response.status >= 500 || response.status === 429) && attempt < this.maxRetries) {
          lastError = apiError;
          attempt++;
          const delay =
            retryAfterSeconds !== undefined ? retryAfterSeconds * 1000 : Math.pow(2, attempt) * 200;
          this.logger?.warn?.(
            `HTTP request failed (status ${response.status}). Retrying in ${delay}ms...`,
            {
              attempt,
              delay,
            },
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        this.logger?.error?.('HTTP API error', { status: response.status, message: errorMessage });
        throw apiError;
      } catch (err: unknown) {
        clearTimeout(timer);

        if (err instanceof LivePayAuthError || err instanceof LivePayAPIError) {
          throw err;
        }

        const errorObj = err instanceof Error ? err : new Error(String(err));
        const isAbort = errorObj.name === 'AbortError' || errorObj.name === 'TimeoutError';
        const isNetwork = !isAbort;
        const requestError = isAbort
          ? new LivePayAPIError(`Request timed out after ${this.timeout}ms`, 408)
          : new LivePayAPIError(errorObj.message || 'Network request failed', 0);

        if ((isAbort || isNetwork) && attempt < this.maxRetries) {
          lastError = requestError;
          attempt++;
          const delay = Math.pow(2, attempt) * 200;
          this.logger?.warn?.(
            `Network request error (${errorObj.message}). Retrying in ${delay}ms...`,
            {
              attempt,
              delay,
            },
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        this.logger?.error?.('HTTP client request error', { message: requestError.message });
        throw requestError;
      }
    }

    throw lastError || new LivePayAPIError('Request failed after maximum retries', 0);
  }
}
