import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { Logger } from '../logger'
import { LogLevel } from '../../types/logger'

// Mock console.log to capture and verify output
let consoleLogSpy: any

beforeEach(() => {
  consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  consoleLogSpy.mockRestore()
  // Reset the logger instance for each test
  vi.resetModules()
})

/**
 * Setup function for logger tests
 * @param level Optional log level to set
 * @returns Logger instance and utility functions
 */
function setup(level?: LogLevel) {
  const logger = Logger.getInstance(level)

  // Helper to verify log message format
  const verifyLogFormat = (prefix: string, message: string) => {
    expect(consoleLogSpy).toHaveBeenCalled()
    const loggedMessage = consoleLogSpy.mock.calls[0][0]
    expect(loggedMessage).toContain(`[${prefix}]`)
    expect(loggedMessage).toContain(message)
    expect(loggedMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]/)
  }

  return { logger, verifyLogFormat }
}

test('outputs error messages with default log level', () => {
  const { logger, verifyLogFormat } = setup()
  logger.error('Test error message')
  verifyLogFormat('ERROR', 'Test error message')
})

test('outputs info messages when level is INFO', () => {
  const { logger, verifyLogFormat } = setup(LogLevel.INFO)
  logger.info('Test info message')
  verifyLogFormat('INFO', 'Test info message')
})

test('outputs debug messages when level is DEBUG', () => {
  const { logger, verifyLogFormat } = setup(LogLevel.DEBUG)
  logger.debug('Test debug message')
  verifyLogFormat('DEBUG', 'Test debug message')
})

test('suppresses info messages when level is ERROR', () => {
  const { logger } = setup(LogLevel.ERROR)
  logger.info('Test info message')
  expect(consoleLogSpy).not.toHaveBeenCalled()
})

test('suppresses debug messages when level is INFO', () => {
  const { logger } = setup(LogLevel.INFO)
  logger.debug('Test debug message')
  expect(consoleLogSpy).not.toHaveBeenCalled()
})

test('level can be changed dynamically', () => {
  const { logger, verifyLogFormat } = setup(LogLevel.ERROR)
  logger.debug('This should not be logged')
  expect(consoleLogSpy).not.toHaveBeenCalled()
  logger.setLevel(LogLevel.DEBUG)
  logger.debug('Test debug message after level change')
  verifyLogFormat('DEBUG', 'Test debug message after level change')
})

test('formats object arguments', () => {
  const { logger } = setup()
  const testObject = { name: 'test', value: 123 }
  logger.info('Test message with object', testObject)
  expect(consoleLogSpy).toHaveBeenCalled()
  const loggedMessage = consoleLogSpy.mock.calls[0][0]
  expect(loggedMessage).toContain('Test message with object')
  expect(loggedMessage).toContain(JSON.stringify(testObject, null, 2))
})

test('handles Error objects', () => {
  const { logger } = setup()
  const testError = new Error('Test error')

  logger.error('Error occurred', testError)

  expect(consoleLogSpy).toHaveBeenCalled()
  const loggedMessage = consoleLogSpy.mock.calls[0][0]
  expect(loggedMessage).toContain('Error occurred')
  expect(loggedMessage).toContain('Error: Test error')
})

test('handles invalid log levels', () => {
  const invalidLevel = 999 as unknown as LogLevel
  const result = Logger.create(invalidLevel)

  expect(result.isErr()).toBe(true)

  if (result.isErr()) {
    expect(result.error.code).toBe('INVALID_LOG_LEVEL')
    expect(result.error.message).toContain('Invalid log level')
  }
})
