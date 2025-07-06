import matter from 'gray-matter'
import { FrontMatter } from '../types/frontmatter'

/**
 * Parses raw file content to separate YAML front matter from the main content.
 * @param rawContent The raw string content of a file.
 * @returns An object containing the parsed front matter and the content without front matter.
 */
export function parse(rawContent: string): { frontMatter: FrontMatter; content: string } {
  const { data, content } = matter(rawContent)
  return { frontMatter: data, content }
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
