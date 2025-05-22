import { describe, it, expect, vi } from 'vitest'
import cli from '.'

it('shows help text with --help', async () => {
  // Mock console.log to capture output
  const consoleLogMock = vi.spyOn(console, 'log')
  consoleLogMock.mockImplementation(() => {})

  // Setup: Invoke CLI with --help argument
  await cli(['node', 'script.js', '--help'])

  // Assert: Output contains usage/help text
  const output = consoleLogMock.mock.calls.flat().join('\n')
  expect(output).toContain('Usage:')
  expect(output).toContain('--help')

  // Cleanup
  consoleLogMock.mockRestore()
})

it('shows build command help with build --help', async () => {
  // Mock console.log to capture output
  const consoleLogMock = vi.spyOn(console, 'log')
  consoleLogMock.mockImplementation(() => {})

  // Setup: Invoke CLI with build --help argument
  await cli(['node', 'script.js', 'build', '--help'])

  // Assert: Output contains build-specific help text
  const output = consoleLogMock.mock.calls.flat().join('\n')
  expect(output).toContain('Build the project')
  expect(output).toContain('build')
  expect(output).toContain('--output')

  // Cleanup
  consoleLogMock.mockRestore()
})
