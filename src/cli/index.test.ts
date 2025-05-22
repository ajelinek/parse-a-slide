import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import cli from '.'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Mock the build handler module before it's imported by the command module
vi.mock('./handlers/build-handler', () => ({
  buildHandler: vi.fn(),
}))

// Import the mocked handler
import { buildHandler } from './handlers/build-handler'

let consoleLogMock: any
let consoleErrorMock: any

beforeEach(() => {
  consoleLogMock = vi.spyOn(console, 'log')
  consoleLogMock.mockImplementation(() => {})
  consoleErrorMock = vi.spyOn(console, 'error')
  consoleErrorMock.mockImplementation(() => {})

  // Clear mock between tests
  vi.mocked(buildHandler).mockClear()
})

afterEach(() => {
  consoleLogMock.mockRestore()
  consoleErrorMock.mockRestore()
})

it('CLI should display general help information when --help flag is used', async () => {
  await cli(['node', 'script.js', '--help'])

  const output = consoleLogMock.mock.calls.flat().join('\n')
  expect(output).toContain('Usage:')
  expect(output).toContain('--help')
  expect(output).toContain('Process presentation source files')
  expect(output).toContain('For more information')
  expect(output).toContain('Show version information')
})

it('CLI should display build command help when build --help is used', async () => {
  await cli(['node', 'script.js', 'build', '--help'])

  const output = consoleLogMock.mock.calls.flat().join('\n')
  expect(output).toContain('Process presentation source files')
  expect(output).toContain('build')
  expect(output).toContain('--input')
  expect(output).toContain('--output-dir')
  expect(output).toContain('--format')
  expect(output).toContain('--watch')
  expect(output).toContain('--clean')
  expect(output).toContain('--verbose')
})

it('CLI requires explicit build command', async () => {
  let error: Error | null = null

  try {
    await cli(['node', 'script.js'])
  } catch (err) {
    error = err as Error
  }

  expect(error).not.toBeNull()
  const errorOutput = consoleErrorMock.mock.calls.flat().join('\n')
  expect(errorOutput).toContain('A command is required')
})

it('CLI shows version with --version', async () => {
  let error: Error | null = null

  try {
    await cli(['node', 'script.js', '--version'])
  } catch (err) {
    error = err as Error
  }

  expect(error).toBeNull()

  const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'))
  const output = consoleLogMock.mock.calls.flat().join('\n')
  expect(output).toContain(packageJson.version)
})

it('CLI rejects unknown commands', async () => {
  let error: Error | null = null

  try {
    await cli(['node', 'script.js', 'foo'])
  } catch (err) {
    error = err as Error
  }

  expect(error).not.toBeNull()
  const errorOutput = consoleErrorMock.mock.calls.flat().join('\n')
  expect(errorOutput).toMatch(/Unknown argument: foo/)
})

it('CLI rejects unknown options', async () => {
  let error: Error | null = null

  try {
    await cli(['node', 'script.js', 'build', '--unknown'])
  } catch (err) {
    error = err as Error
  }

  expect(error).not.toBeNull()
  const errorOutput = consoleErrorMock.mock.calls.flat().join('\n')
  expect(errorOutput).toMatch(/Unknown argument: unknown|Missing required argument: input/)
})

it('CLI build command triggers handler with correct args', async () => {
  try {
    await cli([
      'node',
      'test-script.js',
      'build',
      '--input',
      'foo.md',
      '-o',
      'custom_out',
      '--format',
      'html',
      '--watch',
      '--clean',
      '--verbose',
    ])

    expect(buildHandler).toHaveBeenCalledTimes(1)
    const call = vi.mocked(buildHandler).mock.calls[0][0]
    expect(call.input).toEqual(['foo.md'])
    expect(call.outputDir).toBe('custom_out')
    expect(call.format).toBe('html')
    expect(call.watch).toBe(true)
    expect(call.clean).toBe(true)
    expect(call.verbose).toBe(true)
  } catch (error) {
    console.error('Test failed:', error)
    throw error
  }
})
