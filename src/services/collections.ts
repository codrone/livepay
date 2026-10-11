import { HTTPClient } from '../utils/http.js';
import {
  CollectMoneyParams,
  CollectMoneyResponse,
  CardCollectionParams,
  CardCollectionResponse,
} from '../types/collections.js';
import { LivePayValidationError } from '../errors/validation.js';
import { sanitizePhoneNumber } from '../utils/phone.js';

export class CollectionsService {
  constructor(
    private readonly http: HTTPClient,
    private readonly defaultAccountNumber?: string,
  ) {}

  public async collectMoney(params: CollectMoneyParams): Promise<CollectMoneyResponse> {
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

    return this.http.request<CollectMoneyResponse>({
      method: 'POST',
      path: '/collect-money',
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

  public async cardCollection(params: CardCollectionParams): Promise<CardCollectionResponse> {
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
    if (!params.email || !String(params.email).trim()) {
      throw new LivePayValidationError('Email is required', 'email');
    }
    if (!params.email.includes('@')) {
      throw new LivePayValidationError('Valid email address is required', 'email');
    }

    return this.http.request<CardCollectionResponse>({
      method: 'POST',
      path: '/card-collection',
      idempotencyKey: params.idempotencyKey,
      body: {
        accountNumber,
        amount: params.amount,
        currency: params.currency,
        reference: params.reference,
        description: params.description,
        email: params.email,
        ...(params.callbackUrl ? { callbackUrl: params.callbackUrl } : {}),
      },
    });
  }
}
