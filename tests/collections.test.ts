import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LivePay,
  LivePayValidationError,
  SupportedCurrency,
  SupportedNetwork,
} from '../src/index.js';

describe('CollectionsService', () => {
  let client: LivePay;

  beforeEach(() => {
    client = new LivePay({
      apiKey: 'test-api-key',
      accountNumber: 'LP2305443309',
    });
  });

  it('should sanitize phone number formatting characters in collectMoney', async () => {
    const mockResponse = {
      success: true,
      message: 'Collection request sent successfully',
      reference: 'INV123',
      internal_reference: '550e8400-e29b-41d4-a716-446655440000',
      network: 'MTN',
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(mockResponse),
    } as Response);

    const result = await client.collections.collectMoney({
      phoneNumber: '+256 (777) 123-456 ', // Needs sanitization -> +256777123456
      amount: 50000,
      currency: 'UGX',
      reference: 'INV123',
      description: 'Payment for invoice',
    });

    expect(result).toEqual(mockResponse);

    const requestCall = fetchSpy.mock.calls[0];
    const requestBody = JSON.parse(requestCall[1]?.body as string);
    expect(requestBody.phoneNumber).toBe('+256777123456');
  });

  it('should throw validation error if request params is missing', async () => {
    await expect(
      client.collections.collectMoney(
        null as unknown as {
          phoneNumber: string;
          amount: number;
          currency: SupportedCurrency;
          reference: string;
          description: string;
        },
      ),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if account number is missing from both config and params', async () => {
    const noAccountClient = new LivePay({ apiKey: 'test-api-key' });
    await expect(
      noAccountClient.collections.collectMoney({
        phoneNumber: '0777123456',
        amount: 50000,
        currency: 'UGX',
        reference: 'INV123',
        description: 'Payment',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if phone number is empty or whitespace', async () => {
    await expect(
      client.collections.collectMoney({
        phoneNumber: '   ',
        amount: 50000,
        currency: 'UGX',
        reference: 'INV123',
        description: 'Payment',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if amount <= 0 or NaN or Infinity', async () => {
    await expect(
      client.collections.collectMoney({
        phoneNumber: '0777123456',
        amount: 0,
        currency: 'UGX',
        reference: 'INV123',
        description: 'Payment',
      }),
    ).rejects.toThrow(LivePayValidationError);

    await expect(
      client.collections.collectMoney({
        phoneNumber: '0777123456',
        amount: -100,
        currency: 'UGX',
        reference: 'INV123',
        description: 'Payment',
      }),
    ).rejects.toThrow(LivePayValidationError);

    await expect(
      client.collections.collectMoney({
        phoneNumber: '0777123456',
        amount: Number.NaN,
        currency: 'UGX',
        reference: 'INV123',
        description: 'Payment',
      }),
    ).rejects.toThrow(LivePayValidationError);

    await expect(
      client.collections.collectMoney({
        phoneNumber: '0777123456',
        amount: Infinity,
        currency: 'UGX',
        reference: 'INV123',
        description: 'Payment',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if currency is missing', async () => {
    await expect(
      client.collections.collectMoney({
        phoneNumber: '0777123456',
        amount: 50000,
        currency: '' as unknown as SupportedCurrency,
        reference: 'INV123',
        description: 'Payment',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if reference is missing or has whitespace', async () => {
    await expect(
      client.collections.collectMoney({
        phoneNumber: '0777123456',
        amount: 50000,
        currency: 'UGX',
        reference: '',
        description: 'Payment',
      }),
    ).rejects.toThrow(LivePayValidationError);

    await expect(
      client.collections.collectMoney({
        phoneNumber: '0777123456',
        amount: 50000,
        currency: 'UGX',
        reference: 'INV 123 WITH SPACES',
        description: 'Payment for invoice',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if reference exceeds 30 characters', async () => {
    await expect(
      client.collections.collectMoney({
        phoneNumber: '0777123456',
        amount: 50000,
        currency: 'UGX',
        reference: 'A'.repeat(31),
        description: 'Payment',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if description is missing', async () => {
    await expect(
      client.collections.collectMoney({
        phoneNumber: '0777123456',
        amount: 50000,
        currency: 'UGX',
        reference: 'INV123',
        description: '',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if non-UGX currency is passed without network', async () => {
    await expect(
      client.collections.collectMoney({
        phoneNumber: '0777123456',
        amount: 50000,
        currency: 'KES',
        reference: 'INV123',
        description: 'Payment for invoice',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should succeed when non-UGX currency has valid network provided', async () => {
    const mockResponse = {
      success: true,
      message: 'Collection request sent successfully',
      reference: 'INV_KES_1',
      internal_reference: '550e8400-e29b-41d4-a716-446655440003',
      network: 'SAFARICOM',
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(mockResponse),
    } as Response);

    const result = await client.collections.collectMoney({
      phoneNumber: '0712345678',
      amount: 1500,
      currency: 'KES',
      network: 'SAFARICOM' as SupportedNetwork,
      reference: 'INV_KES_1',
      description: 'Payment in Kenya',
    });

    expect(result.success).toBe(true);
    expect(result.network).toBe('SAFARICOM');
  });

  describe('cardCollection', () => {
    it('should throw validation error if cardCollection params is missing', async () => {
      await expect(
        client.collections.cardCollection(
          null as unknown as {
            amount: number;
            currency: SupportedCurrency;
            reference: string;
            email: string;
          },
        ),
      ).rejects.toThrow(LivePayValidationError);
    });

    it('should throw validation error if account number is missing', async () => {
      const noAccountClient = new LivePay({ apiKey: 'test-api-key' });
      await expect(
        noAccountClient.collections.cardCollection({
          amount: 10000,
          currency: 'UGX',
          reference: 'CARD123',
          email: 'user@example.com',
        }),
      ).rejects.toThrow(LivePayValidationError);
    });

    it('should throw validation error if amount <= 0 or NaN', async () => {
      await expect(
        client.collections.cardCollection({
          amount: -5,
          currency: 'UGX',
          reference: 'CARD123',
          email: 'user@example.com',
        }),
      ).rejects.toThrow(LivePayValidationError);

      await expect(
        client.collections.cardCollection({
          amount: Number.NaN,
          currency: 'UGX',
          reference: 'CARD123',
          email: 'user@example.com',
        }),
      ).rejects.toThrow(LivePayValidationError);
    });

    it('should throw validation error if currency is missing', async () => {
      await expect(
        client.collections.cardCollection({
          amount: 10000,
          currency: '' as unknown as SupportedCurrency,
          reference: 'CARD123',
          email: 'user@example.com',
        }),
      ).rejects.toThrow(LivePayValidationError);
    });

    it('should throw validation error if reference is missing, has spaces, or > 30 chars', async () => {
      await expect(
        client.collections.cardCollection({
          amount: 10000,
          currency: 'UGX',
          reference: '',
          email: 'user@example.com',
        }),
      ).rejects.toThrow(LivePayValidationError);

      await expect(
        client.collections.cardCollection({
          amount: 10000,
          currency: 'UGX',
          reference: 'CARD 123 INVALID',
          email: 'user@example.com',
        }),
      ).rejects.toThrow(LivePayValidationError);

      await expect(
        client.collections.cardCollection({
          amount: 10000,
          currency: 'UGX',
          reference: 'A'.repeat(31),
          email: 'user@example.com',
        }),
      ).rejects.toThrow(LivePayValidationError);
    });

    it('should throw validation error if email is missing or invalid', async () => {
      await expect(
        client.collections.cardCollection({
          amount: 10000,
          currency: 'UGX',
          reference: 'CARD123',
          email: '',
        }),
      ).rejects.toThrow(LivePayValidationError);

      await expect(
        client.collections.cardCollection({
          amount: 10000,
          currency: 'UGX',
          reference: 'CARD123',
          email: 'invalid-email-format',
        }),
      ).rejects.toThrow(LivePayValidationError);
    });

    it('should successfully call cardCollection with callbackUrl and idempotencyKey', async () => {
      const mockResponse = {
        success: true,
        message: 'Card collection created',
        reference: 'CARD123',
        internal_reference: '550e8400-e29b-41d4-a716-446655440001',
        payment_url: 'https://checkout.livepay.me/pay/CARD123',
      };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await client.collections.cardCollection({
        amount: 10000,
        currency: 'UGX',
        reference: 'CARD123',
        description: 'Card payment test',
        email: 'user@example.com',
        callbackUrl: 'https://mysite.com/callback',
        idempotencyKey: 'idemp-card-1',
      });

      expect(result).toEqual(mockResponse);

      const call = fetchSpy.mock.calls[0];
      const headers = call[1]?.headers as Record<string, string>;
      expect(headers['Idempotency-Key']).toBe('idemp-card-1');
      const body = JSON.parse(call[1]?.body as string);
      expect(body.callbackUrl).toBe('https://mysite.com/callback');
    });
  });
});
