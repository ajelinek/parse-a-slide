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
    | S2           | null          | null         | S1              | null           | 0              |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle embedding a fragment as a child', () => {
  // Define raw slide content for input fragments
  const slideContent = {
    S1: `
    # Parent Slide P1
    `,
    'S1.C1': `
    # Child Content C1
    `,
    'S1.C2': `
    # Child Content C2
    `,
    S2: `
    # Sibling Slide S2
    `,
  }

  const entryFragment = {
    content: `
      # Parent Slide P1
      --->
      [Go To Child](./child.pres.md)
      ---
      # Sibling Slide S2
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const childFragment = {
    content: `
      # Child Content C1
      ---
      # Child Content C2
    `,
    isEntry: false,
    relativePath: 'child.pres.md',
    id: 'child-fragment',
  }

  // Arrange
  const presentation = setUp({
    fragment1: entryFragment,
    fragment2: childFragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Define structure and navigation using a table
  const structureTable = `
    | id     | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | ------ | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1     | null          | S1.C1        | null            | S2          | 0              |
    | S1.C1  | S1            | null         | null            | S1.C2       | 1              |
    | S1.C2  | S1            | null         | S1.C1           | S2          | 1              |
    | S2     | null          | null         | S1              | null        | 0              |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should ignore fragment reference not on its own line', () => {
  // Define raw slide content for input
  const slideContent = {
    S1: `
    # Slide 1
    Some text [Details](./ignored.pres.md) and more text.
    `,
  }

  const entryFragment = {
    content: `
      # Slide 1
      Some text [Details](./ignored.pres.md) and more text.
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  // Note: We create an ignored fragment to ensure it's not processed
  const ignoredFragment = {
    content: `
      # This should not be processed
    `,
    isEntry: false,
    relativePath: 'ignored.pres.md',
    id: 'ignored-fragment',
  }

  // Arrange
  const presentation = setUp({
    fragment1: entryFragment,
    fragment2: ignoredFragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have only 1 slide (the ignored fragment should not be processed)
  expect(slideNodes).toHaveLength(1)

  // Define structure and navigation using a table
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | -- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1 | null          | null         | null            | null        | 0              |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)

  // Additionally verify that the content contains the full line with fragment reference
  expect(slideNodes[0].content).toContain('Some text [Details](./ignored.pres.md) and more text.')
})
