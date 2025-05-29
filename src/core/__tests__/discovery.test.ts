import path from 'path'
import { afterEach, expect, test } from 'vitest'
import { cleanup, FileSystemStructure, fileSystemSetup } from '../../test-utils/file-test-util'
import { discoverPresentations } from '../discovery'

// Cleanup after each test
afterEach(async () => {
  await cleanup('discovery')
})

/**
 * Setup function for discovery tests
 * Creates necessary test directories and files
 */
async function setUp(structure: FileSystemStructure) {
  // Use the file-test-util to create the test directory and structure
  const testDir = await fileSystemSetup('discovery', structure)

  return {
    testDir,
    inputDir: path.join(testDir, 'input-dir'),
  }
}

test('discoverPresentations should find a single presentation with index file', async () => {
  // Setup test environment
  const { inputDir } = await setUp({
    'input-dir': {
      'index.pres.md': '# Test Presentation',
    },
  })

  // Call the function
  const result = await discoverPresentations(inputDir)

  // Verify result is successful
  expect(result.isOk()).toBe(true)

  if (result.isOk()) {
    const presentations = result.value

    // Verify result has expected structure
    expect(presentations.length).toBe(1)

    const presentation = presentations[0]

    // Check PresentationMetadata properties
    expect(presentation.id).toBeDefined()
    expect(presentation.url).toBe('/input-dir')
    expect(presentation.fullPath).toBe(path.join(inputDir, 'index.pres.md'))
    expect(presentation.name).toBe('input-dir')
    expect(presentation.extension).toBe('.pres.md')
    expect(presentation.entrySlideId).toBeDefined()

    // Check FragmentMetadata
    expect(presentation.fragmentMetaData.length).toBe(1)
    expect(presentation.fragmentMetaData[0].isEntry).toBe(true)
    expect(presentation.fragmentMetaData[0].name).toBe('index')
    expect(presentation.fragmentMetaData[0].fullPath).toBe(path.join(inputDir, 'index.pres.md'))
    expect(presentation.fragmentMetaData[0].relativePath).toBe('index.pres.md')
    expect(presentation.fragmentMetaData[0].extension).toBe('.md')
    expect(presentation.fragmentMetaData[0].id).toBe(presentation.entrySlideId)
  }
})
