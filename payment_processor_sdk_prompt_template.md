# Universal Payment Processor SDK Master Prompt Template

This prompt template allows you to instruct an AI coding agent (like Google Antigravity, Claude, or ChatGPT) to generate a **production-ready, zero-dependency (or minimal dependency), fully typesafe TypeScript & JavaScript SDK repository** for any payment processor (e.g., Paystack, Flutterwave, Stripe, Monnify, Pesapal, DPO, etc.), built to the same architectural standards as **Marzpay**.

---

## 📋 How to Use This Template

1. Copy the **Master Prompt** below.
2. Replace the variables in double curly braces (e.g., `{{PROVIDER_NAME}}`, `{{PROVIDER_NPM_NAME}}`, `{{API_SPEC_OR_DOCS}}`) with the details of your target payment processor.
3. Paste it into your AI assistant prompt box when initializing a new repository.

---

```markdown
# TASK: Scaffold a Production-Ready, Typesafe TypeScript SDK for {{PROVIDER_NAME}}

You are tasked with building a modern, production-ready, dual ESM/CommonJS TypeScript SDK for the **{{PROVIDER_NAME}} API (v1)**, published under the package name `{{PROVIDER_NPM_NAME}}`.

The SDK must match enterprise-grade standards: zero runtime dependencies (using native `fetch`), full TypeScript type coverage, modular service namespaces, robust error handling, webhook signature verification with event normalization, comprehensive Vitest unit testing, TypeDoc documentation, Changesets versioning, and GitHub Actions CI/CD.

---

## 1. TARGET PROVIDER SPECIFICATIONS

- **Provider Name**: {{PROVIDER_NAME}}
- **NPM Package Name**: {{PROVIDER_NPM_NAME}}
- **Environment Variables**:
  - `{{ENV_PREFIX}}_API_KEY`: Primary API Key / Secret Key
  - `{{ENV_PREFIX}}_WEBHOOK_SECRET`: Webhook signing secret
- **Base URLs**:
  - Production: `{{PRODUCTION_BASE_URL}}`
  - Sandbox/Development: `{{SANDBOX_BASE_URL}}`
- **Authentication Method**: {{AUTH_METHOD}} *(e.g., Bearer Token `Authorization: Bearer <key>`, or Header keys `x-api-key: <key>`, `x-api-secret: <secret>`)*
- **API Spec / Endpoints List**:
  {{API_SPEC_OR_DOCS}}

---

## 2. REPOSITORY ARCHITECTURE & FILE STRUCTURE

Generate a clean, modular repository structure:

```
{{PROVIDER_NPM_NAME}}/
├── .changeset/
│   └── config.json
├── .github/
│   └── workflows/
│       └── release.yml
├── .gitignore
├── .npmrc
├── .prettierrc
├── eslint.config.mjs
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── typedoc.json
├── vitest.config.ts
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
├── src/
│   ├── index.ts                  # Main entrypoint exporting Client, Errors, Types, & Utilities
│   ├── client.ts                 # Main {{PROVIDER_CLASS_NAME}} client class with service namespaces
│   ├── config.ts                 # Client configuration interfaces & environment loader
│   ├── errors/
│   │   ├── base.ts               # {{PROVIDER_CLASS_NAME}}Error base class
│   │   ├── api.ts                # {{PROVIDER_CLASS_NAME}}APIError (HTTP status, code, correlation ID)
│   │   ├── validation.ts         # {{PROVIDER_CLASS_NAME}}ValidationError
│   │   ├── auth.ts               # {{PROVIDER_CLASS_NAME}}AuthError
│   │   └── index.ts
│   ├── services/
│   │   ├── collections.ts        # Payouts, Card/Mobile Money collections
│   │   ├── disbursements.ts      # Transfers & Payouts
│   │   ├── bank-transfers.ts     # Bank account payouts & lookup
│   │   ├── bill-payments.ts      # Utilities, TV, Airtime
│   │   ├── transactions.ts       # Status, history, refunds
│   │   ├── webhooks.ts           # HMAC signature verification & payload parsing
│   │   ├── index.ts
│   │   └── ... (additional service files for each resource)
│   ├── types/
│   │   ├── common.ts             # APIResponseEnvelope<T>, Pagination, Currency, Status Enums
│   │   ├── collections.ts
│   │   ├── disbursements.ts
│   │   ├── webhooks.ts           # Webhook payload models & union event types
│   │   └── index.ts
│   └── utils/
│       ├── crypto.ts             # HMAC-SHA256 signature verification helper
│       └── http.ts               # Native fetch wrapper with timeout, retry, & error parsing
└── tests/
    ├── client.test.ts
    ├── collections.test.ts
    ├── webhooks.test.ts
    └── http.test.ts
