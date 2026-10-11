import { SupportedCurrency, SupportedNetwork } from './common.js';

export interface CollectMoneyParams {
  accountNumber?: string;
  phoneNumber: string;
  amount: number;
  currency: SupportedCurrency;
  reference: string;
  description: string;
  network?: SupportedNetwork;
  idempotencyKey?: string;
}

export interface CollectMoneyResponse {
  success: boolean;
  message: string;
  reference: string;
  internal_reference: string;
  network?: string;
}

export interface CardCollectionParams {
  accountNumber?: string;
  amount: number;
  currency: SupportedCurrency;
  reference: string;
  description: string;
  email: string;
  callbackUrl?: string;
  idempotencyKey?: string;
}

export interface CardCollectionResponse {
  success: boolean;
  message: string;
  reference: string;
  internal_reference: string;
  payment_url?: string;
}
