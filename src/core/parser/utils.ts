import { REGEX_DELIMITER, REGEX_LINE_BREAK } from '../const'

export function determineDelimiterLevel(line: string): number {
  const match = line.trim().match(REGEX_DELIMITER)
  if (!match) {
    return -1
  }
  return match[1].length
}

export type rawSlide = {
  content: string
  childLevel: number
  isFragment: boolean
}
export function splitIntoRawSlides(content: string, isFragment = false): rawSlide[] {
  const splitContent: rawSlide[] = []
  const lines = content.split(REGEX_LINE_BREAK)
  const buffer: string[] = []
  let holdLevel = 0

  for (const line of lines) {
    const level = determineDelimiterLevel(line)
    console.log('🚀 ~ splitIntoRawSlides ~ level:', { level, holdLevel, line })

    if (level >= 0) {
      flushBuffer()
      holdLevel = level
    } else {
      buffer.push(line)
    }
  }

  if (buffer.length > 0) flushBuffer()
  return splitContent

  /** Utility Functions */
  function flushBuffer() {
    console.log('🚀 ~ flushBuffer ~ buffer:', buffer)
    splitContent.push({
      content: buffer.join('\r\n'),
      childLevel: holdLevel,
      isFragment,
    })
    buffer.length = 0
  }
}
