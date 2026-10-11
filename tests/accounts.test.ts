import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LivePay, LivePayValidationError, SupportedCurrency } from '../src/index.js';

describe('AccountsService', () => {
  let client: LivePay;

  beforeEach(() => {
    client = new LivePay({
      apiKey: 'test-api-key',
      accountNumber: 'LP2305443309',
    });
  });

  it('should validate phone number successfully', async () => {
    const mockResponse = {
      success: true,
      phone_number: '0777123456',
      network: 'MTN',
      name: 'John Doe',
      is_valid: true,
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(mockResponse),
    } as Response);

    const result = await client.accounts.validateNumber({
      phoneNumber: '0777123456',
    });

    expect(result).toEqual(mockResponse);
  });

  it('should throw validation error when validateNumber lacks phone number or has whitespace', async () => {
    await expect(
      client.accounts.validateNumber(null as unknown as { phoneNumber: string }),
    ).rejects.toThrow(LivePayValidationError);

    await expect(client.accounts.validateNumber({ phoneNumber: '' })).rejects.toThrow(
      LivePayValidationError,
    );

    await expect(client.accounts.validateNumber({ phoneNumber: '   ' })).rejects.toThrow(
      LivePayValidationError,
    );
  });

  it('should check balance successfully', async () => {
    const mockResponse = {
      success: true,
      account_number: 'LP2305443309',
      currency: 'UGX',
      balance: 1500000,
      status: 'active',
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(mockResponse),
    } as Response);

    const result = await client.accounts.checkBalance({
      currency: 'UGX',
    });

    expect(result).toEqual(mockResponse);
  });

  it('should throw error when checkBalance lacks params, account number, or currency', async () => {
    await expect(
      client.accounts.checkBalance(null as unknown as { currency: SupportedCurrency }),
    ).rejects.toThrow(LivePayValidationError);

    const noAccountClient = new LivePay({ apiKey: 'test-api-key' });
    await expect(
      noAccountClient.accounts.checkBalance({
        currency: 'UGX',
      }),
    ).rejects.toThrow(LivePayValidationError);

    await expect(
      client.accounts.checkBalance({
        currency: '' as unknown as SupportedCurrency,
      }),
    ).rejects.toThrow(LivePayValidationError);
  });
});
