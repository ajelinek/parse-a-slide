import { test, expect } from 'vitest'
import { SlideNode, SlideNavigation } from '../../types/slide'
import { FrontMatter } from '../../types/frontmatter'
import { toMdx } from '../generateMdx'

function setUp() {
  return { toMdx }
}

function createTestSlideNode(options: {
  title?: string
  description?: string
  content?: string
  navigation?: Partial<SlideNavigation>
  frontMatter?: Partial<FrontMatter>
  fragmentPath?: string
}): SlideNode {
  const {
    title = 'Test Slide',
    description,
    content = '# Test Content\nThis is test content.',
    navigation = {},
    frontMatter = {},
    fragmentPath = 'test.pres.md',
  } = options

  const defaultNavigation: SlideNavigation = {
    parentSlideId: null,
    childSlideId: null,
    previousSlideId: null,
    nextSlideId: null,
    ...navigation,
  }

  const defaultFrontMatter: FrontMatter = {
    title,
    description,
    ...frontMatter,
  }

  return {
    id: 'test-slide-1',
    url: '/test-slide-1',
    navigation: defaultNavigation,
    content,
    fragmentPath,
    frontMatter: defaultFrontMatter,
  }
}

test('toMdx should generate a standard MDX file from a complete SlideNode', () => {
  const { toMdx } = setUp()

  const slideNode = createTestSlideNode({
    title: 'Complete Slide',
    description: 'A complete slide with all properties',
    content: '# Complete Content\nThis is complete content.',
    navigation: {
      parentSlideId: 'parent-1',
      nextSlideId: 'next-1',
      previousSlideId: 'prev-1',
      childSlideId: 'child-1',
    },
  })

  const result = toMdx(slideNode)

  expect(result).toContain('---')
  expect(result).toContain('title: Complete Slide')
  expect(result).toContain('description: A complete slide with all properties')
  expect(result).toContain('navigation:')
  expect(result).toContain('parentSlideId: parent-1')
  expect(result).toContain('# Complete Content')
  expect(result).toContain('This is complete content.')
})

test('toMdx should generate an MDX file for a slide fragment', () => {
  const { toMdx } = setUp()

  const slideNode = createTestSlideNode({
    fragmentPath: 'fragments/section1.pres.md',
    title: 'Fragment Slide',
    content: '# Fragment Content',
  })

  const result = toMdx(slideNode)

  expect(result).toContain('---')
  expect(result).toContain('title: Fragment Slide')
  expect(result).toContain('# Fragment Content')
})

test('toMdx should generate an MDX file from a SlideNode with only a title and content', () => {
  const { toMdx } = setUp()

  const slideNode = createTestSlideNode({
    title: 'Simple Slide',
    description: undefined,
    frontMatter: { title: 'Simple Slide', description: undefined },
    content: '# Simple Content',
  })

  const result = toMdx(slideNode)

  expect(result).toContain('---')
  expect(result).toContain('title: Simple Slide')
  expect(result).not.toContain('description:')
  expect(result).toContain('# Simple Content')
})

test('toMdx should generate an MDX file from a SlideNode with no content', () => {
  const { toMdx } = setUp()

  const slideNode = createTestSlideNode({
    title: 'No Content Slide',
    description: 'Has metadata but no content',
    content: '',
  })

  const result = toMdx(slideNode)

  expect(result).toContain('---')
  expect(result).toContain('title: No Content Slide')
  expect(result).toContain('description: Has metadata but no content')
  expect(result.trim()).toMatch(/---$/)
})

test('toMdx should generate an MDX file including user-defined front matter', () => {
  const { toMdx } = setUp()

  const slideNode = createTestSlideNode({
    title: 'Custom Slide',
    description: 'A slide with custom properties',
    content: '# Custom Content',
    frontMatter: {
      title: 'Custom Slide',
      description: 'A slide with custom properties',
      author: 'John Doe',
      theme: 'dark',
      customField: 'custom value',
      layout: 'two-column',
    },
  })

  const result = toMdx(slideNode)

  expect(result).toContain('---')
  expect(result).toContain('title: Custom Slide')
  expect(result).toContain('description: A slide with custom properties')
  expect(result).toContain('author: John Doe')
  expect(result).toContain('theme: dark')
  expect(result).toContain('customField: custom value')
  expect(result).toContain('layout: two-column')
  expect(result).toContain('# Custom Content')
})
