import http, { IncomingMessage, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';

export class MockLivePayServer {
  private server: http.Server | null = null;
  public baseUrl = '';

  public async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', () => {
          const authHeader = req.headers.authorization;
          const idempotencyKey = req.headers['idempotency-key'];
          const url = req.url || '';

          res.setHeader('Content-Type', 'application/json');

          if (url.includes('/test-401') || (authHeader && authHeader.includes('invalid-key'))) {
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, message: 'Invalid API key' }));
            return;
          }

          if (url.includes('/test-429')) {
            res.statusCode = 429;
            res.setHeader('Retry-After', '1');
            res.end(JSON.stringify({ success: false, message: 'Too many requests' }));
            return;
          }

          let parsedBody: Record<string, unknown> = {};
          try {
            if (body) parsedBody = JSON.parse(body) as Record<string, unknown>;
          } catch {
            // ignore non-json
          }

          if (url.includes('/collect-money')) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                message: 'Collection request sent successfully',
                reference: parsedBody.reference || 'INV123',
                internal_reference: 'mock-internal-ref-collect-123',
                network: parsedBody.network || 'MTN',
                received_idempotency: idempotencyKey || null,
              }),
            );
            return;
          }

          if (url.includes('/card-collection')) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                message: 'Card collection created',
                reference: parsedBody.reference || 'CARD123',
                internal_reference: 'mock-internal-ref-card-123',
                payment_url: 'https://checkout.livepay.me/pay/CARD123',
              }),
            );
            return;
          }

          if (url.includes('/send-money')) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                message: 'Payment request in progress.',
                reference: parsedBody.reference || 'WITHDRAW123',
                internal_reference: 'mock-internal-ref-send-123',
              }),
            );
            return;
          }

          if (url.includes('/validate-number')) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                phone_number: parsedBody.phoneNumber,
                network: 'MTN',
                name: 'John Doe',
                is_valid: true,
              }),
            );
            return;
          }

          if (url.includes('/check-balance')) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                account_number: 'LP2305443309',
                currency: 'UGX',
                balance: 1500000,
                status: 'active',
              }),
            );
            return;
          }

          if (url.includes('/transaction-status')) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                status: 'Success',
                message: 'Transaction completed successfully',
                reference: 'INV123',
                internal_reference: 'mock-internal-ref-collect-123',
                amount: 50000,
                currency: 'UGX',
              }),
            );
            return;
          }

          if (url.includes('/transaction-history')) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                transactions: [
                  {
                    id: 'tx-1',
                    reference: 'INV123',
                    internal_reference: 'mock-internal-ref-collect-123',
                    type: 'collection',
                    amount: 50000,
                    currency: 'UGX',
                    status: 'Success',
                    created_at: '2024-01-01 10:00:00',
                  },
                ],
                total: 1,
                page: 1,
                limit: 10,
              }),
            );
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, message: 'Endpoint not found' }));
        });
      });

      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server?.address() as AddressInfo;
        this.baseUrl = `http://127.0.0.1:${addr.port}/api`;
        resolve(this.baseUrl);
      });

      this.server.on('error', (err) => reject(err));
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
