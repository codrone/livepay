import { describe, it, expect, vi } from 'vitest';
import { HTTPClient, LivePayAPIError, LivePayAuthError, Logger } from '../src/index.js';

describe('HTTPClient', () => {
  it('should throw LivePayAuthError on 401 response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ message: 'Invalid API key' }),
    } as Response);

    const http = new HTTPClient({ apiKey: 'invalid-key', maxRetries: 0 });
    await expect(http.request({ method: 'GET', path: '/test' })).rejects.toThrow(LivePayAuthError);
  });

  it('should throw LivePayAuthError on 403 response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ error: 'Access forbidden' }),
    } as Response);

    const http = new HTTPClient({ apiKey: 'forbidden-key', maxRetries: 0 });
    await expect(http.request({ method: 'GET', path: '/test' })).rejects.toThrow(LivePayAuthError);
  });

  it('should handle non-JSON text error responses and extract message', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 502,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => 'Bad Gateway Server Error',
    } as Response);

    const http = new HTTPClient({ apiKey: 'test-key', maxRetries: 0 });
    try {
      await http.request({ method: 'GET', path: '/test' });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(LivePayAPIError);
      const apiErr = err as LivePayAPIError;
      expect(apiErr.statusCode).toBe(502);
      expect(apiErr.message).toBe('Bad Gateway Server Error');
    }
  });

  it('should parse nested error object message', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ error: { message: 'Nested error occurred' } }),
    } as Response);

    const http = new HTTPClient({ apiKey: 'test-key', maxRetries: 0 });
    try {
      await http.request({ method: 'GET', path: '/test' });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(LivePayAPIError);
      const apiErr = err as LivePayAPIError;
      expect(apiErr.message).toBe('Nested error occurred');
    }
  });

  it('should parse empty 204 No Content response gracefully', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers(),
      text: async () => '',
    } as Response);

    const http = new HTTPClient({ apiKey: 'test-key' });
    const result = await http.request({ method: 'POST', path: '/action' });
    expect(result).toEqual({});
  });

  it('should normalize baseUrl trailing slashes and path leading slashes', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ success: true }),
    } as Response);

    const http = new HTTPClient({
      apiKey: 'test-key',
      baseUrl: 'https://livepay.me/api///',
    });

    await http.request({ method: 'GET', path: '///collect-money' });
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe('https://livepay.me/api/collect-money');
  });

  it('should append query parameters cleanly when path already has a query string', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ success: true }),
    } as Response);

    const http = new HTTPClient({ apiKey: 'test-key' });
    await http.request({
      method: 'GET',
      path: '/transactions?type=collection',
      params: { limit: 10 },
    });

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe('https://livepay.me/api/transactions?type=collection&limit=10');
  });

  it('should log debug, warn, and error messages when logger is configured', async () => {
    const debugLogs: string[] = [];
    const errorLogs: string[] = [];
    const logger: Logger = {
      debug: (msg) => debugLogs.push(msg),
      error: (msg) => errorLogs.push(msg),
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ message: 'Bad request' }),
    } as Response);

    const http = new HTTPClient({ apiKey: 'test-key', logger, maxRetries: 0 });
    await expect(http.request({ method: 'GET', path: '/err' })).rejects.toThrow(LivePayAPIError);

    expect(debugLogs.length).toBeGreaterThan(0);
    expect(errorLogs.length).toBeGreaterThan(0);
  });

  it('should retry on 500 server error and succeed on second attempt', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify({ message: 'Internal Server Error' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify({ success: true, retried: true }),
      } as Response);

    const http = new HTTPClient({ apiKey: 'test-key', maxRetries: 2 });
    const result = await http.request<{ success: boolean; retried: boolean }>({
      method: 'POST',
      path: '/retry-me',
      idempotencyKey: 'idem-1',
    });

    expect(result.retried).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle request abort / timeout and throw 408 error', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(() => {
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      return Promise.reject(abortErr);
    });

    const http = new HTTPClient({ apiKey: 'test-key', maxRetries: 0, timeout: 50 });
    try {
      await http.request({ method: 'GET', path: '/timeout' });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(LivePayAPIError);
      const apiErr = err as LivePayAPIError;
      expect(apiErr.statusCode).toBe(408);
      expect(apiErr.message).toContain('Request timed out');
    }
  });

  it('should throttle burst requests using rateLimiter', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ success: true }),
    } as Response);

    const http = new HTTPClient({
      apiKey: 'valid-key',
      rateLimit: { maxRequests: 2, perMilliseconds: 100 },
    });

    const startTime = Date.now();
    await Promise.all([
      http.request({ method: 'GET', path: '/r1' }),
      http.request({ method: 'GET', path: '/r2' }),
      http.request({ method: 'GET', path: '/r3' }),
    ]);
    const duration = Date.now() - startTime;

    // 3 requests with limit 2 per 100ms should take at least ~80ms
    expect(duration).toBeGreaterThanOrEqual(80);
  });

  it('should extract simple string error from responseData.error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ error: 'Direct string error' }),
    } as Response);

    const http = new HTTPClient({ apiKey: 'test-key', maxRetries: 0 });
    try {
      await http.request({ method: 'GET', path: '/str-err' });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(LivePayAPIError);
      const apiErr = err as LivePayAPIError;
      expect(apiErr.message).toBe('Direct string error');
    }
  });

  it('should retry on network error and throw after maximum retries are exhausted', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Connection reset by peer'));

    const http = new HTTPClient({ apiKey: 'test-key', maxRetries: 1 });
    await expect(http.request({ method: 'GET', path: '/net-fail' })).rejects.toThrow(
      LivePayAPIError,
    );
  });

  it('should retry on 500 and throw after maximum retries are exhausted', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ message: 'Persistent server error' }),
    } as Response);

    const http = new HTTPClient({ apiKey: 'test-key', maxRetries: 1 });
    await expect(http.request({ method: 'GET', path: '/fail-500' })).rejects.toThrow(
      LivePayAPIError,
    );
  });
});
