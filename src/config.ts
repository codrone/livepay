import { ClientConfig, Logger, RateLimitOptions } from './types/common.js';

export type ResolvedClientConfig = Required<
  Omit<ClientConfig, 'fetch' | 'logger' | 'rateLimit'>
> & {
  fetch?: typeof globalThis.fetch;
  logger?: Logger;
  rateLimit?: RateLimitOptions;
};

export function resolveClientConfig(config: ClientConfig = {}): ResolvedClientConfig {
  const safeConfig = config || {};
  const env = typeof process !== 'undefined' && process && process.env ? process.env : {};

  const apiKey = (safeConfig.apiKey || env.LIVEPAY_API_KEY || '').trim();
  const accountNumber = (safeConfig.accountNumber || env.LIVEPAY_ACCOUNT_NUMBER || '').trim();
  const webhookSecret = (safeConfig.webhookSecret || env.LIVEPAY_WEBHOOK_SECRET || '').trim();
  const baseUrl = (safeConfig.baseUrl || env.LIVEPAY_BASE_URL || 'https://livepay.me/api').trim();
  const timeout = safeConfig.timeout ?? 30000;
  const maxRetries = safeConfig.maxRetries ?? 3;
  const fetchImpl = safeConfig.fetch;
  const loggerImpl = safeConfig.logger;
  const rateLimitImpl = safeConfig.rateLimit;

  return {
    apiKey,
    accountNumber,
    webhookSecret,
    baseUrl,
    timeout,
    maxRetries,
    fetch: fetchImpl,
    logger: loggerImpl,
    rateLimit: rateLimitImpl,
  };
}
