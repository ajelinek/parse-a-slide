import { expect, test } from 'vitest'
import path from 'path'
import { Fragment } from '../../../types/presentation'
import { SlideNode } from '../../../types/slide'
import {
  extractFragmentReference,
  resolveFragmentPath,
  detectCircularReference,
  applyFragmentSubstitutionNaming,
} from '../fragment-resolver'
import { createGlobalContext } from '../context-manager'

function setUp() {
  return {
    context: createGlobalContext(),
  }
}

test('extractFragmentReference should extract valid fragment reference', () => {
  const content = '[Fragment Title](./fragment.pres.md)'

  const result = extractFragmentReference(content)

  expect(result).toEqual({
    fullMatch: '[Fragment Title](./fragment.pres.md)',
    text: 'Fragment Title',
    path: './fragment.pres.md',
  })
})

test('extractFragmentReference should extract fragment reference with mdx extension', () => {
  const content = '[Another Fragment](../other.pres.mdx)'

  const result = extractFragmentReference(content)

  expect(result).toEqual({
    fullMatch: '[Another Fragment](../other.pres.mdx)',
    text: 'Another Fragment',
    path: '../other.pres.mdx',
  })
})

test('extractFragmentReference should return null for regular markdown link', () => {
  const content = '[Regular Link](./file.md)'

  const result = extractFragmentReference(content)

  expect(result).toBeNull()
})

test('extractFragmentReference should return null for content without links', () => {
  const content = 'Just regular text content'

  const result = extractFragmentReference(content)

  expect(result).toBeNull()
})

test('extractFragmentReference should return null for malformed link', () => {
  const content = '[Malformed Link(./fragment.pres.md)'

  const result = extractFragmentReference(content)

  expect(result).toBeNull()
})

test('extractFragmentReference should handle fragment reference with whitespace', () => {
  const content = '  [Fragment](./test.pres.md)  '

  const result = extractFragmentReference(content)

  expect(result).toEqual({
    fullMatch: '  [Fragment](./test.pres.md)  ',
    text: 'Fragment',
    path: './test.pres.md',
  })
})

test('extractFragmentReference should return null for fragment reference not on its own line', () => {
  const content = 'Here is a [Fragment](./test.pres.md) inline'

  const result = extractFragmentReference(content)

  expect(result).toBeNull()
})

test('resolveFragmentPath should resolve relative path correctly', () => {
  const referencedPath = './child-fragment.pres.md'
  const currentFragmentPath = '/presentation/main.pres.md'

  const result = resolveFragmentPath(referencedPath, currentFragmentPath)

  expect(result).toBe('/presentation/child-fragment.pres.md')
})

test('resolveFragmentPath should resolve parent directory path', () => {
  const referencedPath = '../other-fragment.pres.md'
  const currentFragmentPath = '/presentation/subfolder/current.pres.md'

  const result = resolveFragmentPath(referencedPath, currentFragmentPath)

  expect(result).toBe('/presentation/other-fragment.pres.md')
})

test('resolveFragmentPath should handle absolute path', () => {
  const referencedPath = '/absolute/fragment.pres.md'
  const currentFragmentPath = '/presentation/current.pres.md'

  const result = resolveFragmentPath(referencedPath, currentFragmentPath)

  expect(result).toBe('/presentation/absolute/fragment.pres.md')
})

test('resolveFragmentPath should resolve complex relative path', () => {
  const referencedPath = '../../shared/fragment.pres.md'
  const currentFragmentPath = '/presentation/deep/subfolder/current.pres.md'

  const result = resolveFragmentPath(referencedPath, currentFragmentPath)

  expect(result).toBe('/presentation/shared/fragment.pres.md')
})

test('detectCircularReference should detect circular reference', () => {
  const fragmentPath = '/presentation/fragment-a.pres.md'
  const processingStack = [
    '/presentation/main.pres.md',
    '/presentation/fragment-a.pres.md',
    '/presentation/fragment-b.pres.md',
  ]

  const result = detectCircularReference(fragmentPath, processingStack)

  expect(result).toBe(true)
})

