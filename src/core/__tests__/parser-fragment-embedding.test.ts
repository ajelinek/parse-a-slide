import { expect, test } from 'vitest'
import { Fragment, Presentation } from '../../types/presentation'
import { parse } from '../parser'
import {
  assertSuccessResult,
  createFragment,
  createPresentation,
  createTestData,
  assertSlideNodes,
} from './parser-test.utils'

/**
 * Setup function specifically for fragment embedding tests
 * Creates a presentation with multiple fragments
 */
function setUp(fragments: {
  [key: string]: { content: string; isEntry?: boolean; relativePath: string; id?: string }
}): Presentation {
  // Create Fragment objects
  const fragmentObjects: Fragment[] = Object.entries(fragments).map(
    ([key, { content, isEntry = false, relativePath, id = key }]) => createFragment(content, id, relativePath, isEntry)
  )

  // Create and return the presentation
  return createPresentation(fragmentObjects)
}

test('parse should handle embedding a fragment as a sibling (reference on its own line)', () => {
  // Define raw slide content for input fragments
  // Note that the first and last slide have different IDs (S1 and S2) but come from the same entry fragment
  const slideContent = {
    S1: `
    # Entry Slide 1
    `,
    S1FS1: `
    # Included Slide A
    `,
    S1FS2: `
    # Included Slide B
    `,
    S2: `
    # Entry Slide 2
    `,
  }

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
    id: 'include-fragment',
  }

  // Arrange
  const presentation = setUp({
    fragment1: entryFragment,
    fragment2: includeFragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Define structure and navigation using a table
  const structureTable = `
    | id           | parentSlideId | childSlideId | previousSlideId | nextSlideId    | delimiterLevel |
    | ------------ | ------------- | ------------ | --------------- | -------------- | -------------- |
    | S1           | null          | null         | null            | S1FS1          | 0              |
    | S1FS1        | null          | null         | S1              | S1FS2          | 0              |
    | S1FS2        | null          | null         | S1FS1           | S2             | 0              |
    | S2           | null          | null         | S1FS2           | null           | 0              |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})
