import { beforeAll, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { DeduplicationCache } from '../src/utils/dedup-cache.js';
import { RateLimiter } from '../src/utils/rate-limiter.js';
import { sanitizePhoneNumber } from '../src/utils/phone.js';
import { resolveClientConfig } from '../src/config.js';

describe('Portability & SDK Utilities Robustness', () => {
  describe('DeduplicationCache', () => {
    it('should evict oldest entry when maxSize is reached', () => {
      const cache = new DeduplicationCache(2, 60000);
      cache.mark('key-1');
      cache.mark('key-2');
      expect(cache.isDuplicate('key-1')).toBe(true);
      expect(cache.isDuplicate('key-2')).toBe(true);

      // Adding key-3 should evict key-1
      cache.mark('key-3');
      expect(cache.isDuplicate('key-1')).toBe(false);
      expect(cache.isDuplicate('key-2')).toBe(true);
      expect(cache.isDuplicate('key-3')).toBe(true);
    });

    it('should expire entries after ttlMs', async () => {
      const cache = new DeduplicationCache(10, 50); // 50ms TTL
      cache.mark('temp-key');
      expect(cache.isDuplicate('temp-key')).toBe(true);

      await new Promise((r) => setTimeout(r, 60));
      expect(cache.isDuplicate('temp-key')).toBe(false);
    });

    it('should clear all entries on clear()', () => {
      const cache = new DeduplicationCache();
      cache.mark('item-1');
      cache.mark('item-2');
      cache.clear();
      expect(cache.isDuplicate('item-1')).toBe(false);
      expect(cache.isDuplicate('item-2')).toBe(false);
    });
  });

  describe('RateLimiter', () => {
    it('should not deadlock if maxRequests or perMilliseconds is zero or negative', async () => {
      const limiterZero = new RateLimiter({ maxRequests: 0, perMilliseconds: 100 });
      await expect(limiterZero.acquireToken()).resolves.toBeUndefined();

      const limiterNegative = new RateLimiter({ maxRequests: -5, perMilliseconds: -100 });
      await expect(limiterNegative.acquireToken()).resolves.toBeUndefined();
    });
  });

  describe('sanitizePhoneNumber', () => {
    it('should format standard mobile numbers with plus or digits', () => {
      expect(sanitizePhoneNumber('+256 (777) 123-456')).toBe('+256777123456');
      expect(sanitizePhoneNumber('0777 123 456')).toBe('0777123456');
    });

    it('should handle edge cases like empty, whitespace, and symbol-only strings', () => {
      expect(sanitizePhoneNumber('')).toBe('');
      expect(sanitizePhoneNumber('   ')).toBe('');
      expect(sanitizePhoneNumber('---')).toBe('---');
    });
  });

  describe('Client Config & Environment Handling', () => {
    it('should trim whitespace from apiKey, accountNumber, webhookSecret, and baseUrl', () => {
      const cfg = resolveClientConfig({
        apiKey: '  secret-key-123  ',
        accountNumber: '  LP9999  ',
        webhookSecret: '  whsec-999  ',
        baseUrl: '  https://sandbox.livepay.me/api/  ',
      });

      expect(cfg.apiKey).toBe('secret-key-123');
      expect(cfg.accountNumber).toBe('LP9999');
      expect(cfg.webhookSecret).toBe('whsec-999');
      expect(cfg.baseUrl).toBe('https://sandbox.livepay.me/api/');
    });

    it('should handle null or undefined config parameter safely', () => {
      const cfg = resolveClientConfig(undefined);
      expect(cfg.baseUrl).toBe('https://livepay.me/api');
    });
  });

  describe('Packaging Portability: Dual ESM & CommonJS Verification', () => {
    beforeAll(() => {
      const cjsPath = resolve(__dirname, '../dist/index.cjs');
      const esmPath = resolve(__dirname, '../dist/index.js');
      if (!existsSync(cjsPath) || !existsSync(esmPath)) {
        execSync('npm run build', { cwd: resolve(__dirname, '..'), stdio: 'ignore' });
      }
    });

    it('should export all public classes and functions in ESM build', async () => {
      const esmPath = resolve(__dirname, '../dist/index.js');
      const esmModule = await import(esmPath);

      expect(esmModule.LivePay).toBeDefined();
      expect(typeof esmModule.LivePay).toBe('function');
      expect(esmModule.HTTPClient).toBeDefined();
      expect(typeof esmModule.HTTPClient).toBe('function');
      expect(esmModule.verifySignature).toBeDefined();
      expect(typeof esmModule.verifySignature).toBe('function');
      expect(esmModule.LivePayError).toBeDefined();
      expect(esmModule.LivePayAPIError).toBeDefined();
      expect(esmModule.LivePayAuthError).toBeDefined();
      expect(esmModule.LivePayValidationError).toBeDefined();
    });

    it('should export all public classes and functions in CommonJS build', () => {
      const cjsPath = resolve(__dirname, '../dist/index.cjs');
      const require = createRequire(import.meta.url);
      const cjsModule = require(cjsPath);

      expect(cjsModule.LivePay).toBeDefined();
      expect(cjsModule.HTTPClient).toBeDefined();
      expect(cjsModule.verifySignature).toBeDefined();
      expect(cjsModule.LivePayError).toBeDefined();
      expect(cjsModule.LivePayAPIError).toBeDefined();
      expect(cjsModule.LivePayAuthError).toBeDefined();
      expect(cjsModule.LivePayValidationError).toBeDefined();
    });
  });
});