test('detectCircularReference should not detect circular reference for new fragment', () => {
  const fragmentPath = '/presentation/fragment-c.pres.md'
  const processingStack = [
    '/presentation/main.pres.md',
    '/presentation/fragment-a.pres.md',
    '/presentation/fragment-b.pres.md',
  ]

  const result = detectCircularReference(fragmentPath, processingStack)

  expect(result).toBe(false)
})

test('detectCircularReference should handle empty processing stack', () => {
  const fragmentPath = '/presentation/fragment.pres.md'
  const processingStack: string[] = []

  const result = detectCircularReference(fragmentPath, processingStack)

  expect(result).toBe(false)
})

test('detectCircularReference should detect self-reference', () => {
  const fragmentPath = '/presentation/fragment.pres.md'
  const processingStack = ['/presentation/fragment.pres.md']

  const result = detectCircularReference(fragmentPath, processingStack)

  expect(result).toBe(true)
})

test('applyFragmentSubstitutionNaming should apply fragment substitution naming correctly', () => {
  const mockSlides: SlideNode[] = [
    {
      id: 'S1',
      url: '/test/S1',
      content: 'First slide',
      navigation: { parentSlideId: null, childSlideId: null, previousSlideId: null, nextSlideId: null },
      delimiterLevel: 0,
      fragmentId: 'original-fragment',
      userDefinedFrontMatter: {},
    },
    {
      id: 'S2',
      url: '/test/S2',
      content: 'Second slide',
      navigation: { parentSlideId: null, childSlideId: null, previousSlideId: null, nextSlideId: null },
      delimiterLevel: 0,
      fragmentId: 'original-fragment',
      userDefinedFrontMatter: {},
    },
  ]

  const baseSlideId = 'S1'
  const embeddingLevel = 0
  const presentationName = 'test-presentation'
  const fragmentId = 'fragment-1'

  applyFragmentSubstitutionNaming(mockSlides, baseSlideId, embeddingLevel, presentationName, fragmentId)

  expect(mockSlides[0].id).toBe('S1FS1')
  expect(mockSlides[0].url).toBe('/test-presentation/S1FS1')
  expect(mockSlides[0].fragmentId).toBe('fragment-1')

  expect(mockSlides[1].id).toBe('S1FS2')
  expect(mockSlides[1].url).toBe('/test-presentation/S1FS2')
  expect(mockSlides[1].fragmentId).toBe('fragment-1')
})

test('applyFragmentSubstitutionNaming should handle empty slide array', () => {
  const mockSlides: SlideNode[] = []
  const baseSlideId = 'S1'
  const embeddingLevel = 0
  const presentationName = 'test-presentation'
  const fragmentId = 'fragment-1'

  expect(() => {
    applyFragmentSubstitutionNaming(mockSlides, baseSlideId, embeddingLevel, presentationName, fragmentId)
  }).not.toThrow()

  expect(mockSlides).toHaveLength(0)
})

test('applyFragmentSubstitutionNaming should preserve slide content and navigation', () => {
  const originalNavigation = {
    parentSlideId: 'parent',
    childSlideId: 'child',
    previousSlideId: 'prev',
    nextSlideId: 'next',
  }
  const mockSlides: SlideNode[] = [
    {
      id: 'S1',
      url: '/test/S1',
      content: 'Important content',
      navigation: originalNavigation,
      delimiterLevel: 1,
      fragmentId: 'original-fragment',
      userDefinedFrontMatter: {},
    },
  ]

  applyFragmentSubstitutionNaming(mockSlides, 'S1', 0, 'test-presentation', 'fragment-1')

  expect(mockSlides[0].content).toBe('Important content')
  expect(mockSlides[0].navigation).toEqual(originalNavigation)
  expect(mockSlides[0].delimiterLevel).toBe(1)
})
