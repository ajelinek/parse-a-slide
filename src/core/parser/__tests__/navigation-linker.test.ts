import { expect, test } from 'vitest'
import { SlideNode } from '../../../types/slide'
import { connectNavigationLinks } from '../navigation-linker'

function setUp() {
  const createMockSlideNode = (id: string, delimiterLevel: number = 0): SlideNode => ({
    id,
    url: `/test/${id}`,
    content: `Content for ${id}`,
    navigation: {
      parentSlideId: delimiterLevel > 0 ? getParentId(id, delimiterLevel) : null,
      childSlideId: null,
      previousSlideId: null,
      nextSlideId: null,
    },
    delimiterLevel,
    fragmentId: 'test-fragment',
    userDefinedFrontMatter: {},
  })

  const getParentId = (id: string, level: number): string => {
    if (level === 1) return id.substring(0, 2) // S1C1 -> S1
    if (level === 2) return id.substring(0, 4) // S1C1C1 -> S1C1
    return id
  }

  return { createMockSlideNode }
}

test('connectNavigationLinks should link sequential sibling slides', () => {
  const { createMockSlideNode } = setUp()
  const slides: SlideNode[] = [createMockSlideNode('S1'), createMockSlideNode('S2'), createMockSlideNode('S3')]

  connectNavigationLinks(slides)

  expect(slides[0].navigation.previousSlideId).toBeNull()
  expect(slides[0].navigation.nextSlideId).toBe('S2')

  expect(slides[1].navigation.previousSlideId).toBe('S1')
  expect(slides[1].navigation.nextSlideId).toBe('S3')

  expect(slides[2].navigation.previousSlideId).toBe('S2')
  expect(slides[2].navigation.nextSlideId).toBeNull()
})

test('connectNavigationLinks should link parent-child relationships', () => {
  const { createMockSlideNode } = setUp()
  const slides: SlideNode[] = [
    createMockSlideNode('S1', 0),
    createMockSlideNode('S1C1', 1),
    createMockSlideNode('S2', 0),
  ]

  connectNavigationLinks(slides)

  expect(slides[0].navigation.childSlideId).toBe('S1C1')
  expect(slides[1].navigation.parentSlideId).toBe('S1')
  expect(slides[2].navigation.parentSlideId).toBeNull()
})

test('connectNavigationLinks should handle complex hierarchy navigation', () => {
  const { createMockSlideNode } = setUp()
  const slides: SlideNode[] = [
    createMockSlideNode('S1', 0),
    createMockSlideNode('S1C1', 1),
    createMockSlideNode('S1C1C1', 2),
    createMockSlideNode('S1C2', 1),
    createMockSlideNode('S2', 0),
  ]

  connectNavigationLinks(slides)

  expect(slides[0].navigation.childSlideId).toBe('S1C1')
  expect(slides[1].navigation.parentSlideId).toBe('S1')
  expect(slides[1].navigation.childSlideId).toBe('S1C1C1')
  expect(slides[2].navigation.parentSlideId).toBe('S1C1')

  expect(slides[1].navigation.nextSlideId).toBe('S1C2')
  expect(slides[3].navigation.previousSlideId).toBe('S1C1')

  expect(slides[0].navigation.nextSlideId).toBe('S2')
  expect(slides[4].navigation.previousSlideId).toBe('S1')
})

test('connectNavigationLinks should handle single slide', () => {
  const { createMockSlideNode } = setUp()
  const slides: SlideNode[] = [createMockSlideNode('S1')]

  connectNavigationLinks(slides)

  expect(slides[0].navigation.parentSlideId).toBeNull()
  expect(slides[0].navigation.childSlideId).toBeNull()
  expect(slides[0].navigation.previousSlideId).toBeNull()
  expect(slides[0].navigation.nextSlideId).toBeNull()
})

test('connectNavigationLinks should handle empty slide array', () => {
  const slides: SlideNode[] = []

  expect(() => {
    connectNavigationLinks(slides)
  }).not.toThrow()
})

test('connectNavigationLinks should handle deeply nested hierarchy', () => {
  const { createMockSlideNode } = setUp()
  const slides: SlideNode[] = [
    createMockSlideNode('S1', 0),
    createMockSlideNode('S1C1', 1),
    createMockSlideNode('S1C1C1', 2),
    createMockSlideNode('S1C1C1C1', 3),
    createMockSlideNode('S1C1C1C2', 3),
    createMockSlideNode('S1C1C2', 2),
    createMockSlideNode('S2', 0),
  ]

  // Override parent IDs for deeper levels manually since the helper doesn't handle them
  slides[3].navigation.parentSlideId = 'S1C1C1'
  slides[4].navigation.parentSlideId = 'S1C1C1'

  connectNavigationLinks(slides)

  expect(slides[0].navigation.childSlideId).toBe('S1C1')
  expect(slides[1].navigation.childSlideId).toBe('S1C1C1')
  expect(slides[2].navigation.childSlideId).toBe('S1C1C1C1')

  expect(slides[3].navigation.nextSlideId).toBe('S1C1C1C2')
  expect(slides[4].navigation.previousSlideId).toBe('S1C1C1C1')

  expect(slides[5].navigation.parentSlideId).toBe('S1C1')

  expect(slides[6].navigation.previousSlideId).toBe('S1')
})

test('connectNavigationLinks should handle fragment substitution patterns (FS naming)', () => {
  const { createMockSlideNode } = setUp()
  const slides: SlideNode[] = [
    createMockSlideNode('S1', 0),
    createMockSlideNode('S1FS1', 0),
    createMockSlideNode('S1FS2', 0),
    createMockSlideNode('S2', 0),
  ]

  connectNavigationLinks(slides)

  expect(slides[0].navigation.nextSlideId).toBe('S1FS1')
  expect(slides[1].navigation.previousSlideId).toBe('S1')
  expect(slides[1].navigation.nextSlideId).toBe('S1FS2')
  expect(slides[2].navigation.previousSlideId).toBe('S1FS1')
  expect(slides[2].navigation.nextSlideId).toBe('S2')
  expect(slides[3].navigation.previousSlideId).toBe('S1')
})

test('connectNavigationLinks should preserve existing content and other properties', () => {
  const { createMockSlideNode } = setUp()
  const slides: SlideNode[] = [createMockSlideNode('S1'), createMockSlideNode('S2')]

  const originalContent = slides[0].content
  const originalUrl = slides[0].url

  connectNavigationLinks(slides)

  expect(slides[0].content).toBe(originalContent)
  expect(slides[0].url).toBe(originalUrl)
  expect(slides[0].id).toBe('S1')
})
