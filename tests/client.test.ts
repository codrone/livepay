import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LivePay, LivePayValidationError } from '../src/index.js';

describe('LivePay Client Initialization', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.LIVEPAY_API_KEY;
    delete process.env.LIVEPAY_ACCOUNT_NUMBER;
    delete process.env.LIVEPAY_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should initialize successfully with explicit options', () => {
    const client = new LivePay({
      apiKey: 'test-api-key',
      accountNumber: 'LP1234567890',
      webhookSecret: 'test-secret',
    });

    expect(client).toBeInstanceOf(LivePay);
    expect(client.collections).toBeDefined();
    expect(client.disbursements).toBeDefined();
    expect(client.accounts).toBeDefined();
    expect(client.transactions).toBeDefined();
    expect(client.webhooks).toBeDefined();
  });

  it('should initialize using environment variables', () => {
    process.env.LIVEPAY_API_KEY = 'env-api-key';
    process.env.LIVEPAY_ACCOUNT_NUMBER = 'LP9876543210';
    process.env.LIVEPAY_WEBHOOK_SECRET = 'env-secret';

    const client = new LivePay();
    expect(client.getConfig().apiKey).toBe('env-api-key');
    expect(client.getConfig().accountNumber).toBe('LP9876543210');
    expect(client.getConfig().webhookSecret).toBe('env-secret');
  });

  it('should throw LivePayValidationError when apiKey is missing', () => {
    expect(() => new LivePay()).toThrow(LivePayValidationError);
  });
});
