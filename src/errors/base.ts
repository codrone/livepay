export class LivePayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LivePayError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
