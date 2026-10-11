import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifySignature, LivePayValidationError } from '../src/index.js';

describe('Crypto & Webhook Signature Verification Engine', () => {
  const secret = 'super-secret-key-12345';
  const webhookUrl = 'https://api.merchant.com/webhook';

  const samplePayload = {
    status: 'Success',
    customer_reference: 'CUST-001',
    internal_reference: 'INT-002',
    extra: 'ignored-in-signature',
  };

  function createValidSignature(
    payload: Record<string, unknown>,
    timestamp: number | string,
    key = secret,
    url = webhookUrl,
  ): string {
    const paramsToSign: Record<string, string> = {};
    if (payload.status !== undefined && payload.status !== null) {
      paramsToSign.status = String(payload.status);
    }
    if (payload.customer_reference !== undefined && payload.customer_reference !== null) {
      paramsToSign.customer_reference = String(payload.customer_reference);
    }
    if (payload.internal_reference !== undefined && payload.internal_reference !== null) {
      paramsToSign.internal_reference = String(payload.internal_reference);
    }

    const sortedKeys = Object.keys(paramsToSign).sort();
    let stringToSign = url + String(timestamp);
    for (const k of sortedKeys) {
      stringToSign += k + paramsToSign[k];
    }

    return crypto.createHmac('sha256', key).update(stringToSign).digest('hex');
  }

  it('should successfully verify a valid signature with object payload', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const sig = createValidSignature(samplePayload, timestamp);
    const header = `t=${timestamp},v=${sig}`;

    const isValid = verifySignature(samplePayload, header, webhookUrl, secret);
    expect(isValid).toBe(true);
  });

  it('should successfully verify a valid signature with raw JSON string payload', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const sig = createValidSignature(samplePayload, timestamp);
    const header = `t=${timestamp},v=${sig}`;

    const isValid = verifySignature(JSON.stringify(samplePayload), header, webhookUrl, secret);
    expect(isValid).toBe(true);
  });

  it('should throw validation error on invalid JSON string payload', () => {
    const header = 't=123,v=abcdef';
    expect(() => verifySignature('not-valid-json', header, webhookUrl, secret)).toThrow(
      LivePayValidationError,
    );
  });

  it('should throw validation error on missing required arguments', () => {
    expect(() => verifySignature(samplePayload, '', webhookUrl, secret)).toThrow(
      LivePayValidationError,
    );

    expect(() => verifySignature(samplePayload, 't=1,v=a', '', secret)).toThrow(
      LivePayValidationError,
    );

    expect(() => verifySignature(samplePayload, 't=1,v=a', webhookUrl, '')).toThrow(
      LivePayValidationError,
    );

    expect(() =>
      verifySignature(null as unknown as Record<string, unknown>, 't=1,v=a', webhookUrl, secret),
    ).toThrow(LivePayValidationError);
  });

  it('should return false if header parts < 2 or missing t or v', () => {
    expect(verifySignature(samplePayload, 'singlepart', webhookUrl, secret)).toBe(false);
    expect(verifySignature(samplePayload, 'x=1,y=2', webhookUrl, secret)).toBe(false);
    expect(verifySignature(samplePayload, 't=123,x=456', webhookUrl, secret)).toBe(false);
  });

  it('should return false if signature does not match', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = `t=${timestamp},v=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef`;

    const isValid = verifySignature(samplePayload, header, webhookUrl, secret);
    expect(isValid).toBe(false);
  });

  it('should accept uppercase hex received signature (case insensitivity)', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const sig = createValidSignature(samplePayload, timestamp).toUpperCase();
    const header = `t=${timestamp},v=${sig}`;

    const isValid = verifySignature(samplePayload, header, webhookUrl, secret);
    expect(isValid).toBe(true);
  });

  it('should reject signatures outside tolerance window', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const sig = createValidSignature(samplePayload, oldTimestamp);
    const header = `t=${oldTimestamp},v=${sig}`;

    const isValid = verifySignature(samplePayload, header, webhookUrl, secret, 300);
    expect(isValid).toBe(false);
  });

  it('should accept signatures within tolerance window', () => {
    const recentTimestamp = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago
    const sig = createValidSignature(samplePayload, recentTimestamp);
    const header = `t=${recentTimestamp},v=${sig}`;

    const isValid = verifySignature(samplePayload, header, webhookUrl, secret, 300);
    expect(isValid).toBe(true);
  });

  it('should handle millisecond timestamps correctly in tolerance calculation', () => {
    const nowMs = Date.now();
    const sig = createValidSignature(samplePayload, nowMs);
    const header = `t=${nowMs},v=${sig}`;

    const isValid = verifySignature(samplePayload, header, webhookUrl, secret, 300);
    expect(isValid).toBe(true);
  });

  it('should return false if timestamp in header is not a valid number when tolerance is checked', () => {
    const header = 't=notanumber,v=abcdef123456';
    const isValid = verifySignature(samplePayload, header, webhookUrl, secret, 300);
    expect(isValid).toBe(false);
  });

  it('should throw validation error when payload is a non-string, non-object primitive', () => {
    expect(() =>
      verifySignature(12345 as unknown as Record<string, unknown>, 't=1,v=a', webhookUrl, secret),
    ).toThrow(LivePayValidationError);
  });
});
