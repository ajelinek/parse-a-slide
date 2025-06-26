import { REGEX_DELIMITER, REGEX_FRAGMENT_REF } from '../const'

export function determineDelimiterLevel(line: string): number {
  const match = line.trim().match(REGEX_DELIMITER)
  if (!match) {
    return -1
  }
  return match[1].length
}

/**
 * Checks if a string is an embedded fragment reference
 * @param content The content to check
 * @returns True if content is an embedded fragment reference
 */
export function isEmbeddedFragment(content: string): boolean {
  return getFragmentMatch(content) !== null
}

/**
 * Extracts the file path from a markdown fragment reference
 * @param content The content containing markdown fragment references
 * @returns The extracted file path or null if no match is found
 */
export function extractFragmentPath(content: string): string | null {
  const match = getFragmentMatch(content)
  if (!match || !match[2]) {
    return null
  }
  
  // The second capturing group contains the URL/path
  return match[2]
}

/**
 * Private helper function to match fragment references
 * @param content The content to check for fragment references
 * @returns The regex match result or null if no match found
 */
function getFragmentMatch(content: string): RegExpMatchArray | null {
  return content.trim().match(REGEX_FRAGMENT_REF)
}
