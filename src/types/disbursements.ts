import { SupportedCurrency, SupportedNetwork } from './common.js';

export interface SendMoneyParams {
  accountNumber?: string;
  phoneNumber: string;
  amount: number;
  currency: SupportedCurrency;
  reference: string;
  description: string;
  network?: SupportedNetwork;
  idempotencyKey?: string;
}

export interface SendMoneyResponse {
  success: boolean;
  message: string;
  reference: string;
  internal_reference: string;
}
