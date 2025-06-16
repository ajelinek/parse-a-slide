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
 * Setup function for comprehensive parser tests
 * Creates a presentation with multiple complex fragments
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

test.skip('parse should handle comprehensive nested fragment embedding with complex hierarchies', () => {
  // Define raw slide content for each individual slide
  const S1 = `
    # Main Title
  `
  const S2 = `
    # Introduction
  `
  const S2C1 = `
    # Intro Child 1
  `
  const S2C1C1 = `
    # Intro Grandchild
  `
  const S3 = `
    # Overview
  `
  const S3FS1 = `
    # Section 1 Title
  `
  const S3FS2 = `
    # Section 1 Content A
  `
  const S3FS2C1FS1 = `
    # Subsection Main
  `
  const S3FS2C1FS2 = `
    # Subsection Detail 1
  `
  const S3FS2C1FS2C1 = `
    # Subsection Child 1
  `
  const S3FS2C1FS3 = `
    # Subsection Detail 2
  `
  const S3FS3 = `
    # Section 1 Content B
  `
  const S3FS3C1 = `
    # Section 1 Child B1
  `
  const S3FS3C1C1 = `
    # Section 1 Grandchild B1
  `
  const S3FS3C2 = `
    # Section 1 Child B2
  `
  const S4 = `
    # Transition
  `
  const S4FS1 = `
    # Section 2 Title
  `
  const S4FS1C1 = `
    # Section 2 Child A
  `
  const S4FS1C1C1 = `
    # Section 2 Grandchild A
  `
  const S4FS1C1C1FS1 = `
    # Detail A
  `
  const S4FS1C1C1FS2 = `
    # Detail B
  `
  const S4FS1C1C1FS2C1 = `
    # Detail B Child
  `
  const S4FS1C2 = `
    # Section 2 Child B
  `
  const S4FS2 = `
    # Section 2 Sibling
  `
  const S5 = `
    # Conclusion
  `

  // Define all fragments using the individual slide content
  const entryFragment = {
    content: `
      ${S1}
      ---
      ${S2}
      --->
      ${S2C1}
      -->>
      ${S2C1C1}
      ---
      ${S3}
      [Section 1](./section1.pres.md)
      ---
      ${S4}
      [Section 2](./section2.pres.md)
      ---
      ${S5}
    `,
    isEntry: true,
    relativePath: 'entry.pres.md',
    id: 'entry-fragment',
  }

  const section1Fragment = {
    content: `
      ${S3FS1}
      ---
      ${S3FS2}
      --->
      [Subsection Details](./subsection.pres.md)
      ---
      ${S3FS3}
      --->
      ${S3FS3C1}
      -->>
      ${S3FS3C1C1}
      ---
      ${S3FS3C2}
    `,
    isEntry: false,
    relativePath: 'section1.pres.md',
    id: 'section1-fragment',
  }

  const section2Fragment = {
    content: `
      ${S4FS1}
      --->
      ${S4FS1C1}
      -->>
      ${S4FS1C1C1}
      [Details](./details.pres.md)
      ---
      ${S4FS1C2}
      ---
      ${S4FS2}
    `,
    isEntry: false,
    relativePath: 'section2.pres.md',
    id: 'section2-fragment',
  }

  const subsectionFragment = {
    content: `
      ${S3FS2C1FS1}
      ---
      ${S3FS2C1FS2}
      --->
      ${S3FS2C1FS2C1}
      ---
      ${S3FS2C1FS3}
    `,
    isEntry: false,
    relativePath: 'subsection.pres.md',
    id: 'subsection-fragment',
  }

  const detailsFragment = {
    content: `
      ${S4FS1C1C1FS1}
      ---
      ${S4FS1C1C1FS2}
      --->
      ${S4FS1C1C1FS2C1}
    `,
    isEntry: false,
    relativePath: 'details.pres.md',
    id: 'details-fragment',
  }

  // Arrange
  const presentation = setUp({
    entry: entryFragment,
    section1: section1Fragment,
    section2: section2Fragment,
    subsection: subsectionFragment,
    details: detailsFragment,
  })

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides (including the empty slide from section1Fragment's --->)
  expect(slideNodes).toHaveLength(26)

  // Define the comprehensive structure and navigation using a table
  const structureTable = `
    | id                        | parentSlideId             | childSlideId              | previousSlideId           | nextSlideId               | delimiterLevel |
    | ------------------------- | ------------------------- | ------------------------- | ------------------------- | ------------------------- | -------------- |
    | S1                        | null                      | null                      | null                      | S2                        | 0              |
    | S2                        | null                      | S2C1                      | S1                        | S3                        | 0              |
    | S2C1                      | S2                        | S2C1C1                    | null                      | S3                        | 1              |
    | S2C1C1                    | S2C1                      | null                      | null                      | S3                        | 2              |
    | S3                        | null                      | null                      | S2                        | S3FS1                     | 0              |
    | S3FS1                     | null                      | null                      | S3                        | S3FS2                     | 0              |
    | S3FS2                     | null                      | S3FS2C1                   | S3FS1                     | S3FS3                     | 0              |
    | S3FS2C1                   | S3FS2                     | null                      | null                      | S3FS2C1FS1                | 1              |
    | S3FS2C1FS1                | null                      | null                      | S3FS2C1                   | S3FS2C1FS2                | 0              |
    | S3FS2C1FS2                | null                      | S3FS2C1FS2C1              | S3FS2C1FS1                | S3FS2C1FS3                | 0              |
    | S3FS2C1FS2C1              | S3FS2C1FS2                | null                      | null                      | S3FS2C1FS3                | 1              |
    | S3FS2C1FS3                | null                      | null                      | S3FS2C1FS2                | S3FS3                     | 0              |
    | S3FS3                     | null                      | S3FS3C1                   | S3FS2                     | S4                        | 0              |
    | S3FS3C1                   | S3FS3                     | S3FS3C1C1                 | null                      | S3FS3C2                   | 1              |
    | S3FS3C1C1                 | S3FS3C1                   | null                      | null                      | S3FS3C2                   | 2              |
    | S3FS3C2                   | S3FS3                     | null                      | S3FS3C1                   | S4                        | 1              |
    | S4                        | null                      | null                      | S3FS3                     | S4FS1                     | 0              |
    | S4FS1                     | null                      | S4FS1C1                   | S4                        | S4FS2                     | 0              |
    | S4FS1C1                   | S4FS1                     | S4FS1C1C1                 | null                      | S4FS1C2                   | 1              |
    | S4FS1C1C1                 | S4FS1C1                   | null                      | null                      | S4FS1C1C1FS1              | 2              |
    | S4FS1C1C1FS1              | null                      | null                      | S4FS1C1C1                 | S4FS1C1C1FS2              | 0              |
    | S4FS1C1C1FS2              | null                      | S4FS1C1C1FS2C1            | S4FS1C1C1FS1              | null                      | 0              |
    | S4FS1C1C1FS2C1            | S4FS1C1C1FS2              | null                      | null                      | S4FS1C2                   | 1              |
    | S4FS1C2                   | S4FS1                     | null                      | S4FS1C1                   | S4FS2                     | 1              |
    | S4FS2                     | null                      | null                      | S4FS1                     | S5                        | 0              |
    | S5                        | null                      | null                      | S4FS2                     | null                      | 0              |
  `

  // Create slideContent object with all slides including empty slide
  const slideContent = {
    S1,
    S2,
    S2C1,
    S2C1C1,
    S3,
    S3FS1,
    S3FS2,
    S3FS2C1: '', // Empty child from section1Fragment's --->
    S3FS2C1FS1,
    S3FS2C1FS2,
    S3FS2C1FS2C1,
    S3FS2C1FS3,
    S3FS3,
    S3FS3C1,
    S3FS3C1C1,
    S3FS3C2,
    S4,
    S4FS1,
    S4FS1C1,
    S4FS1C1C1,
    S4FS1C1C1FS1,
    S4FS1C1C1FS2,
    S4FS1C1C1FS2C1,
    S4FS1C2,
    S4FS2,
    S5,
  }

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(slideContent, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})
