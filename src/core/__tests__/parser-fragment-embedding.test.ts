import { expect, test } from 'vitest'
import { Fragment, Presentation } from '../../types/presentation'
import { parse } from '../parser'
import { assertSuccessResult, createFragment, createPresentation } from './parser-test.utils'

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
  console.log('🚀 ~ test ~ slideNodes:', slideNodes)

  // Define structure and navigation using a table
  const structureTable = `
    | id           | parentSlideId | childSlideId | previousSlideId | nextSlideId    | delimiterLevel |
    | ------------ | ------------- | ------------ | --------------- | -------------- | -------------- |
    | S1           | null          | null         | null            | S1.includeS1   | 0              |
    | S1.includeS1 | null          | null         | S1              | S1.includeS2   | 0              |
    | S1.includeS2 | null          | null         | S1.includeS1    | S2             | 0              |
    | S2           | null          | null         | S1.includeS2    | null           | 0              |
  `

  // We expect exactly 4 slides
  expect(slideNodes).toHaveLength(4)

  // Extract slides for easier reading
  const [firstSlide, secondSlide, thirdSlide, fourthSlide] = slideNodes

  // Log actual slide structure for debugging
  console.log('Actual slide structure:')
  slideNodes.forEach(node => {
    console.log(`ID: ${node.id}, Content: ${node.content.trim().substring(0, 30)}`)
    console.log(`Navigation: prev=${node.navigation.previousSlideId}, next=${node.navigation.nextSlideId}`)
  })

  // 2. Verify content of slides in the right order regardless of exact IDs
  expect(firstSlide.content.trim()).toContain('# Entry Slide 1')
  expect(secondSlide.content.trim()).toContain('# Included Slide A')
  expect(thirdSlide.content.trim()).toContain('# Included Slide B')
  expect(fourthSlide.content.trim()).toContain('# Entry Slide 2')

  // 3. Verify navigation connections
  // First slide should link to second
  expect(firstSlide.navigation.nextSlideId).toBe(secondSlide.id)
  expect(firstSlide.navigation.previousSlideId).toBeNull()

  // Second slide should link to third and back to first
  expect(secondSlide.navigation.nextSlideId).toBe(thirdSlide.id)
  expect(secondSlide.navigation.previousSlideId).toBe(firstSlide.id)

  // Third slide should link to fourth and back to second
  expect(thirdSlide.navigation.nextSlideId).toBe(fourthSlide.id)
  expect(thirdSlide.navigation.previousSlideId).toBe(secondSlide.id)

  // Fourth slide should link back to third and have no next
  expect(fourthSlide.navigation.previousSlideId).toBe(thirdSlide.id)
  expect(fourthSlide.navigation.nextSlideId).toBeNull()
})
