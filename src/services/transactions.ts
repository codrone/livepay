import { HTTPClient } from '../utils/http.js';
import {
  TransactionStatusParams,
  TransactionStatusResponse,
  TransactionHistoryParams,
  TransactionHistoryResponse,
} from '../types/transactions.js';
import { LivePayValidationError } from '../errors/validation.js';

export class TransactionsService {
  constructor(
    private readonly http: HTTPClient,
    private readonly defaultAccountNumber?: string,
  ) {}

  public async getStatus(params: TransactionStatusParams = {}): Promise<TransactionStatusResponse> {
    const safeParams = params || {};
    const accountNumber = safeParams.accountNumber || this.defaultAccountNumber;

    if (!accountNumber) {
      throw new LivePayValidationError(
        'Account number is required. Provide it in method params or set default accountNumber in client config.',
        'accountNumber',
      );
    }

    const ref = safeParams.reference ? String(safeParams.reference).trim() : '';
    const internalRef = safeParams.internal_reference
      ? String(safeParams.internal_reference).trim()
      : '';

    if (!ref && !internalRef) {
      throw new LivePayValidationError(
        'Either reference or internal_reference is required',
        'reference',
      );
    }

    return this.http.request<TransactionStatusResponse>({
      method: 'GET',
      path: '/transaction-status',
      params: {
        accountNumber,
        ...(ref ? { reference: ref } : {}),
        ...(internalRef ? { internal_reference: internalRef } : {}),
      },
    });
  }

  public async getHistory(
    params: TransactionHistoryParams = {},
  ): Promise<TransactionHistoryResponse> {
    const safeParams = params || {};
    const accountNumber = safeParams.accountNumber || this.defaultAccountNumber;

    if (!accountNumber) {
      throw new LivePayValidationError(
        'Account number is required. Provide it in method params or set default accountNumber in client config.',
        'accountNumber',
      );
    }

    if (
      safeParams.limit !== undefined &&
      (typeof safeParams.limit !== 'number' ||
        !Number.isInteger(safeParams.limit) ||
        safeParams.limit <= 0)
    ) {
      throw new LivePayValidationError('Limit must be a positive integer', 'limit');
    }

    if (
      safeParams.page !== undefined &&
      (typeof safeParams.page !== 'number' ||
        !Number.isInteger(safeParams.page) ||
        safeParams.page <= 0)
    ) {
      throw new LivePayValidationError('Page must be a positive integer', 'page');
    }

    return this.http.request<TransactionHistoryResponse>({
      method: 'GET',
      path: '/transaction-history',
      params: {
        accountNumber,
        ...(safeParams.limit !== undefined ? { limit: safeParams.limit } : {}),
        ...(safeParams.page !== undefined ? { page: safeParams.page } : {}),
        ...(safeParams.startDate ? { startDate: safeParams.startDate } : {}),
        ...(safeParams.endDate ? { endDate: safeParams.endDate } : {}),
      },
    });
  }
}