```

---

## 3. CORE ARCHITECTURAL REQUIREMENTS

### A. HTTP & Transport Layer (`src/utils/http.ts`)
- Use native Node.js / browser `fetch` (no `axios` or heavy HTTP dependencies).
- Support custom HTTP agent, timeout configurations (default: 30,000ms), and custom base URL overrides.
- Standardize all API responses with a generic `APIResponseEnvelope<T>` envelope:
  ```typescript
  export interface APIResponseEnvelope<T> {
    status: boolean | string;
    message: string;
    data: T;
    code?: string | number;
    meta?: Record<string, unknown>;
  }
  ```
- Catch non-2xx status codes and throw typed instances from the Error Hierarchy.

### B. Error Hierarchy (`src/errors/`)
- `{{PROVIDER_CLASS_NAME}}Error`: Extends native `Error`. Base class for all SDK errors.
- `{{PROVIDER_CLASS_NAME}}APIError`: Thrown on non-2xx HTTP responses. Includes `statusCode`, `errorCode`, `responseBody`, and `requestId`.
- `{{PROVIDER_CLASS_NAME}}ValidationError`: Thrown on missing configuration or invalid payload parameters.
- `{{PROVIDER_CLASS_NAME}}AuthError`: Thrown on missing API keys or 401/403 HTTP status responses.

### C. Client Class (`src/client.ts`)
- Class name: `{{PROVIDER_CLASS_NAME}}`
- Instantiates services under readable property namespaces (e.g., `client.collections`, `client.disbursements`, `client.webhooks`).
- Reads missing configuration parameters automatically from `process.env` when available.

### D. Universal Webhook Engine (`src/services/webhooks.ts` & `src/utils/crypto.ts`)
- `verifySignature(rawBody, signatureHeader, secret?, timestampHeader?)`:
  - Performs constant-time HMAC comparison (using `crypto.timingSafeEqual`).
  - Supports raw string inputs from Express (`req.body`), Next.js (`await req.text()`), Fastify, etc.
- `parseEvent(payload: string | Record<string, unknown>)`:
  - Parses JSON string or payload object.
  - Normalizes webhook payload wrappers into strongly-typed TS discriminated union types (`ParsedWebhookEvent`).

---

## 4. TOOLING & PACKAGING CONFIGURATION

- **Build Tool (`tsup.config.ts`)**:
  - Targets ESM (`.mjs`) and CommonJS (`.js`) with TypeScript declarations (`.d.ts`).
  - Enables sourcemaps and tree-shaking.
- **Testing (`vitest.config.ts`)**:
  - Configures Vitest with coverage reporter (`v8`).
  - Mock all HTTP network calls without calling live endpoints.
- **Linting & Formatting**:
  - Flat ESLint config (`eslint.config.mjs`) with `typescript-eslint`.
  - Prettier configuration (`.prettierrc`) with 2 spaces and single quotes.
  - `publint` check script to ensure package exports compliance.
- **Documentation & Publishing**:
  - `typedoc` config (`typedoc.json`) to auto-generate markdown/HTML docs under `docs/`.
  - `@changesets/cli` setup for versioning.
  - `.github/workflows/release.yml` for automated CI testing, typechecking, and NPM publishing upon merging to `main`.

---

## 5. REQUIRED OUTPUT & IMPLEMENTATION STEPS

1. Generate all configuration files (`package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `.prettierrc`, `eslint.config.mjs`, `typedoc.json`).
2. Write complete source code in `src/` without placeholders, `TODO` comments, or truncated snippets.
3. Write comprehensive unit tests in `tests/` covering client initialization, API requests, error throwing, and webhook verification.
4. Provide a rich `README.md` with installation guides, quickstart code examples, webhook verification recipes for Express/Next.js, and API reference overview.
```

---

## 💡 Quick Example Variables Map

| Variable | Example Value (Paystack) | Example Value (Flutterwave) |
| :--- | :--- | :--- |
| `{{PROVIDER_NAME}}` | Paystack | Flutterwave |
| `{{PROVIDER_NPM_NAME}}` | `paystack-sdk-ts` | `flutterwave-v3-ts` |
| `{{PROVIDER_CLASS_NAME}}` | `Paystack` | `Flutterwave` |
| `{{ENV_PREFIX}}` | `PAYSTACK` | `FLUTTERWAVE` |
| `{{PRODUCTION_BASE_URL}}` | `https://api.paystack.co` | `https://api.flutterwave.com/v3` |
| `{{SANDBOX_BASE_URL}}` | `https://api.paystack.co` | `https://api.flutterwave.com/v3` |
| `{{AUTH_METHOD}}` | Bearer Token (`Authorization: Bearer <secret_key>`) | Bearer Token (`Authorization: Bearer <secret_key>`) |
