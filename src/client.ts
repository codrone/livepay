import { ClientConfig } from './types/common.js';
import { resolveClientConfig, ResolvedClientConfig } from './config.js';
import { HTTPClient } from './utils/http.js';
import { LivePayValidationError } from './errors/validation.js';
import { CollectionsService } from './services/collections.js';
import { DisbursementsService } from './services/disbursements.js';
import { AccountsService } from './services/accounts.js';
import { TransactionsService } from './services/transactions.js';
import { WebhooksService } from './services/webhooks.js';

/**
 * LivePay SDK Client.
 *
 * Provides typesafe, zero-dependency access to LivePay Mobile Money payment collections,
 * disbursements, account balance inquiries, and webhook signature verification.
 *
 * @remarks
 * **IP Whitelisting & Network Requirement:**
 * The LivePay gateway requires strict IP whitelisting for all outbound API requests and
 * **does not allow wildcard IP whitelisting (`*`)**. If your application runs in a serverless
 * or dynamic IP environment without a single fixed static IP (e.g., Firebase Cloud Functions,
 * AWS Lambda, Vercel, Supabase Functions, or Cloudflare Workers) and you experience API rejections
 * or connection issues, please email **support@livepay.me** for setup guidance.
 *
 * @example
 * ```typescript
 * import { LivePay } from 'livepay-node';
 *
 * const livepay = new LivePay({
 *   apiKey: process.env.LIVEPAY_API_KEY,
 *   accountNumber: process.env.LIVEPAY_ACCOUNT_NUMBER,
 * });
 * ```
 */
export class LivePay {
  public readonly collections: CollectionsService;
  public readonly disbursements: DisbursementsService;
  public readonly accounts: AccountsService;
  public readonly transactions: TransactionsService;
  public readonly webhooks: WebhooksService;

  private readonly resolvedConfig: ResolvedClientConfig;

  constructor(config: ClientConfig = {}) {
    this.resolvedConfig = resolveClientConfig(config);

    if (!this.resolvedConfig.apiKey) {
      throw new LivePayValidationError(
        'LivePay API key is required. Provide apiKey in constructor options or set LIVEPAY_API_KEY env variable.',
        'apiKey',
      );
    }

    const httpClient = new HTTPClient({
      apiKey: this.resolvedConfig.apiKey,
      baseUrl: this.resolvedConfig.baseUrl,
      timeout: this.resolvedConfig.timeout,
      maxRetries: this.resolvedConfig.maxRetries,
      fetch: this.resolvedConfig.fetch,
      logger: this.resolvedConfig.logger,
      rateLimit: this.resolvedConfig.rateLimit,
    });

    const defaultAccountNumber = this.resolvedConfig.accountNumber || undefined;

    this.collections = new CollectionsService(httpClient, defaultAccountNumber);
    this.disbursements = new DisbursementsService(httpClient, defaultAccountNumber);
    this.accounts = new AccountsService(httpClient, defaultAccountNumber);
    this.transactions = new TransactionsService(httpClient, defaultAccountNumber);
    this.webhooks = new WebhooksService(this.resolvedConfig.webhookSecret || undefined);
  }

  public getConfig(): Readonly<ResolvedClientConfig> {
    return { ...this.resolvedConfig };
  }
}
