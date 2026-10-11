import { SupportedCurrency } from './common.js';

export interface ValidateNumberParams {
  phoneNumber: string;
}

export interface ValidateNumberResponse {
  success: boolean;
  message?: string;
  phone_number?: string;
  network?: string;
  name?: string;
  is_valid?: boolean;
}

export interface CheckBalanceParams {
  accountNumber?: string;
  currency: SupportedCurrency;
}

export interface CheckBalanceResponse {
  success: boolean;
  account_number: string;
  currency: SupportedCurrency;
  balance: number;
  status: string;
}
