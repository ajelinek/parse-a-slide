import { ErrorCode, PasResult, createError, err, ok } from '../../utils/error'
import { REGEX_LINE_BREAK } from '../const'
import { determineDelimiterLevel } from './parser-utils'

export type RawSlide = {
  content: string
  childLevel: number
  isFragment: boolean
}

export function splitIntoRawSlides(content: string, isFragment = false): PasResult<RawSlide[]> {
  const splitContent: RawSlide[] = []
  const lines = content.split(REGEX_LINE_BREAK)
  const buffer: string[] = []
  let holdLevel = 0

  for (const line of lines) {
    const level = determineDelimiterLevel(line)
    if (!isValidLevelIncrease(level, holdLevel)) {
      return err(createError(`Invalid nesting increase: cannot skip levels`, ErrorCode.INVALID_DELIMITER_SEQUENCE))
    }

    if (level >= 0) {
      flushBuffer()
      holdLevel = level
    } else {
      buffer.push(line)
    }
  }

  if (buffer.length > 0) flushBuffer()
  return ok(splitContent)

  /** Utility Functions */
  function flushBuffer() {
    splitContent.push({
      content: buffer.join('\r\n'),
      childLevel: holdLevel,
      isFragment,
    })
    buffer.length = 0
  }

  function isValidLevelIncrease(level: number, holdLevel: number): boolean {
    return !(level > holdLevel + 1)
  }
}
