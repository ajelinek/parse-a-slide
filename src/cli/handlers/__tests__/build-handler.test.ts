import { it, expect, afterEach, vi } from 'vitest'
import { buildHandler } from '../build-handler'
import { BuildCommandOptions } from '../../../types/cli'
import * as fs from 'fs'
import * as path from 'path'
import { fileSystemSetup, cleanup, exists, getPath } from '../../../test-utils/file-test-util'

const TEST_MODULE = 'build-handler'

function setUp() {
  return {}
}

function copyFixtureToTestDir(fixtureName: string, testDir: string): void {
  const fixturesDir = path.join(__dirname, 'fixtures', fixtureName)
  const inputDir = path.join(testDir, 'input')
  
  // Copy fixture directory to test input directory
  fs.cpSync(fixturesDir, inputDir, { recursive: true })
}

afterEach(async () => {
  await cleanup(TEST_MODULE)
})

it('should complete successful single presentation build', async () => {
  setUp()

  // Create test directory structure
  const testDir = await fileSystemSetup(TEST_MODULE, {
    'output': null // Empty output directory
  })

  // Copy fixture to test input directory
  copyFixtureToTestDir('successful-single-build', testDir)

  const inputDir = getPath(TEST_MODULE, 'input')
  const outputDir = getPath(TEST_MODULE, 'output')

  const options: BuildCommandOptions = {
    input: [inputDir],
    outputDir,
    format: 'html',
    watch: false,
    clean: false,
    verbose: false,
    quiet: false
  }

  // Execute the build handler
  const result = await buildHandler(options)
  
  // Verify the build handler returned success
  expect(result.isOk()).toBe(true)

  // Verify the build completed successfully by checking output files exist
  const outputExists = await exists(TEST_MODULE, 'output')
  expect(outputExists).toBe(true)

  // Check that HTML files were generated
  const htmlFiles = fs.readdirSync(outputDir).filter(file => file.endsWith('.html'))
  expect(htmlFiles.length).toBeGreaterThan(0)

  // Check that assets directory was created
  const assetsExists = await exists(TEST_MODULE, 'output/_assets')
  expect(assetsExists).toBe(true)

  // Verify expected asset files exist
  const expectedAssets = ['style.css', 'tokens.css', 'main.js']
  for (const asset of expectedAssets) {
    const assetExists = await exists(TEST_MODULE, `output/_assets/${asset}`)
    expect(assetExists).toBe(true)
  }
})

it('should complete successful multi-presentation build with progress reporting', async () => {
  setUp()

  // Mock console.log to capture progress reporting
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

  // Create test directory structure
  const testDir = await fileSystemSetup(TEST_MODULE, {
    'output': null // Empty output directory
  })

  // Create multiple presentation directories
  const inputDir = getPath(TEST_MODULE, 'input')
  const presentation1Dir = path.join(inputDir, 'presentation1')
  const presentation2Dir = path.join(inputDir, 'presentation2')
  
  fs.mkdirSync(presentation1Dir, { recursive: true })
  fs.mkdirSync(presentation2Dir, { recursive: true })

  // Copy fixture directly to each presentation directory
  const fixturesDir = path.join(__dirname, 'fixtures', 'successful-single-build')
  fs.cpSync(fixturesDir, presentation1Dir, { recursive: true })
  fs.cpSync(fixturesDir, presentation2Dir, { recursive: true })

  const outputDir = getPath(TEST_MODULE, 'output')

  const options: BuildCommandOptions = {
    input: [presentation1Dir, presentation2Dir],
    outputDir,
    format: 'html',
    watch: false,
    clean: false,
    verbose: false,
    quiet: false
  }

  // Execute the build handler
  const result = await buildHandler(options)
  
  // Verify the build handler returned success
  expect(result.isOk()).toBe(true)

  // Verify progress reporting was logged
  const logCalls = consoleLogSpy.mock.calls.flat()
  const logOutput = logCalls.join('\n')
  
  // Check that processing messages were logged for each presentation
  expect(logOutput).toContain('Processing input:')
  expect(logOutput).toContain('Processing presentation:')
  expect(logOutput).toContain('Successfully processed presentation:')
  expect(logOutput).toContain('Build completed successfully')

  // Verify the build completed successfully by checking output files exist
  const outputExists = await exists(TEST_MODULE, 'output')
  expect(outputExists).toBe(true)

  // Check that HTML files were generated for both presentations
  const htmlFiles = fs.readdirSync(outputDir).filter(file => file.endsWith('.html'))
  expect(htmlFiles.length).toBeGreaterThan(0)

  // Check that assets directory was created
  const assetsExists = await exists(TEST_MODULE, 'output/_assets')
  expect(assetsExists).toBe(true)

  // Verify expected asset files exist
  const expectedAssets = ['style.css', 'tokens.css', 'main.js']
  for (const asset of expectedAssets) {
    const assetExists = await exists(TEST_MODULE, `output/_assets/${asset}`)
    expect(assetExists).toBe(true)
  }

  // Clean up console spy
  consoleLogSpy.mockRestore()
})
