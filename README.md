# livepay-node

> Production-ready, zero-dependency, fully typesafe TypeScript & JavaScript SDK for the **[LivePay API](https://docs.livepay.me)**.

[![CI](https://github.com/codrone/livepay/actions/workflows/ci.yml/badge.svg)](https://github.com/codrone/livepay/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue.svg)](https://codrone.github.io/livepay/)
[![npm version](https://img.shields.io/npm/v/livepay-node.svg)](https://www.npmjs.com/package/livepay-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)

---

## 🌟 Key Features & Advanced Capabilities

- **Zero Runtime Dependencies**: Built using native `fetch` (Node.js 18+, Deno, Bun, Cloudflare Workers, and modern browsers).
- **Idempotency Header Support**: Optional `idempotencyKey` in payment requests sends `Idempotency-Key` HTTP headers to prevent duplicate transactions on network retries.
- **Request / Response Logging**: Optional `logger` interface (`debug`, `info`, `warn`, `error`) in `ClientConfig` for detailed HTTP telemetry and retry tracing.
- **Single-Call Webhook Helper (`constructEvent`)**: Verifies HMAC signatures and parses events into strongly-typed discriminated unions in a single call.
- **Replay Attack Protection**: Webhook verification supports an optional timestamp tolerance window (`tolerance`, default: 300 seconds / 5 minutes) to reject stale/replayed webhook payloads.
- **Phone Number Sanitization**: Automatically trims and strips formatting characters (spaces, hyphens, parentheses) while preserving international leading `+`.
- **Intelligent Rate-Limit Handling**: Automatically parses `Retry-After` headers onto `LivePayAPIError.retryAfter` and respects server delay instructions during retries.
- **Custom `fetch` Override**: Pass a custom `fetch` implementation for proxy configurations, mock testing, or edge environments.
- **Dual Build Targets**: Native support for ESM (`import`) and CommonJS (`require`).
- **Complete Type Safety**: Strict TypeScript definitions for all requests, responses, and webhook events.
- **Categorized Service Namespaces**: `client.collections`, `client.disbursements`, `client.accounts`, `client.transactions`, and `client.webhooks`.

---

## 📦 Installation

```bash
npm install livepay-node
# or
yarn add livepay-node
# or
pnpm add livepay-node
```

---

## 🌐 IP Whitelisting & Serverless Deployments

> [!IMPORTANT]
> **Strict Gateway IP Whitelisting Requirement**
>
> The LivePay payment gateway enforces strict IP whitelisting for all API calls and **does not allow wildcard IP whitelisting (`*` or open CIDR blocks)**.
>
> If your application runs on serverless or cloud infrastructure that lacks a single fixed, static egress IP—such as **Firebase Cloud Functions**, **Google Cloud Run**, **AWS Lambda**, **Vercel**, **Supabase Functions**, or **Cloudflare Workers**—the gateway may reject outgoing API requests.
>
> If your server does not have a single fixed IP address and this is causing API requests not to function as intended, please email **[support@livepay.me](mailto:support@livepay.me)** for setup guidance and whitelisting solutions.

---

## 🚀 Quick Start

### 1. Initialize the Client with Logging

```typescript
import { LivePay } from 'livepay-node';

const livepay = new LivePay({
  apiKey: process.env.LIVEPAY_API_KEY, // Defaults to process.env.LIVEPAY_API_KEY
  accountNumber: process.env.LIVEPAY_ACCOUNT_NUMBER, // Default merchant account number
  webhookSecret: process.env.LIVEPAY_WEBHOOK_SECRET, // Webhook signing secret
  logger: {
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta),
    error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta),
  },
});
```

### 2. Collect Money with Idempotency Key

```typescript
try {
  const collection = await livepay.collections.collectMoney({
    phoneNumber: '+256 (777) 123-456', // Auto-sanitized to +256777123456
    amount: 50000,
    currency: 'UGX',
    reference: 'INV123456789',
    description: 'Payment for online order',
    idempotencyKey: 'idemp_key_9988776655', // Idempotency header for retry safety
  });

  console.log('Collection initialized:', collection.internal_reference);
} catch (error) {
  console.error('Collection failed:', error);
}
```

### 3. Send Money (Payouts / Disbursements)

```typescript
const payout = await livepay.disbursements.sendMoney({
  phoneNumber: '0777-123-456', // Auto-sanitized to 0777123456
  amount: 25000,
  currency: 'UGX',
  reference: 'WD987654321',
  description: 'Salary payout',
  idempotencyKey: 'payout_idemp_112233',
});

console.log('Payout requested:', payout.internal_reference);
```

### 4. Single-Step Webhook Processing (`constructEvent`)

```typescript
import express from 'express';
import { LivePay, LivePayValidationError } from 'livepay-node';

const app = express();
const livepay = new LivePay({ apiKey: process.env.LIVEPAY_API_KEY });

app.post('/webhook', express.json(), (req, res) => {
  const signatureHeader = req.headers['x-webhook-signature'] as string;
  const webhookUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  try {
    // Verifies HMAC signature, checks timestamp tolerance, and returns typed event
    const event = livepay.webhooks.constructEvent({
      payload: req.body,
      signatureHeader,
      webhookUrl,
      tolerance: 300, // Rejects webhooks older than 5 mins
    });

    switch (event.event) {
      case 'payment.success':
        console.log('Payment succeeded:', event.data.customer_reference);
        break;
      case 'payment.failed':
        console.log('Payment failed:', event.data.customer_reference);
        break;
      default:
        console.log('Payment status:', event.data.status);
    }

    res.status(200).send('OK');
  } catch (error) {
    if (error instanceof LivePayValidationError) {
      return res.status(401).send(`Invalid webhook: ${error.message}`);
    }
    res.status(500).send('Server error');
  }
});
```

---

## ⚠️ Error Handling & Rate Limits

The SDK throws descriptive typed exceptions:

```typescript
import {
  LivePayError,
  LivePayAPIError,
  LivePayAuthError,
  LivePayValidationError,
} from 'livepay-node';

try {
  await livepay.collections.collectMoney({ /* ... */ });
} catch (error) {
  if (error instanceof LivePayValidationError) {
    console.error(`Invalid field "${error.field}": ${error.message}`);
  } else if (error instanceof LivePayAuthError) {
    console.error(`Authentication error: ${error.message}`);
  } else if (error instanceof LivePayAPIError) {
    console.error(`API error (status ${error.statusCode}): ${error.message}`);
    if (error.statusCode === 429 && error.retryAfter) {
      console.warn(`Rate limited! Retry after ${error.retryAfter} seconds.`);
    }
  } else if (error instanceof LivePayError) {
    console.error(`Base LivePay error: ${error.message}`);
  }
}
```

---

## 📖 API Reference

| Service Namespace | Method | Description | Endpoint / Helper |
| :--- | :--- | :--- | :--- |
| `client.collections` | `collectMoney(params)` | Request deposit (supports `idempotencyKey`) | `POST /collect-money` |
| `client.collections` | `cardCollection(params)` | Create card collection session | `POST /card-collection` |
| `client.disbursements` | `sendMoney(params)` | Transfer funds (supports `idempotencyKey`) | `POST /send-money` |
| `client.accounts` | `checkBalance(params)` | Check merchant wallet balance | `GET /check-balance` |
| `client.accounts` | `validateNumber(params)` | Lookup & validate phone number details | `POST /validate-number` |
| `client.transactions` | `getStatus(params)` | Fetch transaction status by reference | `GET /transaction-status` |
| `client.transactions` | `getHistory(params)` | Fetch paginated transaction history | `GET /transaction-history` |
| `client.webhooks` | `constructEvent(options)` | Verify signature & parse typed event in 1 call | Client-side helper |
| `client.webhooks` | `verifySignature(options)` | Verify HMAC signature header & timestamp tolerance | Client-side helper |
| `client.webhooks` | `parseEvent(payload)` | Parse & normalize webhook event payload | Client-side helper |

---

## 📚 Documentation & Reference

- **[Interactive SDK API Reference (TypeDoc)](https://codrone.github.io/livepay/)**: Full TypeScript classes, interfaces, and method signatures generated automatically.
- **[Official LivePay REST API Docs](https://docs.livepay.me)**: Official gateway guides, authentication, endpoints, and webhook payload structures.

---

## 💬 Contact & Support

For SDK inquiries, feedback, or general support, please open an [Issue](https://github.com/codrone/livepay/issues) or email [mpalaronald@gmail.com](mailto:mpalaronald@gmail.com).

For payment gateway IP whitelisting, merchant onboarding, and serverless network configuration, please email **[support@livepay.me](mailto:support@livepay.me)**.

---

## 📄 License

[MIT License](LICENSE) © 2025 LivePay
