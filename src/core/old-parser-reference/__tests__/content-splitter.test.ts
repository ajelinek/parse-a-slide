import { expect, test } from 'vitest'
import { splitContentByDelimiters, parseDelimiter, validateDelimiterSequence } from '../content-splitter'

function setUp(content: string) {
  return { content }
}

test('splitContentByDelimiters should split content with sibling delimiters', () => {
  const { content } = setUp(`First slide content
---
Second slide content
---
Third slide content`)

  const result = splitContentByDelimiters(content)

  expect(result).toHaveLength(3)
  expect(result[0]).toEqual({
    content: 'First slide content',
    childLevel: 0,
    isDelimiter: false,
  })
  expect(result[1]).toEqual({
    content: 'Second slide content',
    childLevel: 0,
    isDelimiter: false,
  })
  expect(result[2]).toEqual({
    content: 'Third slide content',
    childLevel: 0,
    isDelimiter: false,
  })
})

test('splitContentByDelimiters should split content with child delimiters', () => {
  const { content } = setUp(`Parent slide
--->
Child slide
-->>
Grandchild slide`)

  const result = splitContentByDelimiters(content)

  expect(result).toHaveLength(3)
  expect(result[0]).toEqual({
    content: 'Parent slide',
    childLevel: 0,
    isDelimiter: false,
  })
  expect(result[1]).toEqual({
    content: 'Child slide',
    childLevel: 1,
    isDelimiter: false,
  })
  expect(result[2]).toEqual({
    content: 'Grandchild slide',
    childLevel: 2,
    isDelimiter: false,
  })
})

test('splitContentByDelimiters should split content with mixed delimiter types', () => {
  const { content } = setUp(`First slide
---
Second slide
--->
Child of second`)

  const result = splitContentByDelimiters(content)

  expect(result).toHaveLength(3)
  expect(result[0]).toEqual({
    content: 'First slide',
    childLevel: 0,
    isDelimiter: false,
  })
  expect(result[1]).toEqual({
    content: 'Second slide',
    childLevel: 0,
    isDelimiter: false,
  })
  expect(result[2]).toEqual({
    content: 'Child of second',
    childLevel: 1,
    isDelimiter: false,
  })
})

test('splitContentByDelimiters should handle empty content blocks', () => {
  const { content } = setUp(`First slide
---

---
Third slide`)

  const result = splitContentByDelimiters(content)

  expect(result).toHaveLength(3)
  expect(result[0].content).toBe('First slide')
  expect(result[1].content).toBe('')
  expect(result[2].content).toBe('Third slide')
})

test('splitContentByDelimiters should handle content with no delimiters', () => {
  const { content } = setUp('Single slide content')

  const result = splitContentByDelimiters(content)

  expect(result).toHaveLength(1)
  expect(result[0]).toEqual({
    content: 'Single slide content',
    childLevel: 0,
    isDelimiter: false,
  })
})

test('splitContentByDelimiters should handle delimiters with surrounding whitespace', () => {
  const { content } = setUp(`First slide
  ---  
Second slide`)

  const result = splitContentByDelimiters(content)

  expect(result).toHaveLength(2)
  expect(result[0].content).toBe('First slide')
  expect(result[1].content).toBe('Second slide')
})

test('splitContentByDelimiters should create empty slide when ending with delimiter', () => {
  const { content } = setUp(`First slide
---`)

  const result = splitContentByDelimiters(content)

  expect(result).toHaveLength(2)
  expect(result[0].content).toBe('First slide')
  expect(result[1].content).toBe('')
})

test('parseDelimiter should parse sibling delimiter', () => {
  const line = '---'

  const result = parseDelimiter(line)

  expect(result).toEqual({
    type: 'SIBLING',
    level: 0,
    position: 0,
  })
})

test('parseDelimiter should parse child delimiter level 1', () => {
  const line = '--->'

  const result = parseDelimiter(line)

  expect(result).toEqual({
    type: 'CHILD',
    level: 1,
    position: 0,
  })
})

test('parseDelimiter should parse child delimiter level 2', () => {
  const line = '-->>>'

  const result = parseDelimiter(line)

  expect(result).toBeNull()
})

test('parseDelimiter should return null for non-delimiter line', () => {
  const line = 'Regular content line'

  const result = parseDelimiter(line)

  expect(result).toBeNull()
})

test('parseDelimiter should return null for malformed delimiter', () => {
  const line = '--'

  const result = parseDelimiter(line)

  expect(result).toBeNull()
})

test('parseDelimiter should handle delimiter with whitespace', () => {
  const line = '  ---  '

  const result = parseDelimiter(line)

  expect(result).toEqual({
    type: 'SIBLING',
    level: 0,
    position: 2,
  })
})

test('validateDelimiterSequence should validate correct sequence', () => {
  const delimiters = [
    { type: 'SIBLING' as const, level: 0, position: 0 },
    { type: 'CHILD' as const, level: 1, position: 0 },
    { type: 'CHILD' as const, level: 2, position: 0 },
  ]

  const result = validateDelimiterSequence(delimiters)

  expect(result.isOk()).toBe(true)
})

test('validateDelimiterSequence should reject sequence with level skipping', () => {
  const delimiters = [
    { type: 'SIBLING' as const, level: 0, position: 0 },
    { type: 'CHILD' as const, level: 2, position: 0 },
  ]

  const result = validateDelimiterSequence(delimiters)

  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.message).toContain('skip levels')
  }
})

test('validateDelimiterSequence should validate empty delimiter sequence', () => {
  const delimiters: any[] = []

  const result = validateDelimiterSequence(delimiters)

  expect(result.isOk()).toBe(true)
})

test('validateDelimiterSequence should validate single delimiter', () => {
  const delimiters = [{ type: 'SIBLING' as const, level: 0, position: 0 }]

  const result = validateDelimiterSequence(delimiters)

  expect(result.isOk()).toBe(true)
})

test('validateDelimiterSequence should validate sequence starting with child delimiter', () => {
  const delimiters = [{ type: 'CHILD' as const, level: 1, position: 0 }]

  const result = validateDelimiterSequence(delimiters)

  expect(result.isOk()).toBe(true)
})
