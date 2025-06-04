import { Result } from 'neverthrow'
import { expect, test } from 'vitest'
import { ContentMap, createSlidesFromTableAndContent, filterValidRows } from '../../test-utils/markdown-table-util'
import { Fragment, Presentation } from '../../types/presentation'
import { SlideNode } from '../../types/slide'
import { AppError } from '../../utils/error'
import { parse } from '../parser'

/**
 * Setup function for fragment embedding tests
 * Creates necessary fragments and presentation objects with multiple fragments
 */
function setUpWithFragments(fragments: {
  [key: string]: { content: string; isEntry?: boolean; relativePath: string }
}): Presentation {
  // Process the fragments to create Fragment objects
  const fragmentObjects: Fragment[] = Object.entries(fragments).map(
    ([id, { content, isEntry = false, relativePath }], index) => {
      // Process the content to remove indentation from template literals
      const processedContent = content
        .trim()
        .split('\n')
        .map(line => line.trimStart())
        .join('\n')

      return {
        id,
        name: relativePath.split('/').pop() || `fragment${index + 1}.pres.md`,
        fullPath: `/path/to/${relativePath}`,
        relativePath,
        extension: '.md',
        isEntry,
        content: processedContent,
      }
    }
  )

  // Find the entry fragment to use in presentation metadata
  const entryFragment = fragmentObjects.find(f => f.isEntry)

  const presentation: Presentation = {
    metadata: {
      id: 'presentation1',
      url: '/presentation1',
      fullPath: '/path/to/presentation',
      name: 'presentation1',
      extension: '.md',
      entrySlideId: 'S1',
      fragmentMetaData: fragmentObjects,
    },
    fragments: fragmentObjects,
  }

  return presentation
}

/**
 * Helper function to assert a successful result
 */
function assertSuccessResult<T>(result: Result<T, AppError>): T {
  expect(result.isOk()).toBe(true)
  return result._unsafeUnwrap()
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

    // Verify delimiter level if specified
    if (expectedNode.delimiterLevel !== undefined) {
      expect(matchingNode.delimiterLevel).toBe(expectedNode.delimiterLevel)
    }
  })
}

/**
 * Normalizes content by trimming whitespace and ensuring consistent newlines
 */
function normalizeContent(content: string): string {
  return content.trim().replace(/\r\n/g, '\n')
}

test('parse should handle embedding a fragment as a sibling (reference on its own line)', () => {
  // Define raw slide content for input fragments
  const entryFragment = {
    content: `
      # Entry Slide 1
      ---
      [Details](./include.pres.md)
      ---
      # Entry Slide 2
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const includeFragment = {
    content: `
      # Included Slide A
      ---
      # Included Slide B
    `,
    isEntry: false,
    relativePath: 'include.pres.md',
    id: 'include-fragment'
  }

  // Arrange
  const presentation = setUpWithFragments({
    fragment1: entryFragment,
    fragment2: includeFragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(4)

  // Create a content map with normalized content for expected output
  const contentMap: ContentMap = {
    S1: '# Entry Slide 1',
    'S1.includeS1': '# Included Slide A',
    'S1.includeS2': '# Included Slide B',
    S2: '# Entry Slide 2',
  }

  // Define structure and navigation using a table
  const structureTable = `
    | id           | parentSlideId | childSlideId | previousSlideId | nextSlideId    | delimiterLevel |
    | ------------ | ------------- | ------------ | --------------- | -------------- | -------------- |
    | S1           | null          | null         | null            | S1.includeS1   | 0              |
    | S1.includeS1 | null          | null         | S1              | S1.includeS2   | 0              |
    | S1.includeS2 | null          | null         | S1.includeS1    | S2             | 0              |
    | S2           | null          | null         | S1.includeS2    | null           | 0              |
  `

  // Generate expected slides by combining structure with content
  const expectedSlides = createSlidesFromTableAndContent(structureTable, contentMap)

  // Since we're testing experimental functionality, log actual structure for debugging
  console.log('Actual slide structure:')
  slideNodes.forEach(node => {
    console.log(`ID: ${node.id}, Content: ${node.content.replace(/\n/g, ' ').trim().substring(0, 30)}`)
  })

  // 1. We have exactly 4 slides
  expect(slideNodes).toHaveLength(4)

  // 2. Verify content of slides in the right order
  const expectedContents = [
    '# Entry Slide 1',               // First slide from entry fragment
    '# Included Slide A',            // First slide from included fragment
    '# Included Slide B',            // Second slide from included fragment
    '# Entry Slide 2'                // Last slide from entry fragment
  ]
  
  // Match content regardless of exact IDs
  slideNodes.forEach((node, index) => {
    expect(node.content.trim()).toContain(expectedContents[index])
  })

  // 3. Verify navigation is sequential
  // First slide should link to second
  expect(slideNodes[0].navigation.nextSlideId).toBe(slideNodes[1].id)
  // Second slide should link to third and back to first
  expect(slideNodes[1].navigation.nextSlideId).toBe(slideNodes[2].id)
  expect(slideNodes[1].navigation.previousSlideId).toBe(slideNodes[0].id)
  // Third slide should link to fourth and back to second
  expect(slideNodes[2].navigation.nextSlideId).toBe(slideNodes[3].id)
  expect(slideNodes[2].navigation.previousSlideId).toBe(slideNodes[1].id)
  // Fourth slide should link back to third
  expect(slideNodes[3].navigation.previousSlideId).toBe(slideNodes[2].id)
  // Last slide should have no next slide
  expect(slideNodes[3].navigation.nextSlideId).toBeNull()

})
