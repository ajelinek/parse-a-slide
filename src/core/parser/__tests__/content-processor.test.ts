import { test, expect } from 'vitest'
import { createContentProcessor } from '../content-processor'
import { createGlobalContext } from '../context-manager'
import { Fragment } from '../../../types/presentation'
import { SlideNode } from '../../../types/slide'
import { SlideContent } from '../types'

function createTestFragment(id: string = 'test-fragment'): Fragment {
  return {
    id,
    name: 'test.md',
    fullPath: '/path/to/test.md',
    relativePath: 'test.md',
    extension: '.md',
    content: 'test content',
    isEntry: true,
  }
}

function createTestSlideContent(content: string, childLevel: number = 0): SlideContent {
  return {
    content,
    childLevel,
    isDelimiter: false,
  }
}

function createTestSlideNode(id: string, delimiterLevel: number = 0): SlideNode {
  return {
    id,
    url: `/${id}`,
    content: `Content for ${id}`,
    delimiterLevel,
    fragmentId: 'test-fragment',
    navigation: {
      parentSlideId: null,
      childSlideId: null,
      previousSlideId: null,
      nextSlideId: null,
    },
  }
}

test('should create content processor with empty state', () => {
  const fragment = createTestFragment()
  const globalContext = createGlobalContext()

  const processor = createContentProcessor(fragment, 'test-presentation', 0, globalContext)

  expect(processor.getSlideNodes()).toEqual([])
  expect(processor.getLastSlideNode()).toBeNull()
})

test('should add content to buffer', () => {
  const fragment = createTestFragment()
  const globalContext = createGlobalContext()
  const processor = createContentProcessor(fragment, 'test-presentation', 0, globalContext)

  const content = createTestSlideContent('Test content')
  processor.addToBuffer(content)

  expect(processor.getSlideNodes()).toEqual([])
})

test('should flush buffer and create slide nodes', () => {
  const fragment = createTestFragment()
  const globalContext = createGlobalContext()
  const processor = createContentProcessor(fragment, 'test-presentation', 0, globalContext)

  const content = createTestSlideContent('Test content')
  processor.addToBuffer(content)
  processor.flushBuffer()

  const slideNodes = processor.getSlideNodes()
  expect(slideNodes).toHaveLength(1)
  expect(slideNodes[0].content).toBe('Test content')
  expect(slideNodes[0].fragmentId).toBe('test-fragment')
})

test('should not create nodes when flushing empty buffer', () => {
  const fragment = createTestFragment()
  const globalContext = createGlobalContext()
  const processor = createContentProcessor(fragment, 'test-presentation', 0, globalContext)

  processor.flushBuffer()

  expect(processor.getSlideNodes()).toEqual([])
})

test('should clear buffer after flushing', () => {
  const fragment = createTestFragment()
  const globalContext = createGlobalContext()
  const processor = createContentProcessor(fragment, 'test-presentation', 0, globalContext)

  const content1 = createTestSlideContent('Content 1')
  const content2 = createTestSlideContent('Content 2')

  processor.addToBuffer(content1)
  processor.addToBuffer(content2)
  processor.flushBuffer()

  expect(processor.getSlideNodes()).toHaveLength(2)

  processor.flushBuffer()
  expect(processor.getSlideNodes()).toHaveLength(2)
})

test('should add slide nodes directly', () => {
  const fragment = createTestFragment()
  const globalContext = createGlobalContext()
  const processor = createContentProcessor(fragment, 'test-presentation', 0, globalContext)

  const node1 = createTestSlideNode('S1')
  const node2 = createTestSlideNode('S2')

  processor.addSlideNodes([node1, node2])

  const slideNodes = processor.getSlideNodes()
  expect(slideNodes).toHaveLength(2)
  expect(slideNodes[0].id).toBe('S1')
  expect(slideNodes[1].id).toBe('S2')
})

test('should return last slide node', () => {
  const fragment = createTestFragment()
  const globalContext = createGlobalContext()
  const processor = createContentProcessor(fragment, 'test-presentation', 0, globalContext)

  const node1 = createTestSlideNode('S1')
  const node2 = createTestSlideNode('S2')

  processor.addSlideNodes([node1])
  expect(processor.getLastSlideNode()?.id).toBe('S1')

  processor.addSlideNodes([node2])
  expect(processor.getLastSlideNode()?.id).toBe('S2')
})

test('should combine buffered and direct slide nodes', () => {
  const fragment = createTestFragment()
  const globalContext = createGlobalContext()
  const processor = createContentProcessor(fragment, 'test-presentation', 0, globalContext)

  const content = createTestSlideContent('Buffered content')
  processor.addToBuffer(content)
  processor.flushBuffer()

  const directNode = createTestSlideNode('S2')
  processor.addSlideNodes([directNode])

  const slideNodes = processor.getSlideNodes()
  expect(slideNodes).toHaveLength(2)
  expect(slideNodes[0].content).toBe('Buffered content')
  expect(slideNodes[1].id).toBe('S2')
})

test('should handle multiple flush operations', () => {
  const fragment = createTestFragment()
  const globalContext = createGlobalContext()
  const processor = createContentProcessor(fragment, 'test-presentation', 0, globalContext)

  const content1 = createTestSlideContent('Content 1')
  processor.addToBuffer(content1)
  processor.flushBuffer()

  const content2 = createTestSlideContent('Content 2')
  processor.addToBuffer(content2)
  processor.flushBuffer()

  const slideNodes = processor.getSlideNodes()
  expect(slideNodes).toHaveLength(2)
  expect(slideNodes[0].content).toBe('Content 1')
  expect(slideNodes[1].content).toBe('Content 2')
})

test('should pass creation context correctly', () => {
  const fragment = createTestFragment('custom-fragment')
  const globalContext = createGlobalContext()
  const processor = createContentProcessor(fragment, 'custom-presentation', 2, globalContext)

  const content = createTestSlideContent('Test content')
  processor.addToBuffer(content)
  processor.flushBuffer()

  const slideNodes = processor.getSlideNodes()
  expect(slideNodes[0].fragmentId).toBe('custom-fragment')
})
