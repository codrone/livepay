import { verifySignature } from '../utils/crypto.js';
import { WebhookPayload, VerifySignatureOptions, ParsedWebhookEvent } from '../types/webhooks.js';
import { LivePayValidationError } from '../errors/validation.js';
import { DeduplicationCache } from '../utils/dedup-cache.js';

export class WebhooksService {
  private readonly dedupCache = new DeduplicationCache();

  constructor(private readonly defaultWebhookSecret?: string) {}

  public verifySignature(options: VerifySignatureOptions): boolean {
    if (!options) {
      throw new LivePayValidationError('Verification options are required', 'options');
    }

    const secret = options.secret || this.defaultWebhookSecret;
    if (!secret) {
      throw new LivePayValidationError(
        'Webhook secret is required. Provide it in options or set webhookSecret in client config.',
        'secret',
      );
    }

    return verifySignature(
      options.payload,
      options.signatureHeader,
      options.webhookUrl,
      secret,
      options.tolerance,
    );
  }

  public parseEvent(payload: string | Record<string, unknown>): ParsedWebhookEvent {
    if (!payload) {
      throw new LivePayValidationError('Webhook payload is required', 'payload');
    }

    let payloadObj: WebhookPayload;

    if (typeof payload === 'string') {
      try {
        payloadObj = JSON.parse(payload) as WebhookPayload;
      } catch {
        throw new LivePayValidationError('Invalid JSON string payload', 'payload');
      }
    } else if (typeof payload === 'object') {
      payloadObj = payload as WebhookPayload;
    } else {
      throw new LivePayValidationError('Invalid payload format', 'payload');
    }

    if (!payloadObj || typeof payloadObj !== 'object') {
      throw new LivePayValidationError('Invalid webhook payload object', 'payload');
    }

    const status = payloadObj.status ? String(payloadObj.status).toLowerCase().trim() : '';

    if (status === 'success' || status === 'successful' || status === 'completed') {
      return {
        event: 'payment.success',
        data: payloadObj,
      };
    } else if (
      status === 'failed' ||
      status === 'failure' ||
      status === 'cancelled' ||
      status === 'canceled' ||
      status === 'rejected'
    ) {
      return {
        event: 'payment.failed',
        data: payloadObj,
      };
    } else {
      return {
        event: 'payment.pending',
        data: payloadObj,
      };
    }
  }

  public constructEvent(options: VerifySignatureOptions): ParsedWebhookEvent {
    const isValid = this.verifySignature(options);
    if (!isValid) {
      throw new LivePayValidationError(
        'Webhook signature verification failed or timestamp exceeds tolerance',
        'signatureHeader',
      );
    }

    const event = this.parseEvent(options.payload);

    if (options.deduplicate) {
      const eventId =
        event.data.internal_reference ||
        event.data.customer_reference ||
        event.data.provider_transaction_id;
      if (eventId) {
        if (this.dedupCache.isDuplicate(String(eventId))) {
          throw new LivePayValidationError(
            `Duplicate webhook event received for reference: ${eventId}`,
            'deduplicate',
          );
        }
        this.dedupCache.mark(String(eventId));
      }
    }

    return event;
  }

  public clearDeduplicationCache(): void {
    this.dedupCache.clear();
  }
}
