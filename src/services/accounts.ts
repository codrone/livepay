import { HTTPClient } from '../utils/http.js';
import {
  ValidateNumberParams,
  ValidateNumberResponse,
  CheckBalanceParams,
  CheckBalanceResponse,
} from '../types/accounts.js';
import { LivePayValidationError } from '../errors/validation.js';
import { sanitizePhoneNumber } from '../utils/phone.js';

export class AccountsService {
  constructor(
    private readonly http: HTTPClient,
    private readonly defaultAccountNumber?: string,
  ) {}

  public async validateNumber(params: ValidateNumberParams): Promise<ValidateNumberResponse> {
    if (!params || !params.phoneNumber || !String(params.phoneNumber).trim()) {
      throw new LivePayValidationError('Phone number is required', 'phoneNumber');
    }

    const sanitizedPhone = sanitizePhoneNumber(params.phoneNumber);

    return this.http.request<ValidateNumberResponse>({
      method: 'POST',
      path: '/validate-number',
      body: {
        phoneNumber: sanitizedPhone,
      },
    });
  }

  public async checkBalance(params: CheckBalanceParams): Promise<CheckBalanceResponse> {
    if (!params) {
      throw new LivePayValidationError('Request parameters are required', 'params');
    }

    const accountNumber = params.accountNumber || this.defaultAccountNumber;

    if (!accountNumber) {
      throw new LivePayValidationError(
        'Account number is required. Provide it in method params or set default accountNumber in client config.',
        'accountNumber',
      );
    }
    if (!params.currency || !String(params.currency).trim()) {
      throw new LivePayValidationError('Currency is required', 'currency');
    }

    return this.http.request<CheckBalanceResponse>({
      method: 'GET',
      path: '/check-balance',
      params: {
        accountNumber,
        currency: params.currency,
      },
    });
  }
}
