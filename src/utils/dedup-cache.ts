export class DeduplicationCache {
  private cache: Map<string, number> = new Map();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 1000, ttlMs = 24 * 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  public isDuplicate(key: string): boolean {
    this.cleanup();
    const existing = this.cache.get(key);
    if (existing === undefined) return false;
    return Date.now() - existing < this.ttlMs;
  }

  public mark(key: string): void {
    this.cleanup();
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, Date.now());
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.cache.entries()) {
      if (now - timestamp >= this.ttlMs) {
        this.cache.delete(key);
      } else {
        break; // Map maintains insertion order
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }
}
