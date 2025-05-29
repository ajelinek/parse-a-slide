import { Result, ok as resultOk, err as resultErr } from 'neverthrow';

/**
 * Type alias for Promise<Result<T, AppError>>
 * Used for async functions that return a Result
 */
export type PasResult<T> = Promise<Result<T, AppError>>;

/**
 * Enum of error codes used throughout the application.
 */
export enum ErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  
  // Logger errors
  INVALID_LOG_LEVEL = 'INVALID_LOG_LEVEL',
  
  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  IO_ERROR = 'IO_ERROR',
  
  // Discovery errors
  CONFLICTING_INDEX_FILES = 'CONFLICTING_INDEX_FILES',
  NO_PRESENTATION_FILES = 'NO_PRESENTATION_FILES',
  NESTED_INDEX_FILES = 'NESTED_INDEX_FILES'
}

/**
 * Base application error class.
 */
export class AppError extends Error {
  code: ErrorCode;
  
  constructor(message: string, code: ErrorCode = ErrorCode.UNKNOWN_ERROR) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

/**
 * Creates a Result.err with the specified error.
 * @param error The error to wrap in a Result
 * @returns A Result.err containing the error
 */
export const err = <T>(error: AppError): Result<T, AppError> => {
  return resultErr<T, AppError>(error);
};

/**
 * Creates a Promise that resolves to a Result.err with the specified error.
 * Useful for async functions that return a PasResult.
 * 
 * @param error The error to wrap in a Result
 * @returns A Promise that resolves to a Result.err containing the error
 */
export const pasErr = <T>(error: AppError): PasResult<T> => {
  return Promise.resolve(err<T>(error));
};

/**
 * Creates a Result.ok with the specified value.
 * @param value The value to wrap in a Result
 * @returns A Result.ok containing the value
 */
export const ok = <T>(value: T): Result<T, AppError> => {
  return resultOk<T, AppError>(value);
};

/**
 * Creates a Promise that resolves to a Result.ok with the specified value.
 * Useful for async functions that return a PasResult.
 * 
 * @param value The value to wrap in a Result
 * @returns A Promise that resolves to a Result.ok containing the value
 */
export const pasOk = <T>(value: T): PasResult<T> => {
  return Promise.resolve(ok<T>(value));
};

/**
 * Creates an AppError with the specified message and code.
 * Helper function to create specific error types.
 * 
 * @param message Error message
 * @param code Error code
 * @returns A new AppError instance
 */
export const createError = (message: string, code: ErrorCode = ErrorCode.UNKNOWN_ERROR): AppError => {
  return new AppError(message, code);
};


