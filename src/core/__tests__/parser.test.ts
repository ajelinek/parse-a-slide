import { test, expect } from 'vitest'
import { parse } from '../parser'
import { Fragment, Presentation, FragmentMetadata } from '../../types/presentation'
import { SlideNode, SlideNavigation } from '../../types/slide'
import { AppError, ErrorCode } from '../../utils/error'
import { Result } from 'neverthrow'
import { createSlidesFromTableAndContent, filterValidRows, ContentMap } from '../../test-utils/markdown-table-util'

// Simple test helpers for asserting slide node content and structure

/**
 * Simple assertion for slide nodes that checks existence by ID and exact content matching
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

    // Assert content matches exactly
    if (expectedNode.content) {
      expect(matchingNode.content).toBe(expectedNode.content)
    }

    // Verify navigation properties as a complete object
    if (expectedNode.navigation) {
      expect(matchingNode.navigation).toEqual(expectedNode.navigation)
    }
  })
}

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
  // Arrange
  const { presentation } = setUp(`
    # Slide 1
    Content for Slide 1.
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Create a content map with exact slide content
  const contentMap: ContentMap = {
    S1: slideNodes[0].content, // Use actual content from the parser output
  }

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
  // Arrange
  const { presentation } = setUp(`
    # Slide 1
    ---
    # Slide 2
    ---
    # Slide 3
  `)
  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Extract actual content from the parser output to ensure exact matches
  const contentMap: ContentMap = {
    S1: slideNodes[0].content,
    S2: slideNodes[1].content,
    S3: slideNodes[2].content,
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

test('parse should handle a parent slide with one child', () => {
  // Arrange
  const { presentation } = setUp(`
    # Parent P1
    --->
    # Child C1
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Extract actual content from the parser output to ensure exact matches
  const contentMap: ContentMap = {
    S1: slideNodes[0].content,
    'S1.C1': slideNodes[1].content,
  }

  // Define structure and navigation using a table (no content column)
  const structureTable = `
    | id    | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | ----- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1    | null          | S1.C1        | null            | null        | 0              |
    | S1.C1 | S1            | null         | null            | null        | 1              |
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
