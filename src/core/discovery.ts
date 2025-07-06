import { nanoid } from 'nanoid'
import path from 'path'
import { FragmentMetadata, PresentationMetadata } from '../types/presentation'
import { createError, err, ErrorCode, ok, PasAsyncResult } from '../utils/error'
import { findFiles, pathExists } from '../utils/fs-utils'

// Internal type to represent validated files in a directory
interface DirectoryPresFiles {
  indexFile: string
  fragmentFiles: string[]
  format: 'md' | 'mdx'
}

/**
 * Discovers all presentations in the specified directory.
 *
 * @param inputDir Path to the directory to search for presentations
 * @returns A PasResult containing an array of PresentationMetadata objects or an error
 */
export async function discoverPresentations(inputDir: string): PasAsyncResult<PresentationMetadata[]> {
  // First check if the input directory exists
  const dirExistsResult = await pathExists(inputDir)

  if (dirExistsResult.isErr()) {
    return err(dirExistsResult.error)
  }

  if (!dirExistsResult.value) {
    return err(createError(`Directory not found: ${inputDir}`, ErrorCode.DIRECTORY_NOT_FOUND))
  }

  // Step 1: Find all index.pres.{md,mdx} files
  const indexFilesResult = await findFiles('**/index.pres.{md,mdx}', inputDir)
  if (indexFilesResult.isErr()) {
    return err(indexFilesResult.error)
  }

  const indexFiles = indexFilesResult.value
  const presentations: PresentationMetadata[] = []
  const errors: string[] = []

  // Step 2: For each index file, create a presentation and find its fragments
  for (const indexFile of indexFiles) {
    const presentationDir = path.dirname(indexFile)
    const extension = path.extname(indexFile)
    const format = extension === '.md' ? 'md' : 'mdx'

    // Step 3: Find all fragments in the same directory and subdirectories
    const fragmentGlob = path.join(presentationDir, '**/*.pres.{md,mdx}')
    const fragmentsResult = await findFiles(fragmentGlob, inputDir)
    if (fragmentsResult.isErr()) {
      return err(fragmentsResult.error)
    }

    // Validate that there are no conflicting index files in subdirectories
    const subdirIndexFiles = fragmentsResult.value
      .filter(file => path.basename(file) === 'index.pres.md' || path.basename(file) === 'index.pres.mdx')
      .filter(file => file !== indexFile)

    if (subdirIndexFiles.length > 0) {
      errors.push(
        `Nested index files found under presentation at ${presentationDir}. Nested index files: ${subdirIndexFiles.join(
          ', '
        )}`
      )
      continue
    }

    // Create the presentation metadata
    const presentation = createPresentationMetadata(presentationDir, {
      indexFile,
      fragmentFiles: fragmentsResult.value,
      format: format as 'md' | 'mdx',
    })

    presentations.push(presentation)
  }

  // If there were any errors, return the first one
  if (errors.length > 0) {
    return err(createError(errors[0], ErrorCode.NESTED_INDEX_FILES))
  }

  return ok(presentations)
}

/**
 * Creates metadata for a presentation from validated files
 *
 * @param dir Directory path
 * @param files Validated directory contents
 * @returns PresentationMetadata object
 */
function createPresentationMetadata(dir: string, files: DirectoryPresFiles): PresentationMetadata {
  const presentationId = nanoid()
  const entryId = nanoid()
  const indexFile = files.indexFile

  // Determine presentation name from directory
  const name = path.basename(dir) || 'root'
  const extension = files.format === 'md' ? '.pres.md' : '.pres.mdx'

  // Create fragment metadata for each file
  const fragments: FragmentMetadata[] = files.fragmentFiles.map(file => {
    const isEntry = file === indexFile
    const fileName = path.basename(file)
    const fragmentName = fileName.replace('.pres.md', '').replace('.pres.mdx', '')

    // Calculate the relative path from the presentation root directory
    const relativePath = path.relative(dir, file)

    return {
      id: isEntry ? entryId : nanoid(),
      name: fragmentName,
      fullPath: file,
      relativePath,
      extension: path.extname(file),
      isEntry,
    }
  })

  // Create the presentation metadata
  return {
    id: presentationId,
    url: `/${name}`,
    fullPath: indexFile,
    name,
    extension,
    entrySlideId: entryId,
    fragmentMetaData: fragments,
  }
}
