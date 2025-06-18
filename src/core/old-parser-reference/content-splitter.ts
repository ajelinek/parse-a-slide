import { Result } from 'neverthrow'
import { AppError, ErrorCode, createError, ok, err } from '../../utils/error'
import { SlideContent, DelimiterInfo } from './types'

/**
 * Split slide content by delimiters
 */
export function splitContentByDelimiters(content: string): SlideContent[] {
  const lines = content.split('\n')
  const result: SlideContent[] = []
  let currentContent: string[] = []
  let nextChildLevel = 0
  let currentMaxLevel = 0
  let lastWasSiblingDelimiter = false

  const flushCurrentContent = () => {
    if (currentContent.length > 0) {
      result.push({
        content: currentContent.join('\n'),
        childLevel: nextChildLevel,
        isDelimiter: false,
      })
      currentContent = []
    } else if (lastWasSiblingDelimiter) {
      result.push({
        content: '',
        childLevel: nextChildLevel,
        isDelimiter: false,
      })
    }
  }

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine === '---' || trimmedLine === '--->' || trimmedLine === '-->>') {
      flushCurrentContent()

      if (trimmedLine === '---') {
        lastWasSiblingDelimiter = true
        nextChildLevel = 0
        currentMaxLevel = Math.max(currentMaxLevel, 0)
      } else {
        lastWasSiblingDelimiter = false
        const newLevel = trimmedLine === '--->' ? 1 : 2

        // Validate that we're not skipping levels
        if (newLevel > currentMaxLevel + 1) {
          throw createError('Invalid nesting increase: cannot skip levels', ErrorCode.PARSER_DELIMITER_SEQUENCE_ERROR)
        }

        nextChildLevel = newLevel
        currentMaxLevel = Math.max(currentMaxLevel, newLevel)
      }
      continue
    }

    lastWasSiblingDelimiter = false
    currentContent.push(line)
  }

  if (currentContent.length > 0) {
    result.push({
      content: currentContent.join('\n').trim(),
      childLevel: nextChildLevel,
      isDelimiter: false,
    })
  } else if (lastWasSiblingDelimiter) {
    // Handle case where presentation ends with a delimiter - create empty slide
    result.push({
      content: '',
      childLevel: nextChildLevel,
      isDelimiter: false,
    })
  }

  return result.filter(slide => !slide.isDelimiter)
}

/**
 * Parse a line to determine if it's a valid delimiter and extract its properties
 */
export function parseDelimiter(line: string): DelimiterInfo | null {
  const trimmedLine = line.trim()

  if (trimmedLine === '---') {
    return {
      type: 'SIBLING',
      level: 0,
      position: line.indexOf('---'),
    }
  }

  if (trimmedLine === '--->') {
    return {
      type: 'CHILD',
      level: 1,
      position: line.indexOf('--->'),
    }
  }

  if (trimmedLine === '-->>') {
    return {
      type: 'CHILD',
      level: 2,
      position: line.indexOf('-->>'),
    }
  }

  return null
}

/**
 * Validate that delimiter sequence doesn't skip nesting levels
 */
export function validateDelimiterSequence(delimiters: DelimiterInfo[]): Result<void, AppError> {
  let maxLevel = 0

  for (const delimiter of delimiters) {
    if (delimiter.type === 'CHILD' && delimiter.level > maxLevel + 1) {
      return err(createError('Invalid nesting increase: cannot skip levels', ErrorCode.PARSER_DELIMITER_SEQUENCE_ERROR))
    }

    maxLevel = Math.max(maxLevel, delimiter.level)
  }

  return ok(undefined)
}
