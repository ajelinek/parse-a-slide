import path from 'path'
import os from 'os'
import { expect, test, vi } from 'vitest'
import { fileSystemSetup, FileSystemStructure } from '../../test-utils/file-test-util'
import { discoverPresentations } from '../discovery'
import { ErrorCode, err, createError, AppError } from '../../utils/error'
import * as fsUtils from '../../utils/fs-utils'
import { Result } from 'neverthrow'
import { PresentationMetadata, FragmentMetadata } from '../../types/presentation'

/**
 * Setup function for discovery tests
 * Creates necessary test directories and files
 */
async function setUp(structure: FileSystemStructure) {
  const testDir = await fileSystemSetup('discovery', structure)

  return {
    testDir,
    inputDir: path.join(testDir, 'input-dir'),
  }
}

test('discoverPresentations should return a presentation with a single index file', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      'index.pres.md': '# Test Presentation',
    },
  })

  const result = await discoverPresentations(inputDir)

  const presentations = assertSuccessResult(result)

  expect(presentations.length).toBe(1)

  const presentation = presentations[0]

  expect(presentation.id).toBeDefined()
  expect(presentation.url).toBe('/input-dir')
  expect(presentation.fullPath).toBe(path.join(inputDir, 'index.pres.md'))
  expect(presentation.name).toBe('input-dir')
  expect(presentation.extension).toBe('.pres.md')
  expect(presentation.entrySlideId).toBeDefined()

  expect(presentation.fragmentMetaData.length).toBe(1)
  assertFragment(presentation.fragmentMetaData[0], {
    isEntry: true,
    name: 'index',
    fullPath: path.join(inputDir, 'index.pres.md'),
    relativePath: 'index.pres.md',
    extension: '.md',
    id: presentation.entrySlideId,
  })
})

test('discoverPresentations should return a presentation with an index file and multiple fragment files', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      'index.pres.md': '# Main Presentation',
      'slide1.pres.md': '# Slide 1',
      'slide2.pres.md': '# Slide 2',
    },
  })

  const result = await discoverPresentations(inputDir)

  const presentations = assertSuccessResult(result)

  expect(presentations.length).toBe(1)

  const presentation = presentations[0]

  expect(presentation.fragmentMetaData.length).toBe(3)

  assertFragment(findFragmentByName(presentation, 'index'), { isEntry: true })
  assertFragment(findFragmentByName(presentation, 'slide1'), { isEntry: false })
  assertFragment(findFragmentByName(presentation, 'slide2'), { isEntry: false })
})

test('discoverPresentations should find multiple presentations in subdirectories', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      pres1: {
        'index.pres.md': '# Presentation 1',
      },
      pres2: {
        'index.pres.md': '# Presentation 2',
      },
    },
  })

  const result = await discoverPresentations(inputDir)

  const presentations = assertSuccessResult(result)

  expect(presentations.length).toBe(2)

  const pres1 = presentations.find(p => p.name === 'pres1')
  expect(pres1).toBeDefined()
  if (pres1) {
    expect(pres1.fragmentMetaData.length).toBe(1)
    assertFragment(pres1.fragmentMetaData[0], { isEntry: true })
    expect(pres1.fullPath).toBe(path.join(inputDir, 'pres1', 'index.pres.md'))
  }

  const pres2 = presentations.find(p => p.name === 'pres2')
  expect(pres2).toBeDefined()
  if (pres2) {
    expect(pres2.fragmentMetaData.length).toBe(1)
    assertFragment(pres2.fragmentMetaData[0], { isEntry: true })
    expect(pres2.fullPath).toBe(path.join(inputDir, 'pres2', 'index.pres.md'))
  }
})

test('discoverPresentations should find presentation with MDX extension', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      'index.pres.mdx': '# MDX Presentation',
    },
  })

  const result = await discoverPresentations(inputDir)

  const presentations = assertSuccessResult(result)

  expect(presentations.length).toBe(1)

  const presentation = presentations[0]

  expect(presentation.extension).toBe('.pres.mdx')

  expect(presentation.fragmentMetaData.length).toBe(1)
  assertFragment(presentation.fragmentMetaData[0], {
    isEntry: true,
    extension: '.mdx',
  })
})

test('discoverPresentations should not find standalone presentation files', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      'standalone.pres.md': '# Standalone Presentation',
    },
  })

  const result = await discoverPresentations(inputDir)
  const presentations = assertSuccessResult(result)
  expect(presentations.length).toBe(0)
})

test('discoverPresentations should find presentation with fragments in deeply nested subfolders', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      'index.pres.md': '# Main Presentation',
      level1: {
        'fragment1.pres.md': '# Fragment 1',
        level2: {
          'fragment2.pres.md': '# Fragment 2',
          level3: {
            'fragment3.pres.md': '# Fragment 3',
          },
        },
        level2b: {
          'fragment4.pres.md': '# Fragment 4',
          'fragment5.pres.md': '# Fragment 5',
        },
      },
    },
  })

  const result = await discoverPresentations(inputDir)
  const presentations = assertSuccessResult(result)

  expect(presentations.length).toBe(1)
  const presentation = presentations[0]
  expect(presentation.fragmentMetaData.length).toBe(6)

  assertFragment(findFragmentByName(presentation, 'index'), { isEntry: true })

  assertFragment(findFragmentByName(presentation, 'fragment3'), {
    isEntry: false,
    relativePath: path.join('level1', 'level2', 'level3', 'fragment3.pres.md'),
  })

  assertFragment(findFragmentByName(presentation, 'fragment5'), {
    isEntry: false,
    relativePath: path.join('level1', 'level2b', 'fragment5.pres.md'),
  })
})

