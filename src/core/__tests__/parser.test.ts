import { test, expect } from 'vitest'
import { parse } from '../parser'
import { Fragment, Presentation, FragmentMetadata } from '../../types/presentation'
import { SlideNode } from '../../types/slide'
import { AppError, ErrorCode } from '../../utils/error'
import { Result } from 'neverthrow'

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

  // Assert
  const slideNodes = assertSuccessResult(result)
  expect(slideNodes).toHaveLength(1)

  // Check slide content
  const slideNode = slideNodes[0]
  expect(slideNode.content).toBe('# Slide 1\nContent for Slide 1.')

  // Define expected navigation
  const expectedNavigation: ExpectedNavigation = { id: 'S1', parentSlideId: null, childSlideId: null, previousSlideId: null, nextSlideId: null }

  // Assert navigation
  assertNavigation(slideNode, expectedNavigation)
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

  // Assert
  const slideNodes = assertSuccessResult(result)
  expect(slideNodes).toHaveLength(3)

  // Define expected navigation for all slides
  const expectedNavigations: ExpectedNavigation[] = [
    { id: 'S1', parentSlideId: null, childSlideId: null, previousSlideId: null, nextSlideId: 'S2' },
    { id: 'S2', parentSlideId: null, childSlideId: null, previousSlideId: 'S1', nextSlideId: 'S3' },
    { id: 'S3', parentSlideId: null, childSlideId: null, previousSlideId: 'S2', nextSlideId: null },
  ]

  // Assert navigation for each slide
  expectedNavigations.forEach((expected, index) => {
    assertNavigation(slideNodes[index], expected)
  })
})

interface ExpectedNavigation {
  id: string
  parentSlideId: string | null
  childSlideId: string | null
  previousSlideId: string | null
  nextSlideId: string | null
}

function assertNavigation(slide: SlideNode, expected: ExpectedNavigation) {
  expect(slide.id).toBe(expected.id)
  expect(slide.navigation.parentSlideId).toBe(expected.parentSlideId)
  expect(slide.navigation.childSlideId).toBe(expected.childSlideId)
  expect(slide.navigation.previousSlideId).toBe(expected.previousSlideId)
  expect(slide.navigation.nextSlideId).toBe(expected.nextSlideId)
}

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
