import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { MockLivePayServer } from './mock-server.js';
import { LivePay, LivePayAuthError, LivePayAPIError, HTTPClient } from '../../src/index.js';

describe('LivePay E2E Test Suite (Local HTTP Server & Network Transport)', () => {
  let mockServer: MockLivePayServer;
  let client: LivePay;
  let baseUrl: string;

  const webhookSecret = 'test-e2e-webhook-secret';
  const apiKey = 'test-e2e-api-key';
  const accountNumber = 'LP2305443309';

  beforeAll(async () => {
    mockServer = new MockLivePayServer();
    baseUrl = await mockServer.start();

    client = new LivePay({
      apiKey,
      accountNumber,
      webhookSecret,
      baseUrl,
    });
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  describe('1. Collections E2E', () => {
    it('should complete collectMoney request over real HTTP connection', async () => {
      const response = await client.collections.collectMoney({
        phoneNumber: '+256 (777) 123-456',
        amount: 50000,
        currency: 'UGX',
        reference: 'E2E_COLLECT_1',
        description: 'E2E Collect Payment',
        idempotencyKey: 'idemp-collect-e2e-1',
      });

      expect(response.success).toBe(true);
      expect(response.message).toBe('Collection request sent successfully');
      expect(response.internal_reference).toBe('mock-internal-ref-collect-123');
      expect((response as unknown as Record<string, unknown>).received_idempotency).toBe(
        'idemp-collect-e2e-1',
      );
    });

    it('should complete cardCollection request over real HTTP connection', async () => {
      const response = await client.collections.cardCollection({
        amount: 15000,
        currency: 'UGX',
        reference: 'E2E_CARD_1',
        description: 'E2E Card Payment',
        email: 'customer@example.com',
      });

      expect(response.success).toBe(true);
      expect(response.payment_url).toContain('https://checkout.livepay.me/pay/');
    });
  });

  describe('2. Disbursements E2E', () => {
    it('should complete sendMoney request over real HTTP connection', async () => {
      const response = await client.disbursements.sendMoney({
        phoneNumber: '0777-123-456',
        amount: 25000,
        currency: 'UGX',
        reference: 'E2E_SEND_1',
        description: 'E2E Payout',
        idempotencyKey: 'idemp-send-e2e-1',
      });

      expect(response.success).toBe(true);
      expect(response.internal_reference).toBe('mock-internal-ref-send-123');
    });
  });

  describe('3. Accounts E2E', () => {
    it('should check balance over real HTTP connection', async () => {
      const response = await client.accounts.checkBalance({
        currency: 'UGX',
      });

      expect(response.success).toBe(true);
      expect(response.balance).toBe(1500000);
      expect(response.currency).toBe('UGX');
    });

    it('should validate phone number over real HTTP connection', async () => {
      const response = await client.accounts.validateNumber({
        phoneNumber: '+256777123456',
      });

      expect(response.success).toBe(true);
      expect(response.is_valid).toBe(true);
      expect(response.network).toBe('MTN');
    });
  });

  describe('4. Transactions E2E', () => {
    it('should fetch transaction status over real HTTP connection', async () => {
      const response = await client.transactions.getStatus({
        reference: 'INV123',
      });

      expect(response.success).toBe(true);
      expect(response.status).toBe('Success');
    });

    it('should fetch transaction history over real HTTP connection', async () => {
      const response = await client.transactions.getHistory({
        limit: 10,
        page: 1,
      });

      expect(response.success).toBe(true);
      expect(response.transactions).toHaveLength(1);
    });
  });

  describe('5. Error & Status Code E2E Handling', () => {
    it('should throw LivePayAuthError on 401 HTTP response', async () => {
      const invalidClient = new LivePay({
        apiKey: 'invalid-key',
        accountNumber: 'LP2305443309',
        baseUrl,
      });

      await expect(
        invalidClient.collections.collectMoney({
          phoneNumber: '0777123456',
          amount: 1000,
          currency: 'UGX',
          reference: 'ERR401',
          description: 'Auth error test',
        }),
      ).rejects.toThrow(LivePayAuthError);
    });

    it('should parse Retry-After header on 429 HTTP response', async () => {
      const http = new HTTPClient({
        apiKey,
        baseUrl: `${baseUrl}/test-429-path`,
        maxRetries: 0,
      });

      try {
        await http.request({ method: 'POST', path: '/test-429' });
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(LivePayAPIError);
        const apiErr = err as LivePayAPIError;
        expect(apiErr.statusCode).toBe(429);
        expect(apiErr.retryAfter).toBe(1);
      }
    });
  });

  describe('6. Webhooks E2E Signature & Construction Flow', () => {
    it('should verify signature and construct event from simulated HTTP payload', async () => {
      const webhookUrl = 'http://127.0.0.1:3999/webhook';
      const timestamp = String(Math.floor(Date.now() / 1000));

      const payload = {
        status: 'Success',
        customer_reference: 'INV-123',
        internal_reference: 'mock-internal-ref-collect-123',
        message: 'Payment completed successfully',
      };

      const stringToSign =
        `${webhookUrl}${timestamp}` +
        `customer_referenceINV-123` +
        `internal_referencemock-internal-ref-collect-123` +
        `statusSuccess`;

      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(stringToSign)
        .digest('hex');
      const signatureHeader = `t=${timestamp},v=${validSignature}`;

      const event = client.webhooks.constructEvent({
        payload,
        signatureHeader,
        webhookUrl,
        tolerance: 300,
      });

      expect(event.event).toBe('payment.success');
      expect(event.data.customer_reference).toBe('INV-123');
    });
  });
});

// Optional Live API Integration (runs only when credentials are explicitly supplied)
if (process.env.LIVEPAY_E2E_API_KEY && process.env.LIVEPAY_E2E_ACCOUNT_NUMBER) {
  describe('7. Live Sandbox API E2E Integration Test', () => {
    const liveClient = new LivePay({
      apiKey: process.env.LIVEPAY_E2E_API_KEY,
      accountNumber: process.env.LIVEPAY_E2E_ACCOUNT_NUMBER,
    });

    it('should query live sandbox balance', async () => {
      const res = await liveClient.accounts.checkBalance({ currency: 'UGX' });
      expect(res.success).toBe(true);
    });
  });
}
