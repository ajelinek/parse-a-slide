import matter from 'gray-matter'
import { FrontMatter } from '../types/frontmatter'
import { PasResult, ok, err, createError, ErrorCode } from '../utils/error'

/**
 * Parses raw file content to separate YAML front matter from the main content.
 * @param rawContent The raw string content of a file.
 * @returns A PasResult containing the parsed front matter and content, or an error if YAML parsing fails.
 */
export function parse(rawContent: string): PasResult<{ frontMatter: FrontMatter; content: string }> {
  try {
    const { data, content } = matter(rawContent)
    return ok({ frontMatter: data, content })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown YAML parsing error'
    return err(createError(`Failed to parse YAML front matter: ${errorMessage}`, ErrorCode.PARSER_ERROR))
  }
}

/**
 * Merges two front matter objects. Properties from the `overrideObject` will overwrite those in the `baseObject`.
 * @param baseObject The base object (e.g., from the entry point).
 * @param overrideObject The overriding object (e.g., from a specific fragment).
 * @returns A new object with the merged properties.
 */
export function merge(baseObject: FrontMatter, overrideObject: FrontMatter): FrontMatter {
  return { ...baseObject, ...overrideObject }
}
