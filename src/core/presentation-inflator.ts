import { PresentationMetadata, Presentation, Fragment } from '../types/presentation'
import { PasAsyncResult, ok, err, createError, ErrorCode } from '../utils/error'
import { readFile } from '../utils/fs-utils'
import { parse, merge } from './front-matter-parser'

/**
 * Takes presentation metadata, reads all associated files, processes front matter,
 * and returns a fully inflated Presentation object.
 * @param metadata The PresentationMetadata from the Discovery stage.
 * @returns A PasAsyncResult resolving to a complete Presentation object.
 */
export async function inflate(metadata: PresentationMetadata): PasAsyncResult<Presentation> {
  const entryFragment = metadata.fragmentMetaData.find(f => f.isEntry)
  if (!entryFragment) {
    return err(createError('No entry fragment found in presentation metadata', ErrorCode.NO_ENTRY_FRAGMENT))
  }

  // Read and parse entry point front matter
  const entryContentResult = await readFile(entryFragment.fullPath)
  if (entryContentResult.isErr()) {
    return err(entryContentResult.error)
  }

  const parseResult = parse(entryContentResult.value)
  if (parseResult.isErr()) {
    return err(parseResult.error)
  }
  const { frontMatter: baseFrontMatter } = parseResult.value

  // Process all fragments
  const fragments: Fragment[] = []
  for (const fragmentMeta of metadata.fragmentMetaData) {
    const rawContentResult = await readFile(fragmentMeta.fullPath)
    if (rawContentResult.isErr()) {
      return err(rawContentResult.error)
    }

    const fragmentParseResult = parse(rawContentResult.value)
    if (fragmentParseResult.isErr()) {
      return err(fragmentParseResult.error)
    }
    const { frontMatter: fragmentFrontMatter, content } = fragmentParseResult.value

    // Merge front matter: base + fragment-specific
    const finalFrontMatter = merge(baseFrontMatter, fragmentFrontMatter)

    const fragment: Fragment = {
      ...fragmentMeta,
      content,
      frontMatter: finalFrontMatter,
    }

    fragments.push(fragment)
  }

  return ok({
    metadata,
    fragments,
  })
}
