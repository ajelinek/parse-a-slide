import { it, expect, afterEach } from 'vitest'
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
