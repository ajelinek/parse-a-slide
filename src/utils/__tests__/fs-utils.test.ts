import fs from 'fs'
import path from 'path'
import { expect, it, vi } from 'vitest'

// Mock the glob module
vi.mock('glob', () => {
  const mockGlobSync = vi.fn()
  return {
    glob: vi.fn(),
    globSync: mockGlobSync,
  }
})

import { globSync } from 'glob'
import { ErrorCode } from '../error'
import { cleanDir, copyFile, ensureDir, findFiles, pathExists, readFile, writeFile } from '../fs-utils'
import { fileSystemSetup } from '../../test-utils/file-test-util'

// Cast the mocked function to the correct type
const mockGlobSync = globSync as unknown as ReturnType<typeof vi.fn>

// Test module name
const TEST_MODULE = 'fs-utils'

/**
 * Set up test directory with the given file structure
 * @param fileStructure The file structure to create
 * @returns The path to the test directory
 */
async function setUp(fileStructure?: any) {
  return fileSystemSetup(TEST_MODULE, fileStructure || {})
}

it('should read a file that exists', async () => {
  // Setup test with a file
  const content = 'Hello, world!'
  const testDir = await setUp({
    'test-file.txt': content,
  })

  // Test reading the file
  const filePath = path.join(testDir, 'test-file.txt')
  const result = await readFile(filePath)

  // Verify result
  expect(result.isOk()).toBe(true)
  expect(result._unsafeUnwrap()).toBe(content)
})

it('should write content to a file', async () => {
  // Setup test with an empty directory
  const testDir = await setUp()

  // Test writing to a file
  const filePath = path.join(testDir, 'new-file.txt')
  const content = 'New content'
  const result = await writeFile(filePath, content)

  // Verify result
  expect(result.isOk()).toBe(true)
  expect(result._unsafeUnwrap()).toBe(filePath)
  const fileContent = await fs.promises.readFile(filePath, 'utf-8')
  expect(fileContent).toBe(content)
})

it('should ensure a directory exists', async () => {
  // Setup test with an empty directory
  const testDir = await setUp()

  // Test creating a directory
  const dirPath = path.join(testDir, 'new-dir')
  const result = await ensureDir(dirPath)

  // Verify result
  expect(result.isOk()).toBe(true)
  expect(result._unsafeUnwrap()).toBe(dirPath)
  const dirExists = await fs.promises
    .access(dirPath)
    .then(() => true)
    .catch(() => false)
  expect(dirExists).toBe(true)
})

it('should find files with a glob pattern', async () => {
  // Setup test with multiple files
  const testDir = await setUp({
    'file1.txt': 'content1',
    'file2.txt': 'content2',
    'file3.md': 'content3',
  })

  // Mock the glob result
  mockGlobSync.mockReturnValueOnce([path.join(testDir, 'file1.txt'), path.join(testDir, 'file2.txt')])

  // Test finding files
  const result = await findFiles('**/*.txt', testDir)

  // Verify result
  expect(result.isOk()).toBe(true)
  const files = result._unsafeUnwrap()
  expect(files.length).toBe(2)
  expect(files.map(f => path.basename(f)).sort()).toEqual(['file1.txt', 'file2.txt'])
})

it('should copy a file', async () => {
  // Setup test with a source file
  const content = 'Source content'
  const testDir = await setUp({
    'source.txt': content,
  })

  // Test copying the file
  const sourcePath = path.join(testDir, 'source.txt')
  const destPath = path.join(testDir, 'dest.txt')
  const result = await copyFile(sourcePath, destPath)

  // Verify result
  expect(result.isOk()).toBe(true)
  expect(result._unsafeUnwrap()).toBe(destPath)
  const destContent = await fs.promises.readFile(destPath, 'utf-8')
  expect(destContent).toBe(content)
})

it('should check if a path exists', async () => {
  // Setup test with a file
  const testDir = await setUp({
    'exists.txt': 'content',
  })

  // Test checking if the file exists
  const filePath = path.join(testDir, 'exists.txt')
  const result = await pathExists(filePath)

  // Verify result
  expect(result.isOk()).toBe(true)
  expect(result._unsafeUnwrap()).toBe(true)
})

it('should clean a directory', async () => {
  // Setup test with files and subdirectories using the simplified structure
  const testDir = await setUp({
    'file1.txt': 'content1',
    'file2.txt': 'content2',
    subdir: {
      'subfile.txt': 'subcontent',
    },
  })

  // Define paths for verification
  const subDir = path.join(testDir, 'subdir')
  const file1 = path.join(testDir, 'file1.txt')
  const file2 = path.join(testDir, 'file2.txt')

  // Test cleaning the directory
  const result = await cleanDir(testDir)

  // Verify result
  expect(result.isOk()).toBe(true)
  const deletedEntries = result._unsafeUnwrap()
  expect(deletedEntries.length).toBe(3)
  expect(deletedEntries.sort()).toEqual([file1, file2, subDir].sort())

  const dirContents = await fs.promises.readdir(testDir)
  expect(dirContents.length).toBe(0)
})

