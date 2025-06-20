import { expect, test } from 'vitest'
import { splitIntoRawSlides } from '../utils'
import { LINE_BREAK, REGEX_LINE_BREAK } from '../../const'

test('should handle content with no delimiters', () => {
  const s1 = trimIt(`
    # Slide 1
    Content for slide 1
    More content
  `)

  const content = buildContent(s1)
  const result = splitIntoRawSlides(content, false)

  expect(result).toHaveLength(1)
  expect(result).toEqual([{ content: s1, childLevel: 0, isFragment: false }])
})

test('should handle single delimiter creating one slide', () => {
  const c1 = trimIt(`
    # Slide 1
    Content for slide 1
  `)

  const content = buildContent(c1, '---', '')
  const result = splitIntoRawSlides(content)

  expect(result).toHaveLength(2)
  expect(result).toEqual([
    { content: c1, childLevel: 0, isFragment: false },
    { content: '', childLevel: 0, isFragment: false },
  ])
})

test('should handle multiple delimiters creating multiple slides', () => {
  const s1 = trimIt(`
    # Slide 1
    Content for slide 1
  `)
  const s2 = trimIt(`
    # Slide 2
    Content for slide 2
  `)
  const s3 = trimIt(`
    # Slide 3
    Content for slide 3
  `)
  const content = buildContent(s1, '---', s2, '---', s3)
  const result = splitIntoRawSlides(content)

  expect(result).toHaveLength(3)
  expect(result).toEqual([
    { content: s1, childLevel: 0, isFragment: false },
    { content: s2, childLevel: 0, isFragment: false },
    { content: s3, childLevel: 0, isFragment: false },
  ])
})

test('should handle nested delimiters with different levels', () => {
  const s1 = trimIt(`
    # Parent Slide s1
    Parent content s1
  `)
  const s2 = trimIt(`
    # Child Slide s2
    Child content
  `)
  const s3 = trimIt(`
    # Grandchild Slide s3
    Grandchild content
  `)
  const s4 = trimIt(`
    # Sibling Slide s4
    Sibling content
  `)
  const content = buildContent(s1, '---', s2, '--->', s3, '--->>', s4)
  const result = splitIntoRawSlides(content)
  console.log('🚀 ~ test ~ content:', content)
  console.log('🚀 ~ test ~ result:', result)

  expect(result).toHaveLength(4)
  expect(result).toEqual([
    { content: s1, childLevel: 0, isFragment: false },
    { content: s2, childLevel: 0, isFragment: false },
    { content: s3, childLevel: 1, isFragment: false },
    { content: s4, childLevel: 2, isFragment: false },
  ])
})

test('should handle empty content', () => {
  const content = ''
  const result = splitIntoRawSlides(content)
  expect(result).toEqual([{ content: '', childLevel: 0, isFragment: false }])
})

test('should handle content with only delimiters', () => {
  const content = '\n    ---\n    --->\n    ---\n'
  const result = splitIntoRawSlides(content)
  console.log('🚀 ~ test ~ result:', result)

  expect(result).toHaveLength(4)
  expect(result).toEqual([
    { content: '', childLevel: 0, isFragment: false },
    { content: '', childLevel: 0, isFragment: false },
    { content: '', childLevel: 1, isFragment: false },
    { content: '', childLevel: 0, isFragment: false },
  ])
})

test('should handle delimiters with whitespace', () => {
  const s1 = trimIt(`
    # Slide 1
    Content
  `)
  const content = buildContent(s1, '   ---   ')
  const result = splitIntoRawSlides(content)

  expect(result).toHaveLength(1)
  expect(result).toEqual([{ content: s1, childLevel: 0, isFragment: false }])
})

test('should handle consecutive delimiters creating empty slides', () => {
  const s1 = trimIt(`
    # Slide 1
  `)
  const content = buildContent(s1, '---', '---')
  const result = splitIntoRawSlides(content)

  expect(result).toHaveLength(2)
  expect(result).toEqual([
    { content: s1, childLevel: 0, isFragment: false },
    { content: '', childLevel: 0, isFragment: false },
  ])
})

test('should respect isFragment parameter when true', () => {
  const s1 = trimIt(`
    # Fragment Slide
    Fragment content
  `)
  const content = buildContent(s1, '---')
  const result = splitIntoRawSlides(content, true)

  expect(result).toHaveLength(1)
  expect(result).toEqual([{ content: s1, childLevel: 0, isFragment: true }])
})

test('should respect isFragment parameter when false', () => {
  const s1 = trimIt(`
    # Regular Slide
    Regular content
  `)
  const content = buildContent(s1, '---')
  const result = splitIntoRawSlides(content, false)

  expect(result).toHaveLength(1)
  expect(result).toEqual([{ content: s1, childLevel: 0, isFragment: false }])
})

test('splitIntoRawSlides should handle mixed delimiter levels correctly', () => {
  const s1 = trimIt(`
    # Level 0
    Content 0
  `)
  const s2 = trimIt(`
    # Level 1
    Content 1
  `)
  const s3 = trimIt(`
    # Back to Level 0
    Content back to 0
  `)
  const s4 = trimIt(`
    # Level 2
    Content 2
  `)
  const content = buildContent(s1, '--->', s2, '---', s3, '--->>', s4)
  const result = splitIntoRawSlides(content)

  expect(result).toHaveLength(4)
  expect(result).toEqual([
    { content: s1, childLevel: 0, isFragment: false },
    { content: s2, childLevel: 1, isFragment: false },
    { content: s3, childLevel: 0, isFragment: false },
    { content: s4, childLevel: 2, isFragment: false },
  ])
})

function trimIt(content: string): string {
  return content
    .split(REGEX_LINE_BREAK)
    .map(line => line.trim())
    .join(LINE_BREAK)
}

function buildContent(...lines: string[]) {
  return lines.join(LINE_BREAK)
}
