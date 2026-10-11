import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LivePay, LivePayValidationError } from '../src/index.js';

describe('TransactionsService', () => {
  let client: LivePay;

  beforeEach(() => {
    client = new LivePay({
      apiKey: 'test-api-key',
      accountNumber: 'LP2305443309',
    });
  });

  it('should fetch transaction status by reference', async () => {
    const mockResponse = {
      success: true,
      status: 'Success',
      message: 'Transaction completed',
      reference: 'INV123',
      internal_reference: '550e8400-e29b-41d4-a716-446655440000',
      amount: 50000,
      currency: 'UGX',
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(mockResponse),
    } as Response);

    const result = await client.transactions.getStatus({
      reference: 'INV123',
    });

    expect(result).toEqual(mockResponse);
  });

  it('should fetch transaction status by internal_reference', async () => {
    const mockResponse = {
      success: true,
      status: 'Success',
      message: 'Transaction completed',
      reference: 'INV123',
      internal_reference: 'int-ref-999',
      amount: 50000,
      currency: 'UGX',
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(mockResponse),
    } as Response);

    const result = await client.transactions.getStatus({
      internal_reference: 'int-ref-999',
    });

    expect(result).toEqual(mockResponse);
  });

  it('should throw validation error if getStatus lacks account number', async () => {
    const noAccountClient = new LivePay({ apiKey: 'test-api-key' });
    await expect(noAccountClient.transactions.getStatus({ reference: 'INV123' })).rejects.toThrow(
      LivePayValidationError,
    );
  });

  it('should throw validation error if status lacks both reference and internal_reference', async () => {
    await expect(client.transactions.getStatus({})).rejects.toThrow(LivePayValidationError);
    await expect(
      client.transactions.getStatus({ reference: '   ', internal_reference: '' }),
    ).rejects.toThrow(LivePayValidationError);
  });

  it('should fetch transaction history with filters', async () => {
    const mockResponse = {
      success: true,
      transactions: [
        {
          id: '1',
          reference: 'INV123',
          internal_reference: 'abc-123',
          type: 'collection',
          amount: 50000,
          currency: 'UGX',
          status: 'Success',
          created_at: '2024-01-01 10:00:00',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(mockResponse),
    } as Response);

    const result = await client.transactions.getHistory({
      page: 1,
      limit: 10,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    expect(result).toEqual(mockResponse);
    const requestedUrl = fetchSpy.mock.calls[0][0] as string;
    expect(requestedUrl).toContain('page=1');
    expect(requestedUrl).toContain('limit=10');
    expect(requestedUrl).toContain('startDate=2024-01-01');
    expect(requestedUrl).toContain('endDate=2024-01-31');
  });

  it('should throw validation error if getHistory lacks account number', async () => {
    const noAccountClient = new LivePay({ apiKey: 'test-api-key' });
    await expect(noAccountClient.transactions.getHistory()).rejects.toThrow(LivePayValidationError);
  });

  it('should throw validation error if getHistory has invalid limit or page', async () => {
    await expect(client.transactions.getHistory({ limit: 0 })).rejects.toThrow(
      LivePayValidationError,
    );

    await expect(client.transactions.getHistory({ limit: -10 })).rejects.toThrow(
      LivePayValidationError,
    );

    await expect(client.transactions.getHistory({ limit: 1.5 })).rejects.toThrow(
      LivePayValidationError,
    );

    await expect(client.transactions.getHistory({ page: 0 })).rejects.toThrow(
      LivePayValidationError,
    );

    await expect(client.transactions.getHistory({ page: -1 })).rejects.toThrow(
      LivePayValidationError,
    );
  });

  it('should allow custom accountNumber override in params for getStatus and getHistory', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ success: true }),
    } as Response);

    await client.transactions.getStatus({
      accountNumber: 'OVERRIDE_ACC',
      reference: 'REF_1',
    });
    expect(fetchSpy.mock.calls[0][0] as string).toContain('accountNumber=OVERRIDE_ACC');

    await client.transactions.getHistory({
      accountNumber: 'OVERRIDE_ACC',
    });
    expect(fetchSpy.mock.calls[1][0] as string).toContain('accountNumber=OVERRIDE_ACC');
  });
});
