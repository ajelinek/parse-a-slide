import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import cli from '.'
import { readFileSync } from 'fs'
import { resolve } from 'path'

let consoleLogMock: any
let consoleErrorMock: any

beforeEach(() => {
  consoleLogMock = vi.spyOn(console, 'log')
  consoleLogMock.mockImplementation(() => {})
  consoleErrorMock = vi.spyOn(console, 'error')
  consoleErrorMock.mockImplementation(() => {})
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
  expect(output).toContain('Process all Markdown files')
  expect(output).toContain('Enable watch mode for automatic rebuilding')
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
