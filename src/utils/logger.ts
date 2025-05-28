import { Result } from 'neverthrow'
import { AppError, createError, ErrorCode, ok, err } from './error'
import { LogLevel } from '../types/logger'

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  GRAY: '\x1b[90m',
}

/**
 * Logger class that provides logging functionality
 * with support for different log levels, timestamps, and formatted output.
 */
export class Logger {
  private static instance: Logger
  private level: LogLevel

  /**
   * Creates a new Logger instance with the specified log level.
   * @param level The initial log level
   */
  private constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level
  }

  /**
   * Gets the singleton instance of the Logger.
   * @param level Optional log level to set
   * @returns The Logger instance
   */
  public static getInstance(level?: LogLevel): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(level)
    } else if (level !== undefined) {
      Logger.instance.setLevel(level)
    }
    return Logger.instance
  }

  /**
   * Creates a new Logger instance with the specified log level.
   * @param level The log level to use
   * @returns A Result containing the Logger instance or an error
   */
  public static create(level: LogLevel): Result<Logger, AppError> {
    if (Object.values(LogLevel).includes(level)) {
      return ok(Logger.getInstance(level))
    }
    return err(createError(`Invalid log level: ${level}`, ErrorCode.INVALID_LOG_LEVEL))
  }

  /**
   * Gets the current timestamp formatted for logging.
   * @returns Formatted timestamp string
   */
  private getTimestamp(): string {
    return new Date().toISOString()
  }

  /**
   * Formats arguments for logging.
   * @param args Arguments to format
   * @returns Formatted string representation of the arguments
   */
  private formatArgs(args: any[]): string {
    if (args.length === 0) return ''

    return args
      .map(arg => {
        if (arg instanceof Error) {
          return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2)
          } catch (e) {
            return `[Object: ${arg.constructor.name}]`
          }
        }
        return String(arg)
      })
      .join(' ')
  }

  /**
   * Logs an error message.
   * @param message The message to log
   * @param args Optional arguments to include in the log
   */
  public error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args)
  }

  /**
   * Logs an info message if the current log level is INFO or higher.
   * @param message The message to log
   * @param args Optional arguments to include in the log
   */
  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args)
  }

  /**
   * Logs a debug message if the current log level is DEBUG.
   * @param message The message to log
   * @param args Optional arguments to include in the log
   */
  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args)
  }

  /**
   * Logs a message at the specified level.
   * @param level The log level
   * @param message The message to log
   * @param args Optional arguments to include in the log
   */
  public log(level: LogLevel, message: string, ...args: any[]): void {
    if (level > this.level) return

    const timestamp = this.getTimestamp()
    const formattedArgs = this.formatArgs(args)

    let color = COLORS.RESET
    let prefix = ''

    switch (level) {
      case LogLevel.ERROR:
        color = COLORS.RED
        prefix = 'ERROR'
        break
      case LogLevel.INFO:
        color = COLORS.YELLOW
        prefix = 'INFO'
        break
      case LogLevel.DEBUG:
        color = COLORS.BLUE
        prefix = 'DEBUG'
        break
    }

    const logMessage = `${color}[${prefix}]${COLORS.RESET} ${COLORS.GRAY}[${timestamp}]${COLORS.RESET} ${message}`

    console.log(logMessage + (formattedArgs ? `\n${formattedArgs}` : ''))
  }

  /**
   * Sets the log level.
   * @param level The log level to set
   */
  public setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * Gets the current log level.
   * @returns The current log level
   */
  public getLevel(): LogLevel {
    return this.level
  }
}
