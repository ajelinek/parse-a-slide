import { expect, test } from 'vitest'
import { Fragment, Presentation } from '../../types/presentation'
import { parse } from '../parser/index'
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
  // Define raw slide content for each individual slide
  const S1 = `
    # Entry Slide 1
  `
  const S2 = `
    # Included Slide A
  `
  const S3 = `
    # Included Slide B
  `
  const S4 = `
    # Entry Slide 2
  `

  const entryFragment = {
    content: `
      ${S1}
      ---
      [Details](./include.pres.md)
      ---
      ${S4}
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const includeFragment = {
    content: `
      ${S2}
      ---
      ${S3}
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
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | S1 | null          | null         | null            | S2          |
    | S2 | null          | null         | S1              | S3          |
    | S3 | null          | null         | S2              | S4          |
    | S4 | null          | null         | S3              | null        |
  `

  // Create slideContent object with all slides
  const slideContent = { S1, S2, S3, S4 }

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle embedding a fragment as a child', () => {
  // Define raw slide content for each individual slide
  const S1 = `
    # Parent Slide P1
  `
  const S2 = `
    # Child Content C1
  `
  const S3 = `
    # Child Content C2
  `
  const S4 = `
    # Sibling Slide S2
  `

  const entryFragment = {
    content: `
      ${S1}
      --->
      [Go To Child](./child.pres.md)
      ---
      ${S4}
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const childFragment = {
    content: `
      ${S2}
      ---
      ${S3}
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
  // The ---> delimiter before the fragment reference means the embedded content should be at child level
  const structureTable = `
    | id   | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | ---- | ------------- | ------------ | --------------- | ----------- |
    | S1   | null          | S1C1         | null            | S2          |
    | S1C1 | S1            | null         | null            | S1C2        |
    | S1C2 | S1            | null         | S1C1            | S2          |
    | S2   | null          | null         | S1              | null        |
  `

  // Create slideContent object with all slides
  // S1C1 and S1C2 represent the embedded fragment content as children of S1
  const slideContent = {
    S1,
    S1C1: S2, // Child Content C1 becomes S1C1
    S1C2: S3, // Child Content C2 becomes S1C2
    S4,
  }

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should ignore fragment reference not on its own line', () => {
  // Define raw slide content for each individual slide
  const S1 = `
    # Slide 1
    Some text [Details](./ignored.pres.md) and more text.
  `

  const entryFragment = {
    content: `
      ${S1}
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
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | S1 | null          | null         | null            | null        |
  `

  // Create slideContent object with all slides
  const slideContent = { S1 }

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)

  // Additionally verify that the content contains the full line with fragment reference
  expect(slideNodes[0].content).toContain('Some text [Details](./ignored.pres.md) and more text.')
})

test('parse should handle embedding an empty fragment', () => {
  // Define raw slide content for each individual slide
  const S1 = `
    # Slide 1
  `
  const S2 = `
    # Slide 2
  `

  const entryFragment = {
    content: `
      ${S1}
      ---
      [link](./empty.pres.md)
      ---
      ${S2}
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const emptyFragment = {
    content: '',
    isEntry: false,
    relativePath: 'empty.pres.md',
    id: 'empty-fragment',
  }

  // Arrange
  const presentation = setUp({
    fragment1: entryFragment,
    fragment2: emptyFragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides (empty fragment creates a slide for the reference)
  expect(slideNodes).toHaveLength(3)

  // Define structure and navigation using a table
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | S1 | null          | null         | null            | S2          |
    | S2 | null          | null         | S1              | S3          |
    | S3 | null          | null         | S2              | null        |
  `

  // Create slideContent object with all slides
  const slideContent = {
    S1,
    S2: '[link](./empty.pres.md)', // The fragment reference becomes the content
    S3: S2,
  }

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle embedding a fragment that only contains delimiters', () => {
  // Define raw slide content for each individual slide
  const S1 = `
    # Parent
  `

  const entryFragment = {
    content: `
      ${S1}
      --->
      [link](./delimiters.pres.md)
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const delimitersFragment = {
    content: `
      ---
      ---
    `,
    isEntry: false,
    relativePath: 'delimiters.pres.md',
    id: 'delimiters-fragment',
  }

  // Arrange
  const presentation = setUp({
    fragment1: entryFragment,
    fragment2: delimitersFragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(4)

  // Define structure and navigation using a table
  const structureTable = `
    | id   | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | ---- | ------------- | ------------ | --------------- | ----------- |
    | S1   | null          | S1C1         | null            | null        |
    | S1C1 | S1            | null         | null            | S1C2        |
    | S1C2 | S1            | null         | S1C1            | S1C3        |
    | S1C3 | S1            | null         | S1C2            | null        |
  `

  // Create slideContent object with all slides
  const slideContent = {
    S1,
    S2: '', // Empty slide from child delimiter
    S3: '', // Empty slide from first delimiter in fragment
    S4: '', // Empty slide from second delimiter in fragment
  }

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle a deeply nested fragment correctly inheriting its base nesting level', () => {
  // Define raw slide content for each individual slide
  const S1 = `
    # P1
  `
  const S2 = `
    # C1
  `
  const S3 = `
    # C1.C1
  `

  const entryFragment = {
    content: `
      ${S1}
      --->
      ${S2}
      -->>
      [embed](./embed.pres.md)
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const embedFragment = {
    content: `
      ${S3}
    `,
    isEntry: false,
    relativePath: 'embed.pres.md',
    id: 'embed-fragment',
  }

  // Arrange
  const presentation = setUp({
    fragment1: entryFragment,
    fragment2: embedFragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(2)

  // Define structure and navigation using a table
  const structureTable = `
    | id   | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | ---- | ------------- | ------------ | --------------- | ----------- |
    | S1   | null          | S1C1         | null            | null        |
    | S1C1 | S1            | null         | null            | null        |
  `

  // Create slideContent object with all slides
  const slideContent = {
    S1,
    S1C1: `# C1

-->>
[embed](./embed.pres.md)`, // Match the exact format with newlines
  }

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle a deeply nested fragment with sibling navigation correctly', () => {
  // Define raw slide content for each individual slide
  const S1 = `
    # S1
  `
  const S1C1 = `
    # S1C1
  `
  const S1C1C1 = `
    # S1C1C1
  `
  const S2 = `
    # S2
  `

  const entryFragment = {
    content: `
      ${S1}
      --->
      ${S1C1}
      --->>
      [embed](./embed.pres.md)
      ---
      ${S2}
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const embedFragment = {
    content: `
      ${S1C1C1}
    `,
    isEntry: false,
    relativePath: 'embed.pres.md',
    id: 'embed-fragment',
  }

  // Arrange
  const presentation = setUp({
    fragment1: entryFragment,
    fragment2: embedFragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(4)

  // Define structure and navigation using a table
  const structureTable = `
    | id    | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | ----- | ------------- | ------------ | --------------- | ----------- |
    | S1    | null          | S1C1         | null            | S2          |
    | S1C1  | S1            | S1C1C1       | null            | S2          |
    | S1C1C1| S1C1          | null         | null            | S2          |
    | S2    | null          | null         | S1              | null        |
  `

  // Create slideContent object with all slides
  const slideContent = {
    S1,
    S1C1,
    S1C1C1,
    S2,
  }

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})
