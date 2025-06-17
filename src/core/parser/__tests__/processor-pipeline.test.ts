import { expect, test, vi } from 'vitest'
import { SlideNode } from '../../../types/slide'
import { Processor } from '../../../types/processor'
import { applyProcessors, applyProcessorToSlide, validateProcessorResult } from '../processor-pipeline'

function setUp() {
  const createMockSlideNode = (id: string): SlideNode => ({
    id,
    url: `/test/${id}`,
    content: `Content for ${id}`,
    navigation: {
      parentSlideId: null,
      childSlideId: null,
      previousSlideId: null,
      nextSlideId: null,
    },
    delimiterLevel: 0,
    fragmentId: 'test-fragment',
    userDefinedFrontMatter: {},
  })

  const createMockProcessor = (transform: (slide: SlideNode) => SlideNode): Processor => ({
    process: vi.fn().mockImplementation(slide => {
      try {
        return { isOk: () => true, value: transform(slide), isErr: () => false }
      } catch (error) {
        return {
          isOk: () => false,
          isErr: () => true,
          error: { message: (error as Error).message },
        }
      }
    }),
  })

  return { createMockSlideNode, createMockProcessor }
}

test('applyProcessorToSlide should apply single processor to slide', () => {
  const { createMockSlideNode, createMockProcessor } = setUp()
  const slide = createMockSlideNode('S1')
  const processor = createMockProcessor(slide => ({
    ...slide,
    content: slide.content + ' - processed',
  }))

  const result = applyProcessorToSlide(slide, [processor])

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value.content).toBe('Content for S1 - processed')
    expect(result.value.id).toBe('S1')
  }
})

test('applyProcessorToSlide should handle processor that throws error', () => {
  const { createMockSlideNode, createMockProcessor } = setUp()
  const slide = createMockSlideNode('S1')
  const processor = createMockProcessor(() => {
    throw new Error('Processor failed')
  })

  const result = applyProcessorToSlide(slide, [processor])

  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.message).toContain('Processor failed')
  }
})

test('applyProcessorToSlide should validate processor result', () => {
  const { createMockSlideNode, createMockProcessor } = setUp()
  const slide = createMockSlideNode('S1')
  const processor = createMockProcessor(slide => ({
    ...slide,
    id: 'CHANGED_ID',
  }))

  const result = applyProcessorToSlide(slide, [processor])

  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.message).toContain('illegally modified slide ID')
  }
})

test('applyProcessorToSlide should allow processor to modify content and other properties', () => {
  const { createMockSlideNode, createMockProcessor } = setUp()
  const slide = createMockSlideNode('S1')
  const processor = createMockProcessor(slide => ({
    ...slide,
    content: 'New content',
    url: '/new-url/S1',
  }))

  const result = applyProcessorToSlide(slide, [processor])

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value.content).toBe('New content')
    expect(result.value.url).toBe('/new-url/S1')
    expect(result.value.id).toBe('S1')
  }
})

test('applyProcessors should apply single processor to all slides', () => {
  const { createMockSlideNode, createMockProcessor } = setUp()
  const slides = [createMockSlideNode('S1'), createMockSlideNode('S2'), createMockSlideNode('S3')]

  const processor = createMockProcessor(slide => ({
    ...slide,
    content: slide.content + ' - processed',
  }))

  const result = applyProcessors(slides, [processor])

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toHaveLength(3)
    expect(result.value[0].content).toBe('Content for S1 - processed')
    expect(result.value[1].content).toBe('Content for S2 - processed')
    expect(result.value[2].content).toBe('Content for S3 - processed')
  }
})

test('applyProcessors should apply multiple processors in sequence', () => {
  const { createMockSlideNode, createMockProcessor } = setUp()
  const slides = [createMockSlideNode('S1')]

  const processor1 = createMockProcessor(slide => ({
    ...slide,
    content: slide.content + ' - p1',
  }))

  const processor2 = createMockProcessor(slide => ({
    ...slide,
    content: slide.content + ' - p2',
  }))

  const result = applyProcessors(slides, [processor1, processor2])

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value[0].content).toBe('Content for S1 - p1 - p2')
  }
})

test('applyProcessors should handle empty processor array', () => {
  const { createMockSlideNode } = setUp()
  const slides = [createMockSlideNode('S1'), createMockSlideNode('S2')]

  const result = applyProcessors(slides, [])

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toEqual(slides)
  }
})

test('applyProcessors should handle empty slides array', () => {
  const { createMockProcessor } = setUp()
  const processor = createMockProcessor(slide => slide)

  const result = applyProcessors([], [processor])

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value).toEqual([])
  }
})

test('applyProcessors should stop processing on first error', () => {
  const { createMockSlideNode, createMockProcessor } = setUp()
  const slides = [createMockSlideNode('S1'), createMockSlideNode('S2'), createMockSlideNode('S3')]

  const processor = createMockProcessor(slide => {
    if (slide.id === 'S2') {
      throw new Error('Processing failed for S2')
    }
    return { ...slide, content: slide.content + ' - processed' }
  })

  const result = applyProcessors(slides, [processor])

  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.message).toContain('Processing failed for S2')
  }
})

test('applyProcessors should handle processor chain failure', () => {
  const { createMockSlideNode, createMockProcessor } = setUp()
  const slides = [createMockSlideNode('S1')]

  const processor1 = createMockProcessor(slide => ({
    ...slide,
    content: slide.content + ' - p1',
  }))

  const processor2 = createMockProcessor(() => {
    throw new Error('Second processor failed')
  })

  const result = applyProcessors(slides, [processor1, processor2])

  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.message).toContain('Second processor failed')
  }
})

test('validateProcessorResult should validate correct processor result', () => {
  const { createMockSlideNode } = setUp()
  const original = createMockSlideNode('S1')
  const processed = {
    ...original,
    content: 'Modified content',
  }

  const result = validateProcessorResult(original, processed)

  expect(result.isOk()).toBe(true)
})

test('validateProcessorResult should reject result with changed ID', () => {
  const { createMockSlideNode } = setUp()
  const original = createMockSlideNode('S1')
  const processed = {
    ...original,
    id: 'CHANGED_ID',
  }

  const result = validateProcessorResult(original, processed)

  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.message).toContain('illegally modified slide ID')
  }
})

test('validateProcessorResult should reject result with missing required properties', () => {
  const { createMockSlideNode } = setUp()
  const original = createMockSlideNode('S1')
  const processed = {
    ...original,
    url: undefined as any,
  }

  const result = validateProcessorResult(original, processed)

  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.message).toContain('corrupted required slide properties')
  }
})

test('validateProcessorResult should allow modification of non-critical properties', () => {
  const { createMockSlideNode } = setUp()
  const original = createMockSlideNode('S1')
  const processed = {
    ...original,
    content: 'New content',
    url: '/new-url/S1',
  }

  const result = validateProcessorResult(original, processed)

  expect(result.isOk()).toBe(true)
})

test('validateProcessorResult should preserve navigation structure requirement', () => {
  const { createMockSlideNode } = setUp()
  const original = createMockSlideNode('S1')
  const processed = {
    ...original,
    navigation: undefined as any,
  }

  const result = validateProcessorResult(original, processed)

  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.message).toContain('corrupted required slide properties')
  }
})
