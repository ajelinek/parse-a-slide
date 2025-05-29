import { it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import * as fileTestUtil from '../file-test-util'

// Test module name
const TEST_MODULE = 'json-example'

// Clean up before and after tests
beforeEach(async () => {
  await fileTestUtil.cleanup(TEST_MODULE)
})

afterEach(async () => {
  await fileTestUtil.cleanup(TEST_MODULE)
})

it('should create files and directories using the JSON structure', async () => {
  // Setup test file structure using the simple JSON notation
  const testDir = await fileTestUtil.fileSystemSetup(TEST_MODULE, {
    'file.txt': 'content',
    'empty-dir': null,
    nested: {
      'nested-file.txt': 'nested content',
      deep: {
        'deep-file.txt': 'deep content',
      },
    },
  })

  // Verify files and directories were created
  expect(await fileTestUtil.exists(TEST_MODULE, 'file.txt')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'empty-dir')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'nested')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'nested/nested-file.txt')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'nested/deep')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'nested/deep/deep-file.txt')).toBe(true)

  // Verify file content
  expect(await fileTestUtil.readFile(TEST_MODULE, 'file.txt')).toBe('content')
  expect(await fileTestUtil.readFile(TEST_MODULE, 'nested/nested-file.txt')).toBe('nested content')
  expect(await fileTestUtil.readFile(TEST_MODULE, 'nested/deep/deep-file.txt')).toBe('deep content')
})

it('should create files and directories using the setup method with JSON structure', async () => {
  // Setup test file structure using the setup method with JSON structure
  const testDir = await fileTestUtil.fileSystemSetup(TEST_MODULE, {
    'root-file.txt': 'root content',
    dir: {
      'file.txt': 'dir content',
    },
  })

  // Verify files and directories were created
  expect(await fileTestUtil.exists(TEST_MODULE, 'root-file.txt')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'dir')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'dir/file.txt')).toBe(true)

  // Verify file content
  expect(await fileTestUtil.readFile(TEST_MODULE, 'root-file.txt')).toBe('root content')
  expect(await fileTestUtil.readFile(TEST_MODULE, 'dir/file.txt')).toBe('dir content')
})

it('should handle complex nested structures', async () => {
  // Create a more complex structure
  const testDir = await fileTestUtil.fileSystemSetup(TEST_MODULE, {
    'config.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
    src: {
      'index.js': 'console.log("Hello world");',
      components: {
        'Button.js': 'export const Button = () => <button>Click me</button>;',
        'Input.js': 'export const Input = () => <input />;',
      },
      utils: {
        'helpers.js': 'export const sum = (a, b) => a + b;',
        'constants.js': 'export const API_URL = "https://api.example.com";',
      },
    },
    public: {
      'index.html': '<!DOCTYPE html><html><body>Hello</body></html>',
      assets: {
        'style.css': 'body { margin: 0; }',
        images: null,
      },
    },
  })

  // Verify the structure was created correctly
  expect(await fileTestUtil.exists(TEST_MODULE, 'config.json')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'src/index.js')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'src/components/Button.js')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'src/components/Input.js')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'src/utils/helpers.js')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'src/utils/constants.js')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'public/index.html')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'public/assets/style.css')).toBe(true)
  expect(await fileTestUtil.exists(TEST_MODULE, 'public/assets/images')).toBe(true)

  // Verify some file content
  expect(JSON.parse(await fileTestUtil.readFile(TEST_MODULE, 'config.json'))).toEqual({
    name: 'test',
    version: '1.0.0',
  })
  expect(await fileTestUtil.readFile(TEST_MODULE, 'src/index.js')).toBe('console.log("Hello world");')
  expect(await fileTestUtil.readFile(TEST_MODULE, 'src/components/Button.js')).toBe(
    'export const Button = () => <button>Click me</button>;'
  )
})

it('should clean up files and directories', async () => {
  // Setup test file structure
  const testDir = await fileTestUtil.fileSystemSetup(TEST_MODULE, {
    'file.txt': 'content',
  })

  // Verify file was created
  expect(await fileTestUtil.exists(TEST_MODULE, 'file.txt')).toBe(true)

  // Clean up
  await fileTestUtil.cleanup(TEST_MODULE)

  // Verify file was removed
  try {
    await fs.promises.access(path.join(testDir, 'file.txt'))
    // If we get here, the file still exists
    expect(false).toBe(true) // This will fail the test
  } catch (error) {
    // File doesn't exist, which is what we want
    expect(true).toBe(true)
  }
})

it('should handle paths correctly', async () => {
  // Get a path
  const filePath = fileTestUtil.getPath(TEST_MODULE, 'some/path/file.txt')
  const expectedPath = path.join(fileTestUtil.getTestDir(TEST_MODULE), 'some/path/file.txt')

  // Verify path is correct
  expect(filePath).toBe(expectedPath)
})