it('should return an error when reading a file that does not exist', async () => {
  // Setup test with an empty directory
  const testDir = await setUp()

  // Test reading a non-existent file
  const nonExistentPath = path.join(testDir, 'non-existent.txt')
  const result = await readFile(nonExistentPath)

  // Verify error
  expect(result.isErr()).toBe(true)
  const error = result._unsafeUnwrapErr()
  expect(error.code).toBe(ErrorCode.FILE_NOT_FOUND)
})

it('should return an error when writing to a path with insufficient permissions', async () => {
  if (process.platform === 'win32') {
    return // Skip on Windows due to different permission handling
  }

  // Setup test with a restricted directory
  const testDir = await setUp({
    restricted: null,
  })

  // Create a restricted directory
  const restrictedDir = path.join(testDir, 'restricted')
  await fs.promises.chmod(restrictedDir, 0o444) // Make read-only

  try {
    // Test writing to a file in the restricted directory
    const restrictedFile = path.join(restrictedDir, 'file.txt')
    const result = await writeFile(restrictedFile, 'content')

    // Verify error
    expect(result.isErr()).toBe(true)
    const error = result._unsafeUnwrapErr()
    expect(error.code).toBe(ErrorCode.PERMISSION_ERROR)
  } finally {
    // Reset permissions for cleanup
    await fs.promises.chmod(restrictedDir, 0o777)
  }
})

it('should return an error when creating a directory with insufficient permissions', async () => {
  if (process.platform === 'win32') {
    return // Skip on Windows due to different permission handling
  }

  // Setup test with a restricted directory
  const testDir = await setUp({
    restricted: null,
  })

  const restrictedDir = path.join(testDir, 'restricted')
  const nestedDir = path.join(restrictedDir, 'nested')

  try {
    await fs.promises.chmod(restrictedDir, 0o444) // Make read-only

    const result = await ensureDir(nestedDir)

    expect(result.isErr()).toBe(true)
    const error = result._unsafeUnwrapErr()
    expect(error.code).toBe(ErrorCode.PERMISSION_ERROR)
  } finally {
    await fs.promises.chmod(restrictedDir, 0o777) // Reset for cleanup
  }
})

it('should return an error when finding files with an invalid glob pattern', async () => {
  // Setup test with an empty directory
  const testDir = await setUp()

  // Setup mock to throw an error
  const invalidPattern = '[invalid'
  mockGlobSync.mockImplementationOnce(() => {
    throw new Error('Invalid glob pattern')
  })

  // Test finding files with invalid pattern
  const result = await findFiles(invalidPattern, testDir)

  // Verify error
  expect(result.isErr()).toBe(true)
  const error = result._unsafeUnwrapErr()
  expect(error.code).toBe(ErrorCode.IO_ERROR)
})

it('should return an error when copying a file that does not exist', async () => {
  // Setup test with an empty directory
  const testDir = await setUp()

  // Test copying a non-existent file
  const nonExistentSource = path.join(testDir, 'non-existent.txt')
  const destination = path.join(testDir, 'destination.txt')
  const result = await copyFile(nonExistentSource, destination)

  // Verify error
  expect(result.isErr()).toBe(true)
  const error = result._unsafeUnwrapErr()
  expect(error.code).toBe(ErrorCode.FILE_NOT_FOUND)
})

it('should return an error when copying to a destination with insufficient permissions', async () => {
  if (process.platform === 'win32') {
    return // Skip on Windows due to different permission handling
  }

  // Setup test with a source file and restricted directory
  const testDir = await setUp({
    'source.txt': 'content',
    restricted: null,
  })

  // Create paths
  const sourcePath = path.join(testDir, 'source.txt')
  const restrictedDir = path.join(testDir, 'restricted')
  const restrictedDest = path.join(restrictedDir, 'dest.txt')

  try {
    // Make the directory read-only
    await fs.promises.chmod(restrictedDir, 0o444)

    // Test copying to a restricted destination
    const result = await copyFile(sourcePath, restrictedDest)

    // Verify error
    expect(result.isErr()).toBe(true)
    const error = result._unsafeUnwrapErr()
    expect(error.code).toBe(ErrorCode.PERMISSION_ERROR)
  } finally {
    // Reset permissions for cleanup
    await fs.promises.chmod(restrictedDir, 0o777)
  }
})

it('should return an error when cleaning a directory that does not exist', async () => {
  // Setup test with an empty directory
  const testDir = await setUp()

  // Test cleaning a non-existent directory
  const nonExistentDir = path.join(testDir, 'non-existent-dir')
  const result = await cleanDir(nonExistentDir)

  // Verify error
  expect(result.isErr()).toBe(true)
  const error = result._unsafeUnwrapErr()
  expect(error.code).toBe(ErrorCode.DIRECTORY_NOT_FOUND)
})
