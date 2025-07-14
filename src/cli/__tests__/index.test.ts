import { it, expect, vi, beforeEach, afterEach, describe } from 'vitest'
import cli from '..'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Mock the build handler module before it's imported by the command module
vi.mock('../handlers/build-handler', () => ({
  buildHandler: vi.fn().mockResolvedValue({
    isOk: () => true,
    isErr: () => false,
    value: undefined,
    error: null
  }),
}))

// Import the mocked handler
import { buildHandler } from '../handlers/build-handler'

// Setup function for tests
function setUp() {
  const consoleLogMock = vi.spyOn(console, 'log')
  consoleLogMock.mockImplementation(() => {})
  const consoleErrorMock = vi.spyOn(console, 'error')
  consoleErrorMock.mockImplementation(() => {})

  // Clear mock between tests
  vi.mocked(buildHandler).mockClear()

  return { consoleLogMock, consoleErrorMock }
}

beforeEach(() => {
  // This is kept minimal as per testing guidelines
})

afterEach(() => {
  // Clean up any remaining mocks
})

it('CLI should display general help information when --help flag is used', async () => {
  const { consoleLogMock } = setUp()
  
  await cli(['node', 'script.js', '--help'])

  const output = consoleLogMock.mock.calls.flat().join('\n')
  expect(output).toContain('Usage:')
  expect(output).toContain('--help')
  expect(output).toContain('Process presentation source files')
  expect(output).toContain('For more information')
  expect(output).toContain('Show version information')
  
  consoleLogMock.mockRestore()
})

it('CLI should display build command help when build --help is used', async () => {
  const { consoleLogMock } = setUp()
  
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
  
  consoleLogMock.mockRestore()
})

it('CLI requires explicit build command', async () => {
  const { consoleErrorMock } = setUp()
  
  let error: Error | null = null

  try {
    await cli(['node', 'script.js'])
  } catch (err) {
    error = err as Error
  }

  expect(error).not.toBeNull()
  const errorOutput = consoleErrorMock.mock.calls.flat().join('\n')
  expect(errorOutput).toContain('A command is required')
  
  consoleErrorMock.mockRestore()
})

it('CLI shows version with --version', async () => {
  const { consoleLogMock } = setUp()
  
  let error: Error | null = null

  try {
    await cli(['node', 'script.js', '--version'])
  } catch (err) {
    error = err as Error
  }

  expect(error).toBeNull()

  const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../../package.json'), 'utf8'))
  const output = consoleLogMock.mock.calls.flat().join('\n')
  expect(output).toContain(packageJson.version)
  
  consoleLogMock.mockRestore()
})

it('CLI rejects unknown commands', async () => {
  const { consoleErrorMock } = setUp()
  
  let error: Error | null = null

  try {
    await cli(['node', 'script.js', 'foo'])
  } catch (err) {
    error = err as Error
  }

  expect(error).not.toBeNull()
  const errorOutput = consoleErrorMock.mock.calls.flat().join('\n')
  expect(errorOutput).toMatch(/Unknown argument: foo/)
  
  consoleErrorMock.mockRestore()
})

it('CLI rejects unknown options', async () => {
  const { consoleErrorMock } = setUp()
  
  let error: Error | null = null

  try {
    await cli(['node', 'script.js', 'build', '--unknown'])
  } catch (err) {
    error = err as Error
  }

  expect(error).not.toBeNull()
  const errorOutput = consoleErrorMock.mock.calls.flat().join('\n')
  expect(errorOutput).toMatch(/Unknown argument: unknown|Missing required argument: input/)
  
  consoleErrorMock.mockRestore()
})

it('CLI requires input option for build command', async () => {
  const { consoleErrorMock } = setUp()
  
  let error: Error | null = null

  try {
    await cli(['node', 'script.js', 'build'])
  } catch (err) {
    error = err as Error
  }

  expect(error).not.toBeNull()
  const errorOutput = consoleErrorMock.mock.calls.flat().join('\n')
  expect(errorOutput).toContain('Missing required argument: input')
  
  consoleErrorMock.mockRestore()
})

it('CLI rejects invalid format options', async () => {
  const { consoleErrorMock } = setUp()
  
  let error: Error | null = null

  try {
    await cli(['node', 'script.js', 'build', '--input', 'foo.md', '--format', 'invalid'])
  } catch (err) {
    error = err as Error
  }

  expect(error).not.toBeNull()
  const errorOutput = consoleErrorMock.mock.calls.flat().join('\n')
  expect(errorOutput).toContain('Invalid values')
  expect(errorOutput).toContain('Argument: format')
  expect(errorOutput).toContain('Given: "invalid"')
  expect(errorOutput).toContain('Choices: "md", "mdx", "html"')
  
  consoleErrorMock.mockRestore()
})

it('CLI build command triggers handler with correct args', async () => {
  setUp()
  
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

it('CLI sets quiet mode correctly', async () => {
  setUp()
  
  await cli([
    'node',
    'test-script.js',
    'build',
    '--input',
    'foo.md',
    '--quiet'
  ])

  expect(buildHandler).toHaveBeenCalledTimes(1)
  const call = vi.mocked(buildHandler).mock.calls[0][0]
  expect(call.quiet).toBe(true)
})

it('CLI sets verbose mode correctly', async () => {
  setUp()
  
  await cli([
    'node',
    'test-script.js',
    'build',
    '--input',
    'foo.md',
    '--verbose'
  ])

  expect(buildHandler).toHaveBeenCalledTimes(1)
  const call = vi.mocked(buildHandler).mock.calls[0][0]
  expect(call.verbose).toBe(true)
})
