import { SupportedCurrency, SupportedNetwork } from './common.js';

export interface WebhookPayload {
  status: 'Success' | 'Failed' | 'Pending' | string;
  message: string;
  customer_reference: string;
  internal_reference: string;
  provider_transaction_id?: string;
  msisdn?: string;
  amount?: number;
  currency?: SupportedCurrency;
  provider?: SupportedNetwork;
  charge?: number;
  completed_at?: string;
  [key: string]: unknown;
}

export interface VerifySignatureOptions {
  payload: Record<string, unknown> | WebhookPayload;
  signatureHeader: string;
  webhookUrl: string;
  secret?: string;
  tolerance?: number;
  deduplicate?: boolean;
}

export type ParsedWebhookEvent =
  | {
      event: 'payment.success';
      data: WebhookPayload;
    }
  | {
      event: 'payment.failed';
      data: WebhookPayload;
    }
  | {
      event: 'payment.pending';
      data: WebhookPayload;
    };
