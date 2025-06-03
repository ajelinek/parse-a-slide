import { Result } from 'neverthrow'
import { expect, test } from 'vitest'
import { ContentMap, createSlidesFromTableAndContent, filterValidRows } from '../../test-utils/markdown-table-util'
import { Fragment, Presentation } from '../../types/presentation'
import { SlideNode } from '../../types/slide'
import { AppError, ErrorCode } from '../../utils/error'
import { parse } from '../parser'

/**
 * Setup function for parser tests
 * Creates necessary fragments and presentation objects
 */
function setUp(slideContent: string): {
  fragment: Fragment
  presentation: Presentation
} {
  // Process the content to remove indentation from template literals
  const processedContent = slideContent
    .trim()
    .split('\n')
    .map(line => line.trimStart())
    .join('\n')

  const fragment: Fragment = {
    id: 'fragment1',
    name: 'entry.pres.md',
    fullPath: '/path/to/entry.pres.md',
    relativePath: 'entry.pres.md',
    extension: '.md',
    isEntry: true,
    content: processedContent,
  }

  const presentation: Presentation = {
    metadata: {
      id: 'presentation1',
      url: '/presentation1',
      fullPath: '/path/to/presentation',
      name: 'presentation1',
      extension: '.md',
      entrySlideId: 'S1',
      fragmentMetaData: [fragment],
    },
    fragments: [fragment],
  }

  return {
    fragment,
    presentation,
  }
}

