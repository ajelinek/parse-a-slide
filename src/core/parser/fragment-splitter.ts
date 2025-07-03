import { ErrorCode, PasResult, createError, err, ok } from '../../utils/error'
import { REGEX_LINE_BREAK } from '../const'
import { determineDelimiterLevel } from './parser-utils'

export type RawSlide = {
  content: string
  childLevel: number
  isFragment: boolean
  path: string
}

export function splitIntoRawSlides(
  content: string,
  path = '',
  isFragment = false,
  baseLevel = 0
): PasResult<RawSlide[]> {
  const splitContent: RawSlide[] = []
  const lines = content.split(REGEX_LINE_BREAK)
  const buffer: string[] = []
  let holdLevel = baseLevel
  let lastLine = ''

  for (const line of lines) {
    const level = determineDelimiterLevel(line)
    if (!isValidLevelIncrease(level, holdLevel)) {
      return err(createError(`Invalid nesting increase: cannot skip levels`, ErrorCode.INVALID_DELIMITER_SEQUENCE))
    }

    if (level >= 0) {
      flushBuffer()
      holdLevel = baseLevel + level
    } else {
      buffer.push(line)
    }

    lastLine = line
  }

  if (buffer.length > 0) flushBuffer()
  if (determineDelimiterLevel(lastLine) >= 0) flushBuffer()
  return ok(splitContent)

  /** Utility Functions */
  function flushBuffer() {
    splitContent.push({
      content: buffer.join('\r\n'),
      childLevel: holdLevel,
      isFragment,
      path,
    })
    buffer.length = 0
  }

  function isValidLevelIncrease(level: number, holdLevel: number): boolean {
    // Convert absolute holdLevel back to relative level for validation
    const relativeHoldLevel = holdLevel - baseLevel
    return !(level > relativeHoldLevel + 1)
  }
}
