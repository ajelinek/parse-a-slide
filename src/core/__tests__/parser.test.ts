import { expect, test } from 'vitest'
import { Fragment, Presentation } from '../../types/presentation'
import { parse } from '../parser'
import {
  assertSlideNodes,
  assertSuccessResult,
  createFragment,
  createPresentation,
  createTestData,
} from './parser-test.utils'

/**
 * Setup function for standard parser tests
 * Creates a single fragment presentation with the given content
 */
function setUp(content: string): {
  fragment: Fragment
  presentation: Presentation
} {
  const fragment = createFragment(
    content,
    'fragment1',
    'entry.pres.md',
    true // isEntry
  )

  const presentation = createPresentation([fragment])

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

  // Define structure and navigation using a table (no content column)
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | -- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1 | null          | null         | null            | null        | 0              |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData({ S1 }, structureTable)

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

  // Define structure and navigation using a table
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | -- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1 | null          | null         | null            | S2          | 0              |
    | S2 | null          | null         | S1              | S3          | 0              |
    | S3 | null          | null         | S2              | null        | 0              |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData({ S1, S2, S3 }, structureTable)

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

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(2)

  // Define structure and navigation using a table
  const structureTable = `
    | id   | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | ---- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1   | null          | S1C1         | null            | null        | 0              |
    | S1C1 | S1            | null         | null            | null        | 1              |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData({ S1, S1C1 }, structureTable)

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

  // Define structure and navigation using a table
  const structureTable = `
    | id       | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | -------- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1       | null          | S1C1         | null            | S2          | 0              |
    | S1C1     | S1            | S1C1C1       | null            | S2          | 1              |
    | S1C1C1   | S1C1          | null         | null            | S2          | 2              |
    | S2       | null          | null         | S1              | null        | 0              |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData({ S1, S1C1, S1C1C1, S2 }, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle empty intermediate slide', () => {
  // Define raw slide content for input
  const S1 = `
    # Parent P1
  `
  const S3 = `
    # S3
  `

  // Arrange
  const { presentation } = setUp(`
    ${S1}
    ---
    ---  
    ${S3}
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(3)

  // Define structure and navigation using a table
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | -- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1 | null          | null         | null            | S2          | 0              |
    | S2 | null          | null         | S1              | S3          | 0              |
    | S3 | null          | null         | S2              | null        | 0              |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(
    {
      S1,
      S2: '', // Empty content for S2
      S3,
    },
    structureTable
  )

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

  // Define structure and navigation using a table
  const structureTable = `
    | id       | parentSlideId | childSlideId | previousSlideId | nextSlideId | delimiterLevel |
    | -------- | ------------- | ------------ | --------------- | ----------- | -------------- |
    | S1       | null          | S1C1         | null            | S2          | 0              |
    | S1C1     | S1            | S1C1C1       | null            | S2          | 1              |
    | S1C1C1   | S1C1          | null         | null            | S2          | 2              |
    | S2       | null          | null         | S1              | null        | 0              |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData({ S1, S1C1, S1C1C1, S2 }, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})
