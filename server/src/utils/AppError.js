// An error we throw on purpose, with an HTTP status code the client can understand.
export class AppError extends Error {
  constructor(message, status = 400, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
