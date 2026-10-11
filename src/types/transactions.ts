import { SupportedCurrency } from './common.js';

export interface TransactionStatusParams {
  accountNumber?: string;
  reference?: string;
  internal_reference?: string;
}

export interface TransactionStatusResponse {
  success: boolean;
  status: 'Success' | 'Pending' | 'Failed' | string;
  message: string;
  reference: string;
  internal_reference: string;
  amount?: number;
  currency?: SupportedCurrency;
  created_at?: string;
}

export interface TransactionHistoryParams {
  accountNumber?: string;
  limit?: number;
  page?: number;
  startDate?: string;
  endDate?: string;
}

export interface TransactionItem {
  id: string;
  reference: string;
  internal_reference: string;
  type: 'collection' | 'disbursement' | string;
  amount: number;
  currency: SupportedCurrency;
  status: string;
  phone_number?: string;
  created_at: string;
}

export interface TransactionHistoryResponse {
  success: boolean;
  transactions: TransactionItem[];
  total?: number;
  page?: number;
  limit?: number;
}
