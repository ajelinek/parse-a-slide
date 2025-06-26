import { REGEX_DELIMITER, REGEX_FRAGMENT_REF } from '../const'

export function determineDelimiterLevel(line: string): number {
  const match = line.trim().match(REGEX_DELIMITER)
  if (!match) {
    return -1
  }
  return match[1].length
}

export function isEmbeddedFragment(content: string): boolean {
  return content.trim().match(REGEX_FRAGMENT_REF) !== null
}

/**
 * Extracts the file path from a markdown fragment reference
 * @param content The content containing markdown fragment references
 * @returns The extracted file path or null if no match is found
 */
export function extractFragmentPath(content: string): string | null {
  const match = content.trim().match(REGEX_FRAGMENT_REF)
  if (!match || !match[2]) {
    return null
  }
  
  // The second capturing group contains the URL/path
  return match[2]
}
