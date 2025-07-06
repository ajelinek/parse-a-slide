import { test, expect, vi } from 'vitest'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { inflate } from '../presentation-inflator'
import { PresentationMetadata, FragmentMetadata } from '../../types/presentation'
import { ErrorCode, createError, AppError } from '../../utils/error'
import * as fsUtils from '../../utils/fs-utils'
import { Result, err } from 'neverthrow'

async function setUp() {
  const testDir = join(process.cwd(), 'test-temp')
  await rm(testDir, { recursive: true, force: true }) // teardown before test
  await mkdir(testDir, { recursive: true })
  return { testDir, inflate }
}

// --- TESTS ---

test('inflate should merge entry point and fragment front matter', async () => {
  const { testDir, inflate } = await setUp()

  // Create entry point file with base front matter
  const entryPath = join(testDir, 'entry.pres.md')
  const entryContent = `---\ntheme: "dark"\nauthor: "Base Author"\nbaseField: "base value"\n---\n# Entry Content`
  await writeFile(entryPath, entryContent)

  // Create fragment file with override front matter
  const fragmentPath = join(testDir, 'fragment.pres.md')
  const fragmentContent = `---\ntitle: "Fragment Title"\nauthor: "Fragment Author"\nfragmentField: "fragment value"\n---\n# Fragment Content`
  await writeFile(fragmentPath, fragmentContent)

  // Create presentation metadata
  const fragmentMetaData = [
    createFragmentMeta({ id: 'entry-1', name: 'entry.pres.md', fullPath: entryPath, isEntry: true }),
    createFragmentMeta({ id: 'fragment-1', name: 'fragment.pres.md', fullPath: fragmentPath, isEntry: false }),
  ]
  const metadata = createPresentationMeta({ fragmentMetaData, entrySlideId: 'entry-1', fullPath: testDir })

  // Call inflate
  const result = await inflate(metadata)
  const presentation = assertSuccessResult(result)

  // Verify result structure
  expect(presentation.metadata).toBe(metadata)
  expect(presentation.fragments).toHaveLength(2)

  // Verify entry fragment
  const entryFragment = presentation.fragments.find(f => f.isEntry)
  expect(entryFragment?.content.trim()).toBe('# Entry Content')
  expect(entryFragment?.frontMatter).toEqual({
    theme: 'dark',
    author: 'Base Author',
    baseField: 'base value',
  })

  // Verify regular fragment with merged front matter
  const regularFragment = presentation.fragments.find(f => !f.isEntry)
  expect(regularFragment?.content.trim()).toBe('# Fragment Content')
  expect(regularFragment?.frontMatter).toEqual({
    theme: 'dark',
    author: 'Fragment Author', // Override wins
    baseField: 'base value', // Inherited from base
    title: 'Fragment Title', // Added from fragment
    fragmentField: 'fragment value', // Added from fragment
  })
})

test('inflate should successfully handle an empty fragment metadata array', async () => {
  const metadata = createPresentationMeta({ fragmentMetaData: [], entrySlideId: 'entry-1' })
  const result = await inflate(metadata)
  assertErrorResult(result, ErrorCode.NO_ENTRY_FRAGMENT, 'No entry fragment found')
})

test('inflate should fail if a file is unreadable', async () => {
  const readFileSpy = vi.spyOn(fsUtils, 'readFile')
  readFileSpy.mockResolvedValue(err(createError('Permission denied', ErrorCode.PERMISSION_ERROR)))

  try {
    const fragmentMetaData = [
      createFragmentMeta({
        id: 'entry-1',
        name: 'entry.pres.md',
        fullPath: '/path/to/unreadable/file.pres.md',
        isEntry: true,
      }),
    ]
    const metadata = createPresentationMeta({ fragmentMetaData, entrySlideId: 'entry-1' })
    const result = await inflate(metadata)
    assertErrorResult(result, ErrorCode.PERMISSION_ERROR, 'Permission denied')
    expect(readFileSpy).toHaveBeenCalledWith('/path/to/unreadable/file.pres.md')
  } finally {
    vi.restoreAllMocks()
  }
})

test('inflate should fail if a file does not exist', async () => {
  const readFileSpy = vi.spyOn(fsUtils, 'readFile')
  readFileSpy.mockResolvedValue(err(createError('File not found', ErrorCode.FILE_NOT_FOUND)))

  try {
    const fragmentMetaData = [
      createFragmentMeta({
        id: 'entry-1',
        name: 'entry.pres.md',
        fullPath: '/path/to/nonexistent/file.pres.md',
        isEntry: true,
      }),
    ]
    const metadata = createPresentationMeta({ fragmentMetaData, entrySlideId: 'entry-1' })
    const result = await inflate(metadata)
    assertErrorResult(result, ErrorCode.FILE_NOT_FOUND, 'File not found')
    expect(readFileSpy).toHaveBeenCalledWith('/path/to/nonexistent/file.pres.md')
  } finally {
    vi.restoreAllMocks()
  }
})

// --- HELPERS ---

function createFragmentMeta({
  id,
  name,
  fullPath,
  isEntry = false,
  extension = '.md',
  relativePath,
}: Partial<FragmentMetadata> & { id: string; name: string; fullPath: string; isEntry?: boolean }): FragmentMetadata {
  return {
    id,
    name,
    fullPath,
    relativePath: relativePath ?? `./${name}`,
    extension,
    isEntry: !!isEntry,
  }
}

function createPresentationMeta({
  fragmentMetaData,
  entrySlideId = '',
  id = 'test-presentation',
  url = 'test-url',
  fullPath = '/test/path',
  name = 'test',
  extension = '.md',
}: Partial<PresentationMetadata> & { fragmentMetaData: FragmentMetadata[] }): PresentationMetadata {
  return {
    id,
    url,
    fullPath,
    name,
    extension,
    entrySlideId,
    fragmentMetaData,
  }
}

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
