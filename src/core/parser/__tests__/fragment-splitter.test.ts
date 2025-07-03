import { expect, test } from 'vitest'
import { splitIntoRawSlides } from '../fragment-splitter'
import { LINE_BREAK, REGEX_LINE_BREAK } from '../../const'
import { ErrorCode } from '../../../utils/error'

test('should handle content with no delimiters', () => {
  const path = 'slides/slide1.pres.md'
  const s1 = trimIt(`
    # Slide 1
    Content for slide 1
    More content
  `)

  const content = buildContent(s1)
  const result = splitIntoRawSlides(content, path, false)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toHaveLength(1)
    expect(result.value).toEqual([{ content: s1, childLevel: 0, isFragment: false, path }])
  }
})

test('should handle single delimiter creating one slide', () => {
  const path = 'slides/presentation.pres.md'
  const c1 = trimIt(`
    # Slide 1
    Content for slide 1
  `)

  const content = buildContent(c1, '---', '')
  const result = splitIntoRawSlides(content, path)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toHaveLength(2)
    expect(result.value).toEqual([
      { content: c1, childLevel: 0, isFragment: false, path },
      { content: '', childLevel: 0, isFragment: false, path },
    ])
  }
})

test('should handle multiple delimiters creating multiple slides', () => {
  const path = 'demos/multi-slide.pres.mdx'
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
  const result = splitIntoRawSlides(content, path)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toHaveLength(3)
    expect(result.value).toEqual([
      { content: s1, childLevel: 0, isFragment: false, path },
      { content: s2, childLevel: 0, isFragment: false, path },
      { content: s3, childLevel: 0, isFragment: false, path },
    ])
  }
})

test('should handle nested delimiters with different levels', () => {
  const path = 'slides/nested.pres.md'
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
  const result = splitIntoRawSlides(content, path)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toHaveLength(4)
    expect(result.value).toEqual([
      { content: s1, childLevel: 0, isFragment: false, path },
      { content: s2, childLevel: 0, isFragment: false, path },
      { content: s3, childLevel: 1, isFragment: false, path },
      { content: s4, childLevel: 2, isFragment: false, path },
    ])
  }
})

test('should handle empty content', () => {
  const path = 'slides/empty.pres.md'
  const content = ''
  const result = splitIntoRawSlides(content, path)
  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toEqual([{ content: '', childLevel: 0, isFragment: false, path }])
  }
})

test('should handle content with only delimiters', () => {
  const path = 'slides/delimiters-only.pres.md'
  const content = '\n    ---\n    --->\n    ---\n'
  const result = splitIntoRawSlides(content, path, false)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toHaveLength(4)
    expect(result.value).toEqual([
      { content: '', childLevel: 0, isFragment: false, path },
      { content: '', childLevel: 0, isFragment: false, path },
      { content: '', childLevel: 1, isFragment: false, path },
      { content: '', childLevel: 0, isFragment: false, path },
    ])
  }
})

test('should handle delimiters with whitespace', () => {
  const path = 'slides/delimiters-with-whitespace.pres.md'
  const s1 = trimIt(`
    # Slide 1
    Content
  `)
  const content = buildContent(s1, '   ---   ')
  const result = splitIntoRawSlides(content, path, false)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toHaveLength(2)
    expect(result.value).toEqual([
      { content: s1, childLevel: 0, isFragment: false, path },
      { content: '', childLevel: 0, isFragment: false, path },
    ])
  }
})

test('should handle consecutive delimiters creating empty slides', () => {
  const path = 'slides/consecutive-delimiters.pres.md'
  const s1 = trimIt(`
    # Slide 1
  `)
  const content = buildContent(s1, '---', '---')
  const result = splitIntoRawSlides(content, path, false)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toHaveLength(3)
    expect(result.value).toEqual([
      { content: s1, childLevel: 0, isFragment: false, path },
      { content: '', childLevel: 0, isFragment: false, path },
      { content: '', childLevel: 0, isFragment: false, path },
    ])
  }
})

test('should respect isFragment parameter when true', () => {
  const path = 'fragments/important-section.pres.md'
  const s1 = trimIt(`
    # Fragment Slide
    Fragment content
  `)
  const content = buildContent(s1, '---')
  const result = splitIntoRawSlides(content, path, true)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toHaveLength(2)
    expect(result.value).toEqual([
      { content: s1, childLevel: 0, isFragment: true, path },
      { content: '', childLevel: 0, isFragment: true, path },
    ])
  }
})

test('should respect isFragment parameter when false', () => {
  const path = 'slides/regular.pres.md'
  const s1 = trimIt(`
    # Regular Slide
    Regular content
  `)
  const content = buildContent(s1, '---')
  const result = splitIntoRawSlides(content, path, false)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toHaveLength(2)
    expect(result.value).toEqual([
      { content: s1, childLevel: 0, isFragment: false, path },
      { content: '', childLevel: 0, isFragment: false, path },
    ])
  }
})

test('splitIntoRawSlides should handle mixed delimiter levels correctly', () => {
  const path = 'slides/mixed-levels.pres.md'
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
  const content = buildContent(s1, '--->', s2, '---', s3, '--->', s4)
  const result = splitIntoRawSlides(content, path, false)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toHaveLength(4)
    expect(result.value).toEqual([
      { content: s1, childLevel: 0, isFragment: false, path },
      { content: s2, childLevel: 1, isFragment: false, path },
      { content: s3, childLevel: 0, isFragment: false, path },
      { content: s4, childLevel: 1, isFragment: false, path },
    ])
  }
})

test('splitIntoRawSlides should handle invalid delimiter sequence', () => {
  const path = 'slides/invalid.pres.md'
  const content = buildContent('---', '--->>>')
  const result = splitIntoRawSlides(content, path, false)
  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.code).toBe(ErrorCode.INVALID_DELIMITER_SEQUENCE)
  }
})

test('should handle a presentation ending with a delimiter creating an empty slide', () => {
  const path = 'slides/ending-with-delimiter.pres.md'
  const s1 = trimIt(`
    # Slide 1
  `)

  // Content ends with a delimiter - fragment-splitter automatically creates empty slide
  const content = buildContent(s1, '---')
  const result = splitIntoRawSlides(content, path, false)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toHaveLength(2)
    expect(result.value).toEqual([
      { content: s1, childLevel: 0, isFragment: false, path },
      { content: '', childLevel: 0, isFragment: false, path },
    ])
  }
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