test('parse should handle a single slide from an entry fragment', () => {
  // Define raw slide content for input
  const S1 = `
    # Slide 1
    Content for Slide 1.
  `

  // Arrange
  const { presentation } = setUp(S1)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Create a content map with normalized content for expected output
  const contentMap: ContentMap = { S1 }

  // Define structure and navigation using a table (no content column)
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | -- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1 | null          | null         | null            | null        | 0              |
  `

  // Generate expected slides by combining structure with content
  const expectedSlides = createSlidesFromTableAndContent(structureTable, contentMap)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle multiple top-level sibling slides', () => {
  // Define raw slide content for input
  const S1 = `
    # Slide 1
  `
  const S2 = `
    # Slide 2
  `
  const S3 = `
    # Slide 3
  `

  // Arrange
  const { presentation } = setUp(`
    ${S1}
    ---
    ${S2}
    ---
    ${S3}
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Create a content map with normalized content for expected output
  const contentMap: ContentMap = { S1, S2, S3 }

  // Define structure and navigation using a table (no content column)
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | -- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1 | null          | null         | null            | S2          | 0              |
    | S2 | null          | null         | S1              | S3          | 0              |
    | S3 | null          | null         | S2              | null        | 0              |
  `

  // Generate expected slides by combining structure with content
  const expectedSlides = createSlidesFromTableAndContent(structureTable, contentMap)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle a parent slide with one child', () => {
  // Define raw slide content for input
  const S1 = `
    # Parent P1
  `
  const S1C1 = `
    # Child C1
  `

  // Arrange
  const { presentation } = setUp(`
    ${S1}
    --->
    ${S1C1}
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Create a content map with normalized content for expected output
  const contentMap: ContentMap = { S1, S1C1 }

  // Define structure and navigation using a table (no content column)
  const structureTable = `
    | id    | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | ----- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1    | null          | S1C1        | null            | null        | 0              |
    | S1C1  | S1            | null        | null            | null        | 1              |
  `

  // Generate expected slides by combining structure with content
  const expectedSlides = createSlidesFromTableAndContent(structureTable, contentMap)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle multi-level child slides', () => {
  // Define raw slide content for input
  const S1 = `
    # P1
  `
  const S1C1 = `
    # P1.C1
  `
  const S1C1C1 = `
    # P1.C1.C1
  `
  const S2 = `
    # P2
  `

  // Arrange
  const { presentation } = setUp(`
    ${S1}
    --->
    ${S1C1}
    -->>
    ${S1C1C1}
    ---
    ${S2}
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(4)

  // Create a content map with normalized content for expected output
  const contentMap: ContentMap = { S1, S1C1, S1C1C1, S2 }

  // Define structure and navigation using a table (no content column)
  const structureTable = `
    | id       | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | -------- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1       | null          | S1C1         | null            | S2          | 0              |
    | S1C1     | S1            | S1C1C1       | null            | S2          | 1              |
    | S1C1C1   | S1C1          | null         | null            | S2          | 2              |
    | S2       | null          | null         | S1              | null        | 0              |
  `

  // Generate expected slides by combining structure with content
  const expectedSlides = createSlidesFromTableAndContent(structureTable, contentMap)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle empty intermediate slide', () => {
  // Define raw slide content for input
  const S1 = `
    # Parent P1
  `
  const S2 = `
    # S2
  `

  // Arrange
  const { presentation } = setUp(`
    ${S1}
    ---
    ---  
    ${S2}
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(3)

  // Create a content map with normalized content for expected output
  const contentMap: ContentMap = { 
    S1,
    S2: "", // Empty slide
    S3: S2 // Our test's S2 content is actually S3 in the parser's output
  }

  // Define structure and navigation using a table (no content column)
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | -- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1 | null          | null         | null            | S2          | 0              |
    | S2 | null          | null         | S1              | S3          | 0              |
    | S3 | null          | null         | S2              | null        | 0              |
  `
  
  // Generate expected slides by combining structure with content
  const expectedSlides = createSlidesFromTableAndContent(structureTable, contentMap)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle last childs next slide linking to parents next slide', () => {
  // Define raw slide content for input
  const S1 = `
    # S1
  `
  const S1C1 = `
    # S1.C1
  `
  const S1C1C1 = `
    # S1.C1.C1
  `
  const S2 = `
    # S2
  `

  // Arrange
  const { presentation } = setUp(`
    ${S1}
    --->
    ${S1C1}
    -->>
    ${S1C1C1}
    ---
    ${S2}
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(4)

  // Create a content map with normalized content for expected output
  const contentMap: ContentMap = { S1, S1C1, S1C1C1, S2 }

  // Define structure and navigation using a table (no content column)
  const structureTable = `
    | id       | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | -------- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1       | null          | S1C1         | null            | S2          | 0              |
    | S1C1     | S1            | S1C1C1       | null            | S2          | 1              |
    | S1C1C1   | S1C1          | null         | null            | S2          | 2              |
    | S2       | null          | null         | S1              | null        | 0              |
  `

  // Generate expected slides by combining structure with content
  const expectedSlides = createSlidesFromTableAndContent(structureTable, contentMap)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

/**
 * Helper function to assert a successful result
 */
function assertSuccessResult<T>(result: Result<T, AppError>): T {
  expect(result.isOk()).toBe(true)
  return result._unsafeUnwrap()
}

/**
 * Helper function to assert an error result
 */
function assertErrorResult(result: Result<any, AppError>, code: ErrorCode, messageContains?: string) {
  expect(result.isErr()).toBe(true)
  const error = result._unsafeUnwrapErr()
  expect(error.code).toBe(code)
  if (messageContains) {
    expect(error.message).toContain(messageContains)
  }
}

/**
 * Normalizes content by trimming whitespace and ensuring consistent newlines
 */
function normalizeContent(content: string): string {
  return content.trim().replace(/\r\n/g, '\n')
}

/**
 * Simple assertion for slide nodes that checks existence by ID and content matching
 * with normalization for whitespace differences
 */
function assertSlideNodes(actual: SlideNode[], expected: Partial<SlideNode>[]) {
  // Filter out invalid nodes
  const validExpected = filterValidRows(expected)

  // For each expected node, find and verify the matching actual node
  validExpected.forEach(expectedNode => {
    // Find matching node by ID
    const matchingNode = actual.find(node => node.id === expectedNode.id)

    // Assert node exists
    expect(matchingNode, `No slide with ID ${expectedNode.id} was found`).toBeDefined()
    if (!matchingNode) return

    // Assert content matches after normalization
    if (expectedNode.content) {
      const normalizedActual = normalizeContent(matchingNode.content)
      const normalizedExpected = normalizeContent(expectedNode.content)
      expect(normalizedActual).toBe(normalizedExpected)
    }

    // Verify navigation properties as a complete object
    if (expectedNode.navigation) {
      expect(matchingNode.navigation).toEqual(expectedNode.navigation)
    }
  })
}
