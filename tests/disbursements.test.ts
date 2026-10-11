import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LivePay,
  LivePayValidationError,
  SupportedCurrency,
  SupportedNetwork,
} from '../src/index.js';

describe('DisbursementsService', () => {
  let client: LivePay;

  beforeEach(() => {
    client = new LivePay({
      apiKey: 'test-api-key',
      accountNumber: 'LP2305443309',
    });
  });

  it('should successfully send money with valid params', async () => {
    const mockResponse = {
      success: true,
      message: 'Payment request in progress.',
      reference: 'WITHDRAW123',
      internal_reference: '550e8400-e29b-41d4-a716-446655440002',
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(mockResponse),
    } as Response);

    const result = await client.disbursements.sendMoney({
      phoneNumber: '0777123456',
      amount: 20000,
      currency: 'UGX',
      reference: 'WITHDRAW123',
      description: 'Payout salary',
      idempotencyKey: 'idemp-send-1',
    });

    expect(result).toEqual(mockResponse);
    const call = fetchSpy.mock.calls[0];
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('idemp-send-1');
  });

  it('should throw validation error if sendMoney params is missing', async () => {
    await expect(
      client.disbursements.sendMoney(
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

  it('should throw validation error if account number is missing from config and params', async () => {
    const noAccountClient = new LivePay({ apiKey: 'test-api-key' });
    await expect(
      noAccountClient.disbursements.sendMoney({
        phoneNumber: '0777123456',
        amount: 20000,
        currency: 'UGX',
        reference: 'WITHDRAW123',
        description: 'Payout',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if phoneNumber is missing or whitespace', async () => {
    await expect(
      client.disbursements.sendMoney({
        phoneNumber: '   ',
        amount: 20000,
        currency: 'UGX',
        reference: 'WITHDRAW123',
        description: 'Payout',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if amount <= 0, NaN, or Infinity', async () => {
    await expect(
      client.disbursements.sendMoney({
        phoneNumber: '0777123456',
        amount: -50,
        currency: 'UGX',
        reference: 'WITHDRAW123',
        description: 'Payout salary',
      }),
    ).rejects.toThrow(LivePayValidationError);

    await expect(
      client.disbursements.sendMoney({
        phoneNumber: '0777123456',
        amount: 0,
        currency: 'UGX',
        reference: 'WITHDRAW123',
        description: 'Payout salary',
      }),
    ).rejects.toThrow(LivePayValidationError);

    await expect(
      client.disbursements.sendMoney({
        phoneNumber: '0777123456',
        amount: Number.NaN,
        currency: 'UGX',
        reference: 'WITHDRAW123',
        description: 'Payout salary',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if currency is missing', async () => {
    await expect(
      client.disbursements.sendMoney({
        phoneNumber: '0777123456',
        amount: 20000,
        currency: '' as unknown as SupportedCurrency,
        reference: 'WITHDRAW123',
        description: 'Payout',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if reference is missing, has spaces, or > 30 chars', async () => {
    await expect(
      client.disbursements.sendMoney({
        phoneNumber: '0777123456',
        amount: 20000,
        currency: 'UGX',
        reference: '',
        description: 'Payout',
      }),
    ).rejects.toThrow(LivePayValidationError);

    await expect(
      client.disbursements.sendMoney({
        phoneNumber: '0777123456',
        amount: 20000,
        currency: 'UGX',
        reference: 'REF WITH SPACES',
        description: 'Payout',
      }),
    ).rejects.toThrow(LivePayValidationError);

    await expect(
      client.disbursements.sendMoney({
        phoneNumber: '0777123456',
        amount: 20000,
        currency: 'UGX',
        reference: 'W'.repeat(31),
        description: 'Payout',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if description is missing', async () => {
    await expect(
      client.disbursements.sendMoney({
        phoneNumber: '0777123456',
        amount: 20000,
        currency: 'UGX',
        reference: 'WITHDRAW123',
        description: '',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if non-UGX currency lacks network', async () => {
    await expect(
      client.disbursements.sendMoney({
        phoneNumber: '0777123456',
        amount: 20000,
        currency: 'GHS',
        reference: 'WITHDRAW123',
        description: 'Payout Ghana',
      }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should succeed for non-UGX currency when network is specified', async () => {
    const mockResponse = {
      success: true,
      message: 'Payment request in progress.',
      reference: 'WITHDRAW_GHS_1',
      internal_reference: '550e8400-e29b-41d4-a716-446655440004',
      network: 'MTN',
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(mockResponse),
    } as Response);

    const result = await client.disbursements.sendMoney({
      phoneNumber: '0241234567',
      amount: 150,
      currency: 'GHS',
      network: 'MTN' as SupportedNetwork,
      reference: 'WITHDRAW_GHS_1',
      description: 'Payout Ghana',
    });

    expect(result.success).toBe(true);
  });
});
