import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { LivePay, LivePayValidationError } from '../src/index.js';

describe('WebhooksService', () => {
  const secret = 'test-secret-key';
  let client: LivePay;

  beforeEach(() => {
    client = new LivePay({
      apiKey: 'test-api-key',
      webhookSecret: secret,
    });
  });

  const webhookUrl = 'https://example.com/webhook';

  const payload = {
    status: 'Success',
    customer_reference: 'INV-123',
    internal_reference: 'abc-456',
    message: 'Payment completed successfully',
  };

  it('should correctly verify valid webhook signature', () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const stringToSign =
      `${webhookUrl}${timestamp}` +
      `customer_referenceINV-123` +
      `internal_referenceabc-456` +
      `statusSuccess`;

    const validSignature = crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');
    const signatureHeader = `t=${timestamp},v=${validSignature}`;

    const isValid = client.webhooks.verifySignature({
      payload,
      signatureHeader,
      webhookUrl,
    });

    expect(isValid).toBe(true);
  });

  it('should handle spaces after comma and uppercase hex in signature header', () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const stringToSign =
      `${webhookUrl}${timestamp}` +
      `customer_referenceINV-123` +
      `internal_referenceabc-456` +
      `statusSuccess`;

    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(stringToSign)
      .digest('hex')
      .toUpperCase();
    const signatureHeader = `t = ${timestamp} , v = ${validSignature}`;

    const isValid = client.webhooks.verifySignature({
      payload,
      signatureHeader,
      webhookUrl,
    });

    expect(isValid).toBe(true);
  });

  it('should verify signature when secret is provided in options override', () => {
    const customSecret = 'custom-override-secret';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const stringToSign =
      `${webhookUrl}${timestamp}` +
      `customer_referenceINV-123` +
      `internal_referenceabc-456` +
      `statusSuccess`;

    const validSignature = crypto
      .createHmac('sha256', customSecret)
      .update(stringToSign)
      .digest('hex');
    const signatureHeader = `t=${timestamp},v=${validSignature}`;

    const isValid = client.webhooks.verifySignature({
      payload,
      signatureHeader,
      webhookUrl,
      secret: customSecret,
    });

    expect(isValid).toBe(true);
  });

  it('should throw validation error when webhook secret is missing from both options and client config', () => {
    const noSecretClient = new LivePay({ apiKey: 'test-api-key' });
    expect(() =>
      noSecretClient.webhooks.verifySignature({
        payload,
        signatureHeader: 't=1,v=abc',
        webhookUrl,
      }),
    ).toThrow(LivePayValidationError);
  });

  it('should throw validation error when verifySignature options is null', () => {
    expect(() =>
      client.webhooks.verifySignature(
        null as unknown as {
          payload: Record<string, unknown>;
          signatureHeader: string;
          webhookUrl: string;
        },
      ),
    ).toThrow(LivePayValidationError);
  });

  it('should parse webhook event and normalize statuses correctly', () => {
    const successEvent = client.webhooks.parseEvent({ status: 'completed', amount: 500 });
    expect(successEvent.event).toBe('payment.success');

    const successfulEvent = client.webhooks.parseEvent({ status: 'successful', amount: 500 });
    expect(successfulEvent.event).toBe('payment.success');

    const failedEvent = client.webhooks.parseEvent({ status: 'failed' });
    expect(failedEvent.event).toBe('payment.failed');

    const cancelledEvent = client.webhooks.parseEvent({ status: 'cancelled' });
    expect(cancelledEvent.event).toBe('payment.failed');

    const pendingEvent = client.webhooks.parseEvent({ status: 'pending' });
    expect(pendingEvent.event).toBe('payment.pending');

    const otherEvent = client.webhooks.parseEvent({ status: 'unknown_status' });
    expect(otherEvent.event).toBe('payment.pending');
  });

  it('should parse webhook event from raw JSON string', () => {
    const jsonStr = JSON.stringify({ status: 'Success', customer_reference: 'REF1' });
    const parsed = client.webhooks.parseEvent(jsonStr);
    expect(parsed.event).toBe('payment.success');
    expect(parsed.data.customer_reference).toBe('REF1');
  });

  it('should throw validation error on invalid JSON string in parseEvent', () => {
    expect(() => client.webhooks.parseEvent('{invalid-json')).toThrow(LivePayValidationError);
    expect(() => client.webhooks.parseEvent('')).toThrow(LivePayValidationError);
    expect(() => client.webhooks.parseEvent(null as unknown as string)).toThrow(
      LivePayValidationError,
    );
  });

  it('should construct typed event and throw on invalid signature in constructEvent', () => {
    expect(() =>
      client.webhooks.constructEvent({
        payload,
        signatureHeader: 't=123,v=invalidsignature',
        webhookUrl,
      }),
    ).toThrow(LivePayValidationError);
  });

  it('should prevent duplicate webhook event processing when deduplicate option is true and clear cache', () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const stringToSign =
      `${webhookUrl}${timestamp}` +
      `customer_referenceINV-123` +
      `internal_referenceabc-456` +
      `statusSuccess`;

    const validSignature = crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');
    const signatureHeader = `t=${timestamp},v=${validSignature}`;

    // First construct succeeds
    const firstEvent = client.webhooks.constructEvent({
      payload,
      signatureHeader,
      webhookUrl,
      deduplicate: true,
    });
    expect(firstEvent.event).toBe('payment.success');

    // Duplicate construct throws LivePayValidationError
    expect(() =>
      client.webhooks.constructEvent({
        payload,
        signatureHeader,
        webhookUrl,
        deduplicate: true,
      }),
    ).toThrow(LivePayValidationError);

    // After clearing cache, same event can be processed again
    client.webhooks.clearDeduplicationCache();
    const afterClearEvent = client.webhooks.constructEvent({
      payload,
      signatureHeader,
      webhookUrl,
      deduplicate: true,
    });
    expect(afterClearEvent.event).toBe('payment.success');
  });

  it('should deduplicate using provider_transaction_id if present', () => {
    const customPayload = {
      status: 'Success',
      provider_transaction_id: 'provider-tx-777',
    };

    const timestamp = String(Math.floor(Date.now() / 1000));
    const stringToSign = `${webhookUrl}${timestamp}statusSuccess`;
    const validSignature = crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');
    const signatureHeader = `t=${timestamp},v=${validSignature}`;

    client.webhooks.constructEvent({
      payload: customPayload,
      signatureHeader,
      webhookUrl,
      deduplicate: true,
    });

    expect(() =>
      client.webhooks.constructEvent({
        payload: customPayload,
        signatureHeader,
        webhookUrl,
        deduplicate: true,
      }),
    ).toThrow(LivePayValidationError);
  });

  it('should throw validation error when payload is non-string and non-object primitive', () => {
    expect(() => client.webhooks.parseEvent(12345 as unknown as string)).toThrow(
      LivePayValidationError,
    );
  });
});
