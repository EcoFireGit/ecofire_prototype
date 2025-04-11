// src/errors/CustomError.ts

export default class ValidationError extends Error {
  public statusCode: number;
  public errorCode?: string;
  public details?: any;

  constructor(message: string, statusCode: number, errorCode?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;

    // Capture stack trace for debugging purposes
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }

    // Set the name of the error to match the class name
    this.name = this.constructor.name;
  }
}
