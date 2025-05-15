// utls/errors/custom.error.ts
import { ErrorCodes } from "./error.codes";

export class CustomError extends Error {
  code: number; // Custom error code
  statusCode: number; // Optional: HTTP status code for API responses

  constructor(
    message: string,
    code: keyof typeof ErrorCodes,
    statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = ErrorCodes[code];
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

