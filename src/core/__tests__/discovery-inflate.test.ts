import path from 'path'
import { expect, test, vi } from 'vitest'
import { fileSystemSetup, FileSystemStructure } from '../../test-utils/file-test-util'
import { inflateFragments } from '../discovery'
import { ErrorCode, err, createError, AppError } from '../../utils/error'
import * as fsUtils from '../../utils/fs-utils'
import { FragmentMetadata, Fragment } from '../../types/presentation'
import { Result } from 'neverthrow'

/**
 * Setup function for fragment inflation tests
 */
async function setUp(structure: FileSystemStructure) {
  const testDir = await fileSystemSetup('fragment-inflation', structure)

  return {
    testDir,
    inputDir: path.join(testDir, 'input-dir'),
  }
}

function createFragmentMetadata(props: Partial<FragmentMetadata> & { fullPath: string }): FragmentMetadata {
  return {
    id: props.id || 'fragment-id',
    name: props.name || 'fragment-name',
    fullPath: props.fullPath,
    relativePath: props.relativePath || 'fragment.pres.md',
    extension: props.extension || '.md',
    isEntry: props.isEntry || false,
  }
}

test('inflateFragments should successfully inflate a single fragment', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      'fragment.pres.md': '# Test Fragment',
    },
  })

  const fragmentPath = path.join(inputDir, 'fragment.pres.md')
  const fragmentMetadatas = [
    createFragmentMetadata({
      fullPath: fragmentPath,
      name: 'fragment',
    }),
  ]

  const result = await inflateFragments(fragmentMetadatas)
  const fragments = assertSuccessResult(result)

  expect(fragments.length).toBe(1)
  const fragment = fragments[0]
  expect(fragment).toMatchObject(fragmentMetadatas[0])
  expect(fragment.content).toBe('# Test Fragment')
})

test('inflateFragments should successfully inflate multiple fragments', async () => {
  const { inputDir } = await setUp({
    'input-dir': {
      'fragment1.pres.md': '# Fragment 1',
      'fragment2.pres.md': '# Fragment 2',
      'fragment3.pres.md': '# Fragment 3',
    },
  })

  const fragmentPath1 = path.join(inputDir, 'fragment1.pres.md')
  const fragmentPath2 = path.join(inputDir, 'fragment2.pres.md')
  const fragmentPath3 = path.join(inputDir, 'fragment3.pres.md')

  const fragmentMetadatas = [
    createFragmentMetadata({
      id: 'id1',
      fullPath: fragmentPath1,
      name: 'fragment1',
    }),
    createFragmentMetadata({
      id: 'id2',
      fullPath: fragmentPath2,
      name: 'fragment2',
    }),
    createFragmentMetadata({
      id: 'id3',
      fullPath: fragmentPath3,
      name: 'fragment3',
    }),
  ]

  const result = await inflateFragments(fragmentMetadatas)
  const fragments = assertSuccessResult(result)

  expect(fragments.length).toBe(3)

  // Check each fragment is properly inflated
  fragments.forEach((fragment, index) => {
    expect(fragment).toMatchObject(fragmentMetadatas[index])
    expect(fragment.content).toBe(`# Fragment ${index + 1}`)
  })

  // Check order is preserved
  expect(fragments[0].id).toBe('id1')
  expect(fragments[1].id).toBe('id2')
  expect(fragments[2].id).toBe('id3')
})

test('inflateFragments should successfully handle an empty array', async () => {
  const result = await inflateFragments([])
  const fragments = assertSuccessResult(result)
  expect(fragments).toEqual([])
})

test('inflateFragments should fail if a file is unreadable', async () => {
  // Setup mocks
  const readFileSpy = vi.spyOn(fsUtils, 'readFile')
  readFileSpy.mockResolvedValue(err(createError('Permission denied', ErrorCode.PERMISSION_ERROR)))

  // Clean up after test
  try {
    const fragmentMetadatas = [
      createFragmentMetadata({
        fullPath: '/path/to/unreadable/file.pres.md',
      }),
    ]

    const result = await inflateFragments(fragmentMetadatas)
    assertErrorResult(result, ErrorCode.PERMISSION_ERROR, 'Permission denied')

    expect(readFileSpy).toHaveBeenCalledWith('/path/to/unreadable/file.pres.md')
  } finally {
    vi.restoreAllMocks()
  }
})

test('inflateFragments should fail if a file does not exist', async () => {
  // Setup mocks
  const readFileSpy = vi.spyOn(fsUtils, 'readFile')
  readFileSpy.mockResolvedValue(err(createError('File not found', ErrorCode.FILE_NOT_FOUND)))

  // Clean up after test
  try {
    const fragmentMetadatas = [
      createFragmentMetadata({
        fullPath: '/path/to/nonexistent/file.pres.md',
      }),
    ]

    const result = await inflateFragments(fragmentMetadatas)
    assertErrorResult(result, ErrorCode.FILE_NOT_FOUND, 'File not found')

    expect(readFileSpy).toHaveBeenCalledWith('/path/to/nonexistent/file.pres.md')
  } finally {
    vi.restoreAllMocks()
  }
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
