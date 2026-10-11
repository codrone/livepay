import { HTTPClient } from '../utils/http.js';
import { SendMoneyParams, SendMoneyResponse } from '../types/disbursements.js';
import { LivePayValidationError } from '../errors/validation.js';
import { sanitizePhoneNumber } from '../utils/phone.js';

export class DisbursementsService {
  constructor(
    private readonly http: HTTPClient,
    private readonly defaultAccountNumber?: string,
  ) {}

  public async sendMoney(params: SendMoneyParams): Promise<SendMoneyResponse> {
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
    if (!params.phoneNumber || !String(params.phoneNumber).trim()) {
      throw new LivePayValidationError('Phone number is required', 'phoneNumber');
    }

    const sanitizedPhone = sanitizePhoneNumber(params.phoneNumber);

    if (
      params.amount === undefined ||
      params.amount === null ||
      typeof params.amount !== 'number' ||
      !Number.isFinite(params.amount) ||
      params.amount <= 0
    ) {
      throw new LivePayValidationError('Amount must be a positive number', 'amount');
    }
    if (!params.currency || !String(params.currency).trim()) {
      throw new LivePayValidationError('Currency is required', 'currency');
    }
    if (!params.reference || !String(params.reference).trim()) {
      throw new LivePayValidationError('Reference is required', 'reference');
    }
    if (params.reference.includes(' ')) {
      throw new LivePayValidationError('Reference must not contain spaces', 'reference');
    }
    if (params.reference.length > 30) {
      throw new LivePayValidationError('Reference must be at most 30 characters', 'reference');
    }
    if (!params.description || !String(params.description).trim()) {
      throw new LivePayValidationError('Description is required', 'description');
    }
    if (params.currency.toUpperCase() !== 'UGX' && !params.network) {
      throw new LivePayValidationError('Network is required for non-UGX currencies', 'network');
    }

    return this.http.request<SendMoneyResponse>({
      method: 'POST',
      path: '/send-money',
      idempotencyKey: params.idempotencyKey,
      body: {
        accountNumber,
        phoneNumber: sanitizedPhone,
        amount: params.amount,
        currency: params.currency,
        reference: params.reference,
        description: params.description,
        ...(params.network ? { network: params.network } : {}),
      },
    });
  }
}
