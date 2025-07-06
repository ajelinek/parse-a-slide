import matter from 'gray-matter'

/**
 * Parses raw file content to separate YAML front matter from the main content.
 * @param rawContent The raw string content of a file.
 * @returns An object containing the parsed front matter and the content without front matter.
 */
export function parse(rawContent: string): { frontMatter: Record<string, any>; content: string } {
  const { data, content } = matter(rawContent)
  return { frontMatter: data, content }
}

/**
 * Merges two front matter objects. Properties from the `overrideObject` will overwrite those in the `baseObject`.
 * @param baseObject The base object (e.g., from the entry point).
 * @param overrideObject The overriding object (e.g., from a specific fragment).
 * @returns A new object with the merged properties.
 */
export function merge(baseObject: object, overrideObject: object): object {
  return { ...baseObject, ...overrideObject }
}
