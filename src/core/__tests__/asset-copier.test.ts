import { test, expect, vi } from 'vitest'
import { copySourceAssets } from '../asset-copier'
import { fileSystemSetup, FileSystemStructure, exists, readFile } from '../../test-utils/file-test-util'
import { ErrorCode } from '../../utils/error'
import path from 'path'

async function setUp(structure?: FileSystemStructure) {
  const testDir = await fileSystemSetup('asset-copier', structure)
  return {
    testDir,
    sourceDir: path.join(testDir, 'source'),
    outputDir: path.join(testDir, 'output'),
  }
}

async function assertSuccessResult(
  result: any,
  expectedTotal: number,
  expectedSkipped: number,
  expectedByExtension: Record<string, number>
) {
  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value.total).toBe(expectedTotal)
    expect(result.value.skipped).toBe(expectedSkipped)
    expect(result.value.byExtension).toEqual(expectedByExtension)
  }
}

async function assertFileExists(filePath: string, shouldExist: boolean) {
  expect(await exists('asset-copier', filePath)).toBe(shouldExist)
}

async function assertFileContent(filePath: string, expectedContent: string) {
  expect(await readFile('asset-copier', filePath)).toBe(expectedContent)
}

async function setupCopyFileFailureMock(failureFileName: string) {
  const { copyFile } = await import('../../utils/fs-utils')
  const copyFileSpy = vi.spyOn(await import('../../utils/fs-utils'), 'copyFile')
  copyFileSpy.mockImplementation(async (source, target) => {
    if (source.includes(failureFileName)) {
      return Promise.resolve(
        (await import('neverthrow')).err(
          (await import('../../utils/error')).createError('Permission denied', ErrorCode.PERMISSION_ERROR)
        )
      )
    }
    return copyFile(source, target)
  })
  return copyFileSpy
}

async function setupLoggerErrorSpy() {
  const { Logger } = await import('../../utils/logger')
  const loggerInstance = Logger.getInstance()
  return vi.spyOn(loggerInstance, 'error')
}

test('Successfully copy a nested directory structure with mixed assets', async () => {
  const { sourceDir, outputDir } = await setUp({
    source: {
      images: {
        'hero.jpg': 'hero image content',
        'diagram.png': 'diagram image content',
      },
      docs: {
        'manual.pdf': 'manual content',
      },
      'index.pres.md': 'presentation content',
      'section1.pres.md': 'section content',
    },
  })

  const result = await copySourceAssets(sourceDir, outputDir)

  await assertSuccessResult(result, 3, 0, { jpg: 1, png: 1, pdf: 1 })

  await assertFileExists('output/images/hero.jpg', true)
  await assertFileExists('output/images/diagram.png', true)
  await assertFileExists('output/docs/manual.pdf', true)
  await assertFileExists('output/index.pres.md', false)
  await assertFileExists('output/section1.pres.md', false)

  await assertFileContent('output/images/hero.jpg', 'hero image content')
  await assertFileContent('output/images/diagram.png', 'diagram image content')
  await assertFileContent('output/docs/manual.pdf', 'manual content')
})

test('Handle an empty source directory', async () => {
  const { sourceDir, outputDir } = await setUp({
    source: null,
  })

  const result = await copySourceAssets(sourceDir, outputDir)

  await assertSuccessResult(result, 0, 0, {})
})

test('Handle a source directory with only presentation files', async () => {
  const { sourceDir, outputDir } = await setUp({
    source: {
      'index.pres.md': 'presentation content',
      'details.pres.mdx': 'details content',
    },
  })

  const result = await copySourceAssets(sourceDir, outputDir)

  await assertSuccessResult(result, 0, 0, {})

  await assertFileExists('output/index.pres.md', false)
  await assertFileExists('output/details.pres.mdx', false)
})

test('Fail gracefully if the source directory does not exist', async () => {
  const { outputDir } = await setUp()
  const nonExistentDir = path.join(outputDir, 'non-existent')

  const result = await copySourceAssets(nonExistentDir, outputDir)

  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.code).toBe(ErrorCode.DIRECTORY_NOT_FOUND)
    expect(result.error.message).toContain('not found')
  }
})

test('Continue processing even if a single file fails to copy', async () => {
  const { sourceDir, outputDir } = await setUp({
    source: {
      'file1.txt': 'content 1',
      'file2.txt': 'content 2',
      'unreadable.txt': 'content 3',
    },
  })

  const copyFileSpy = await setupCopyFileFailureMock('unreadable.txt')
  const loggerErrorSpy = await setupLoggerErrorSpy()

  const result = await copySourceAssets(sourceDir, outputDir)

  await assertSuccessResult(result, 2, 1, { txt: 2 })

  await assertFileExists('output/file1.txt', true)
  await assertFileExists('output/file2.txt', true)
  await assertFileExists('output/unreadable.txt', false)

  expect(loggerErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining('Failed to copy file:'),
    expect.objectContaining({
      message: 'Permission denied',
      code: ErrorCode.PERMISSION_ERROR,
    })
  )

  vi.restoreAllMocks()
})
