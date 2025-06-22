import { REGEX_DELIMITER } from '../const'

export function determineDelimiterLevel(line: string): number {
  const match = line.trim().match(REGEX_DELIMITER)
  if (!match) {
    return -1
  }
  return match[1].length
}
