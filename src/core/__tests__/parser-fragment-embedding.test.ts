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
    | S1C2 | S1            | null         | S1C1            | null        |
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
    | S1C1  | S1            | S1C1C1       | null            | null        |
    | S1C1C1| S1C1          | null         | null            | null        |
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

test('parse should handle multiple nested fragments with recursive embedding', () => {
  // Define raw slide content for each individual slide
  const S1 = `
    # Main Entry
  `
  const S2 = `
    # Section 1 Start
  `
  const S3 = `
    # Subsection Content A
  `
  const S4 = `
    # Subsection Content B
  `
  const S5 = `
    # Section 1 End
  `
  const S6 = `
    # Final Slide
  `

  const entryFragment = {
    content: `
      ${S1}
      ---
      [Section 1](./section1.pres.md)
      ---
      ${S6}
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const section1Fragment = {
    content: `
      ${S2}
      ---
      [Subsection](./subsection.pres.md)
      ---
      ${S5}
    `,
    isEntry: false,
    relativePath: 'section1.pres.md',
    id: 'section1-fragment',
  }

  const subsectionFragment = {
    content: `
      ${S3}
      ---
      ${S4}
    `,
    isEntry: false,
    relativePath: 'subsection.pres.md',
    id: 'subsection-fragment',
  }

  // Arrange
  const presentation = setUp({
    fragment1: entryFragment,
    fragment2: section1Fragment,
    fragment3: subsectionFragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // If recursive embedding works, we should have 6 slides total
  // If it doesn't work, we might have fewer slides with unprocessed fragment references
  expect(slideNodes).toHaveLength(6)

  // Define structure and navigation using a table
  // This represents the expected structure if recursive embedding works correctly
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | S1 | null          | null         | null            | S2          |
    | S2 | null          | null         | S1              | S3          |
    | S3 | null          | null         | S2              | S4          |
    | S4 | null          | null         | S3              | S5          |
    | S5 | null          | null         | S4              | S6          |
    | S6 | null          | null         | S5              | null        |
  `

  // Create slideContent object with all slides
  const slideContent = { S1, S2, S3, S4, S5, S6 }

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle minimal recursive fragment embedding correctly', () => {
  // Define minimal slide content
  const S1 = `
    # Entry
  `
  const S2 = `
    # Level 2
  `

  const entryFragment = {
    content: `
      ${S1}
      ---
      [Level 1](./level1.pres.md)
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const level1Fragment = {
    content: `
      [Level 2](./level2.pres.md)
    `,
    isEntry: false,
    relativePath: 'level1.pres.md',
    id: 'level1-fragment',
  }

  const level2Fragment = {
    content: `
      ${S2}
    `,
    isEntry: false,
    relativePath: 'level2.pres.md',
    id: 'level2-fragment',
  }

  // Arrange
  const presentation = setUp({
    fragment1: entryFragment,
    fragment2: level1Fragment,
    fragment3: level2Fragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Recursive embedding works in this simple case: Entry → Level1 → Level2
  expect(slideNodes).toHaveLength(2)

  // Verify content is properly processed recursively
  expect(slideNodes[0].content.trim()).toBe('# Entry')
  expect(slideNodes[1].content.trim()).toBe('# Level 2')
})

test('parse should demonstrate the actual issue with hierarchical structure and fragment references', () => {
  // This test reproduces the pattern that breaks in the comprehensive test
  const S1 = `
    # Section Start
  `
  const S2 = `
    # Sub Content
  `
  const S3 = `
    # Embedded Detail
  `

  const entryFragment = {
    content: `
      ${S1}
      ---
      ${S2}
      --->
      [Details](./details.pres.md)
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const detailsFragment = {
    content: `
      ${S3}
    `,
    isEntry: false,
    relativePath: 'details.pres.md',
    id: 'details-fragment',
  }

  // Arrange
  const presentation = setUp({
    fragment1: entryFragment,
    fragment2: detailsFragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify hierarchical structure with fragment embedding works correctly
  expect(slideNodes).toHaveLength(3)
  expect(slideNodes[0].content.trim()).toBe('# Section Start')
  expect(slideNodes[1].content.trim()).toBe('# Sub Content')
  expect(slideNodes[2].content.trim()).toBe('# Embedded Detail')
})

test('parse should correctly handle fragment references only when on their own line (expected behavior)', () => {
  // This test demonstrates the correct behavior: fragment references are only processed
  // when they appear on their own line within their own section
  const S1 = `
    # Main Title
  `
  const S2 = `
    # Introduction
  `
  const S3 = `
    # Overview
  `
  const S4 = `
    # Section 1 Title
  `
  const S5 = `
    # Section 1 Content
  `

  const entryFragment = {
    content: `
      ${S1}
      ---
      ${S2}
      ---
      ${S3}
      [Section 1](./section1.pres.md)
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const section1Fragment = {
    content: `
      ${S4}
      ---
      ${S5}
    `,
    isEntry: false,
    relativePath: 'section1.pres.md',
    id: 'section1-fragment',
  }

  // Arrange
  const presentation = setUp({
    fragment1: entryFragment,
    fragment2: section1Fragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Correct behavior: Only 3 slides because fragment reference is mixed with content
  // Fragment references are only processed when on their own line within their own section
  expect(slideNodes).toHaveLength(3)

  // The fragment reference correctly remains as literal text since it's not on its own line
  expect(slideNodes[2].content.trim()).toContain('[Section 1](./section1.pres.md)')
  expect(slideNodes[2].content.trim()).toContain('# Overview')

  // This is the expected behavior - fragment references mixed with content are treated as literal text
})