test('discoverPresentations should ignore non-presentation files', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      'index.pres.md': '# Main Presentation',
      'regular.md': '# Regular Markdown',
      'regular.mdx': '# Regular MDX',
      'image.png': 'binary content', // Simulated binary content
      'data.json': '{ "test": true }',
    },
  })

  const result = await discoverPresentations(inputDir)

  const presentations = assertSuccessResult(result)

  expect(presentations.length).toBe(1)

  const presentation = presentations[0]

  expect(presentation.fragmentMetaData.length).toBe(1)
  expect(presentation.fragmentMetaData[0].name).toBe('index')

  const nonPresentationFiles = presentation.fragmentMetaData.filter((f: FragmentMetadata) =>
    ['regular.md', 'regular.mdx', 'image.png', 'data.json'].includes(f.relativePath)
  )
  expect(nonPresentationFiles.length).toBe(0)
})

test('discoverPresentations should find presentation with index file nested two directories deep', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      category: {
        subcategory: {
          'index.pres.md': '# Nested Presentation',
          'slide1.pres.md': '# Slide 1',
        },
      },
    },
  })

  const result = await discoverPresentations(inputDir)

  const presentations = assertSuccessResult(result)

  expect(presentations.length).toBe(1)

  const presentation = presentations[0]

  expect(presentation.name).toBe('subcategory')

  expect(presentation.fragmentMetaData.length).toBe(2)

  assertFragment(findFragmentByName(presentation, 'index'), { isEntry: true })
})

test('discoverPresentations should ignore standalone fragments without index file', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      'fragment1.pres.md': '# Fragment 1',
      'fragment2.pres.md': '# Fragment 2',
    },
  })

  const result = await discoverPresentations(inputDir)

  const presentations = assertSuccessResult(result)

  expect(presentations.length).toBe(0)
})

test('discoverPresentations should ignore fragments in subdirectory without index file', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      subfolder: {
        'fragment1.pres.md': '# Fragment 1',
        'fragment2.pres.md': '# Fragment 2',
      },
    },
  })

  const result = await discoverPresentations(inputDir)

  const presentations = assertSuccessResult(result)

  expect(presentations.length).toBe(0)
})

test('discoverPresentations should handle empty directory', async () => {
  const { inputDir } = await setUp({
    'input-dir': null,
  })

  const result = await discoverPresentations(inputDir)

  const presentations = assertSuccessResult(result)

  expect(presentations.length).toBe(0)
})

test('discoverPresentations should handle non-existent directory', async () => {
  const nonExistentDir = path.join(os.tmpdir(), 'non-existent-dir-' + Date.now().toString())

  const result = await discoverPresentations(nonExistentDir)

  assertErrorResult(result, ErrorCode.DIRECTORY_NOT_FOUND, 'Directory not found')
})

test('discoverPresentations should handle conflicting index files', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      'index.pres.md': '# MD Presentation',
      subfolder: {
        'index.pres.md': '# Nested Presentation',
      },
    },
  })

  const result = await discoverPresentations(inputDir)

  assertErrorResult(result, ErrorCode.NESTED_INDEX_FILES, 'Nested index files found')
})

test('discoverPresentations should handle conflicting index files in subdirectories', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      'index.pres.md': '# Main Presentation',
      subfolder: {
        'index.pres.md': '# Nested Presentation',
        'slide1.pres.md': '# Slide 1',
      },
    },
  })

  const result = await discoverPresentations(inputDir)

  assertErrorResult(result, ErrorCode.NESTED_INDEX_FILES, 'Nested index files found')
})

test('discoverPresentations should handle permission denied', async () => {
  const pathExistsSpy = vi.spyOn(fsUtils, 'pathExists')
  pathExistsSpy.mockResolvedValue(err(createError('Permission denied', ErrorCode.PERMISSION_ERROR)))

  const { inputDir } = await setUp({
    'input-dir': {
      'index.pres.md': '# Test',
    },
  })

  const result = await discoverPresentations(inputDir)

  assertErrorResult(result, ErrorCode.PERMISSION_ERROR, 'Permission denied')

  pathExistsSpy.mockRestore()
})

test('discoverPresentations should handle unexpected file system error', async () => {
  const findFilesSpy = vi.spyOn(fsUtils, 'findFiles')
  findFilesSpy.mockResolvedValue(err(createError('Unexpected file system error', ErrorCode.IO_ERROR)))

  const { inputDir } = await setUp({
    'input-dir': {
      'index.pres.md': '# Test',
    },
  })

  const result = await discoverPresentations(inputDir)

  assertErrorResult(result, ErrorCode.IO_ERROR, 'Unexpected file system error')

  findFilesSpy.mockRestore()
})

function assertSuccessResult<T>(result: Result<T, AppError>): T {
  expect(result.isOk()).toBe(true)
  return result._unsafeUnwrap()
}

function assertErrorResult(result: Result<any, AppError>, code: ErrorCode, messageContains?: string) {
  expect(result.isErr()).toBe(true)
  const error = result._unsafeUnwrapErr()
  expect(error.code).toBe(code)
  if (messageContains) {
    expect(error.message).toContain(messageContains)
  }
}

function assertFragment(fragment: FragmentMetadata | undefined, expected: Partial<FragmentMetadata>) {
  expect(fragment).toBeDefined()
  if (fragment) {
    Object.entries(expected).forEach(([key, value]) => {
      expect(fragment[key as keyof FragmentMetadata]).toEqual(value)
    })
  }
}

function findFragmentByName(presentation: PresentationMetadata, name: string): FragmentMetadata | undefined {
  return presentation.fragmentMetaData.find((f: FragmentMetadata) => f.name === name)
}
