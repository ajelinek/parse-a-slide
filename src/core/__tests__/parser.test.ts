import { expect, test, vi } from 'vitest'
import { Fragment, Presentation } from '../../types/presentation'
import { parse } from '../parser/index'
import { Logger } from '../../utils/logger'
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

  // Define structure and navigation using a table (no delimiterLevel column)
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | S1 | null          | null         | null            | null        |
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

  // Define structure and navigation using a table (no delimiterLevel column)
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | S1 | null          | null         | null            | S2          |
    | S2 | null          | null         | S1              | S3          |
    | S3 | null          | null         | S2              | null        |
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

  // Define structure and navigation using a table (no delimiterLevel column)
  const structureTable = `
    | id   | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | ---- | ------------- | ------------ | --------------- | ----------- |
    | S1   | null          | S1C1         | null            | null        |
    | S1C1 | S1            | null         | null            | null        |
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
    --->>
    ${S1C1C1}
    ---
    ${S2}
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(4)

  // Define structure and navigation using a table (no delimiterLevel column)
  const structureTable = `
    | id       | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -------- | ------------- | ------------ | --------------- | ----------- |
    | S1       | null          | S1C1         | null            | S2          |
    | S1C1     | S1            | S1C1C1       | null            | S2          |
    | S1C1C1   | S1C1          | null         | null            | S2          |
    | S2       | null          | null         | S1              | null        |
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

  // Define structure and navigation using a table (no delimiterLevel column)
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | S1 | null          | null         | null            | S2          |
    | S2 | null          | null         | S1              | S3          |
    | S3 | null          | null         | S2              | null        |
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
    --->>
    ${S1C1C1}
    ---
    ${S2}
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(4)

  // Define structure and navigation using a table (no delimiterLevel column)
  const structureTable = `
    | id       | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -------- | ------------- | ------------ | --------------- | ----------- |
    | S1       | null          | S1C1         | null            | S2          |
    | S1C1     | S1            | S1C1C1       | null            | S2          |
    | S1C1C1   | S1C1          | null         | null            | S2          |
    | S2       | null          | null         | S1              | null        |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData({ S1, S1C1, S1C1C1, S2 }, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

// Error Path Tests
test('parse should return error when no entry fragment is specified', () => {
  // Create a presentation with fragments but no entry fragment (isEntry = false for all)
  const fragment1 = createFragment(
    '# Fragment 1',
    'fragment1',
    'fragment1.pres.md',
    false // Not an entry fragment
  )

  const fragment2 = createFragment(
    '# Fragment 2',
    'fragment2',
    'fragment2.pres.md',
    false // Not an entry fragment
  )

  const presentation = createPresentation([fragment1, fragment2])

  // Act
  const result = parse(presentation)

  // Assert
  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.code).toBe('NO_ENTRY_FRAGMENT')
    expect(result.error.message).toContain('No entry fragment found')
  }
})

test('parse should return error when attempting to skip a delimiter level', () => {
  // Arrange
  const { presentation } = setUp(`
    # Parent P1 (level 0)
    --->>
    # Child C1 (attempted level 2)
  `)

  // Act
  const result = parse(presentation)

  // Assert
  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.code).toBe('INVALID_DELIMITER_SEQUENCE')
    expect(result.error.message).toContain('Invalid nesting increase')
  }
})

test('parse should handle referenced fragment not found with warning', () => {
  // Mock Logger.getInstance().info to capture the warning message
  const loggerInfoSpy = vi.spyOn(Logger.getInstance(), 'info').mockImplementation(() => {})

  // Arrange
  const { presentation } = setUp(`
    # Slide 1
    ---
    [Link To Missing](./nonexistent.pres.md)
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Assert - Two slides are created: one for "# Slide 1" and one for the missing fragment reference
  expect(slideNodes).toHaveLength(2)
  expect(slideNodes[0].id).toBe('S1')
  expect(slideNodes[0].content).toContain('# Slide 1')
  expect(slideNodes[1].id).toBe('S2')
  expect(slideNodes[1].content).toContain('[Link To Missing](./nonexistent.pres.md)')

  // Verify logger.info was called with the correct message
  expect(loggerInfoSpy).toHaveBeenCalledWith('Fragment reference ./nonexistent.pres.md not found')

  // Cleanup
  loggerInfoSpy.mockRestore()
})

test('parse should return error for circular fragment reference', () => {
  // Create fragments that reference each other
  const fragA = createFragment(
    '[Link to B](./fragB.pres.md)',
    'fragA',
    'fragA.pres.md',
    true // Entry fragment
  )

  const fragB = createFragment('[Link to A](./fragA.pres.md)', 'fragB', 'fragB.pres.md', false)

  const presentation = createPresentation([fragA, fragB])

  // Act
  const result = parse(presentation)

  // Assert
  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.code).toBe('PARSER_CIRCULAR_REFERENCE')
    expect(result.error.message).toContain('Circular reference detected')
  }
})

test('parse should handle navigating correctly after "popping" up multiple nesting levels', () => {
  // Define raw slide content for input
  const S1 = `
    # L0-S1 (S1)
  `
  const S1C1 = `
    # L1-C1 (S1.C1)
  `
  const S1C1C1 = `
    # L2-C1 (S1.C1.C1)
  `
  const S2 = `
    # L0-S2 (S2)
  `
  const S2C1 = `
    # L1-C1 (S2.C1)
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
    --->
    ${S2C1}
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(5)

  // Define structure and navigation using a table (no delimiterLevel column)
  const structureTable = `
    | id       | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -------- | ------------- | ------------ | --------------- | ----------- |
    | S1       | null          | S1C1         | null            | S2          |
    | S1C1     | S1            | S1C1C1       | null            | S2          |
    | S1C1C1   | S1C1          | null         | null            | S2          |
    | S2       | null          | S2C1         | S1              | null        |
    | S2C1     | S2            | null         | null            | null        |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData({ S1, S1C1, S1C1C1, S2, S2C1 }, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle delimiters with surrounding whitespace correctly', () => {
  // Define raw slide content for input
  const S1 = `
    # S1
  `
  const S2 = `
    # S2
  `

  // Arrange - Note the whitespace around the delimiter
  const { presentation } = setUp(`
    ${S1}

       ---   

    ${S2}
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(2)

  // Define structure and navigation using a table (no delimiterLevel column)
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | S1 | null          | null         | null            | S2          |
    | S2 | null          | null         | S1              | null        |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData({ S1, S2 }, structureTable)

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})

test('parse should handle a presentation ending with a delimiter creating an empty slide', () => {
  // Define raw slide content for input
  const S1 = `
    # Slide 1
  `

  // Arrange - Note the presentation ends with a delimiter
  const { presentation } = setUp(`
    ${S1}
    ---
  `)

  // Act
  const result = parse(presentation)
  const slideNodes = assertSuccessResult(result)

  // Verify we have the expected number of slides
  expect(slideNodes).toHaveLength(2)

  // Define structure and navigation using a table (no delimiterLevel column)
  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | S1 | null          | null         | null            | S2          |
    | S2 | null          | null         | S1              | null        |
  `

  // Generate test data with content and expected structure
  const { expectedSlides } = createTestData(
    {
      S1,
      S2: '', // Empty content for S2
    },
    structureTable
  )

  // Assert that parser output matches our expectations
  assertSlideNodes(slideNodes, expectedSlides)
})