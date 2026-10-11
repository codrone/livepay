export interface RateLimitOptions {
  maxRequests: number;
  perMilliseconds: number;
}

export class RateLimiter {
  private readonly maxRequests: number;
  private readonly perMilliseconds: number;
  private timestamps: number[] = [];

  constructor(options: RateLimitOptions) {
    this.maxRequests = options.maxRequests;
    this.perMilliseconds = options.perMilliseconds;
  }

  public async acquireToken(): Promise<void> {
    if (this.maxRequests <= 0 || this.perMilliseconds <= 0) {
      return;
    }

    while (true) {
      const now = Date.now();
      // Remove timestamps older than window
      this.timestamps = this.timestamps.filter((ts) => now - ts < this.perMilliseconds);

      if (this.timestamps.length < this.maxRequests) {
        this.timestamps.push(now);
        return;
      }

      // Wait until the oldest request expires from the window
      const oldest = this.timestamps[0] ?? now;
      const waitTime = oldest + this.perMilliseconds - now + 10;
      await new Promise((resolve) => setTimeout(resolve, Math.max(waitTime, 10)));
    }
  }
}
