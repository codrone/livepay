import crypto from 'node:crypto';
import { LivePayValidationError } from '../errors/validation.js';

function constantTimeCompare(a: string, b: string): boolean {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.timingSafeEqual === 'function' &&
    typeof Buffer !== 'undefined'
  ) {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    if (bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  }

  // Portable constant-time comparison fallback for environments without Buffer
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function verifySignature(
  payload: Record<string, unknown> | string,
  signatureHeader: string,
  webhookUrl: string,
  secret: string,
  tolerance?: number,
): boolean {
  if (!signatureHeader) {
    throw new LivePayValidationError('Missing signature header', 'signatureHeader');
  }
  if (!secret) {
    throw new LivePayValidationError('Missing webhook secret', 'secret');
  }
  if (!webhookUrl) {
    throw new LivePayValidationError('Missing webhook URL', 'webhookUrl');
  }
  if (!payload) {
    throw new LivePayValidationError('Missing webhook payload', 'payload');
  }

  let parsedPayload: Record<string, unknown>;
  if (typeof payload === 'string') {
    try {
      parsedPayload = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      throw new LivePayValidationError('Invalid JSON string payload', 'payload');
    }
  } else if (typeof payload === 'object') {
    parsedPayload = payload;
  } else {
    throw new LivePayValidationError('Invalid payload format', 'payload');
  }

  const parts = signatureHeader.split(',').map((p) => p.trim());
  if (parts.length < 2) {
    return false;
  }

  let timestampStr = '';
  let receivedSignature = '';

  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key === 't') {
      timestampStr = val;
    } else if (key === 'v') {
      receivedSignature = val;
    }
  }

  if (!timestampStr || !receivedSignature) {
    return false;
  }

  if (tolerance !== undefined && tolerance > 0) {
    const timestampNum = parseInt(timestampStr, 10);
    if (isNaN(timestampNum)) {
      return false;
    }
    const tsSeconds = timestampNum > 1e11 ? Math.floor(timestampNum / 1000) : timestampNum;
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - tsSeconds) > tolerance) {
      return false;
    }
  }

  const paramsToSign: Record<string, string> = {};
  if (parsedPayload.status !== undefined && parsedPayload.status !== null) {
    paramsToSign.status = String(parsedPayload.status);
  }
  if (parsedPayload.customer_reference !== undefined && parsedPayload.customer_reference !== null) {
    paramsToSign.customer_reference = String(parsedPayload.customer_reference);
  }
  if (parsedPayload.internal_reference !== undefined && parsedPayload.internal_reference !== null) {
    paramsToSign.internal_reference = String(parsedPayload.internal_reference);
  }

  const sortedKeys = Object.keys(paramsToSign).sort();
  let stringToSign = webhookUrl + timestampStr;

  for (const key of sortedKeys) {
    stringToSign += key + paramsToSign[key];
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');

  return constantTimeCompare(expectedSignature.toLowerCase(), receivedSignature.toLowerCase());
}
