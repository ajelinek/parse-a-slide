import { expect, test } from 'vitest'
import { createSlideNodes, generateSlideId, createSlideNode } from '../slide-builder'
import { createGlobalContext } from '../context-manager'
import { SlideContent, SlideCreationContext } from '../types'

function setUp() {
  return {
    context: createGlobalContext(),
  }
}

test('generateSlideId should generate sequential top-level slide IDs', () => {
  const { context } = setUp()

  const slideId1 = generateSlideId(0, 0, context)
  const slideId2 = generateSlideId(0, 0, context)

  expect(slideId1.level).toBe(0)
  expect(slideId1.parentId).toBeNull()
  expect(slideId1.id).toMatch(/^S\d+$/)

  expect(slideId2.level).toBe(0)
  expect(slideId2.parentId).toBeNull()
  expect(slideId2.id).toMatch(/^S\d+$/)
  expect(slideId2.id).not.toBe(slideId1.id)
})

test('generateSlideId should generate child slide IDs with proper parent reference', () => {
  const { context } = setUp()

  const parentId = generateSlideId(0, 0, context)

  context.globalParentStack.push({ id: parentId.id, level: 0 })

  const childId = generateSlideId(1, 0, context)

  expect(childId.level).toBe(1)
  expect(childId.parentId).toBe(parentId.id)
  expect(childId.id).toMatch(new RegExp(`^${parentId.id}C\\d+$`))
})

test('generateSlideId should handle nested child levels correctly', () => {
  const { context } = setUp()

  const parentId = generateSlideId(0, 0, context)
  context.globalParentStack.push({ id: parentId.id, level: 0 })

  const childId = generateSlideId(1, 0, context)
  context.globalParentStack.push({ id: childId.id, level: 1 })

  const grandChildId = generateSlideId(2, 0, context)

  expect(grandChildId.level).toBe(2)
  expect(grandChildId.parentId).toBe(childId.id)
  expect(grandChildId.id).toMatch(new RegExp(`^${childId.id}C\\d+$`))
})

test('generateSlideId should reset child counters when returning to higher level', () => {
  const { context } = setUp()

  const parentId = generateSlideId(0, 0, context)
  context.globalParentStack.push({ id: parentId.id, level: 0 })

  const child1Id = generateSlideId(1, 0, context)
  expect(child1Id.id).toMatch(new RegExp(`^${parentId.id}C1$`))

  const child2Id = generateSlideId(1, 0, context)
  expect(child2Id.id).toMatch(new RegExp(`^${parentId.id}C2$`))

  context.globalParentStack = []
  const siblingId = generateSlideId(0, 0, context)
  expect(siblingId.id).toMatch(/^S\d+$/)
  expect(siblingId.id).not.toBe(parentId.id)
})

test('createSlideNode should create slide node with correct properties', () => {
  const content = 'Test slide content'
  const slideIdInfo = {
    id: 'S1',
    parentId: null,
    level: 0,
  }
  const creationContext: SlideCreationContext = {
    presentationName: 'test-presentation',
    fragment: {
      id: 'frag-1',
      name: 'test',
      fullPath: '/test/fragment.pres.md',
      relativePath: './fragment.pres.md',
      extension: '.pres.md',
      isEntry: false,
      content: 'fragment content',
    },
    inheritedNestingLevel: 0,
  }

  const slideNode = createSlideNode(content, slideIdInfo, creationContext)

  expect(slideNode.id).toBe('S1')
  expect(slideNode.content).toBe('Test slide content')
  expect(slideNode.url).toBe('/test-presentation/S1')
  expect(slideNode.fragmentId).toBe('frag-1')
  expect(slideNode.delimiterLevel).toBe(0)
  expect(slideNode.navigation).toEqual({
    parentSlideId: null,
    childSlideId: null,
    previousSlideId: null,
    nextSlideId: null,
  })
})

test('createSlideNode should create child slide node with parent reference', () => {
  const content = 'Child slide content'
  const slideIdInfo = {
    id: 'S1C1',
    parentId: 'S1',
    level: 1,
  }
  const creationContext: SlideCreationContext = {
    presentationName: 'test-presentation',
    fragment: {
      id: 'frag-1',
      name: 'test',
      fullPath: '/test/fragment.pres.md',
      relativePath: './fragment.pres.md',
      extension: '.pres.md',
      isEntry: false,
      content: 'fragment content',
    },
    inheritedNestingLevel: 0,
  }

  const slideNode = createSlideNode(content, slideIdInfo, creationContext)

  expect(slideNode.id).toBe('S1C1')
  expect(slideNode.delimiterLevel).toBe(1)
  expect(slideNode.navigation.parentSlideId).toBe('S1')
})

test('createSlideNode should handle empty content', () => {
  const content = ''
  const slideIdInfo = {
    id: 'S1',
    parentId: null,
    level: 0,
  }
  const creationContext: SlideCreationContext = {
    presentationName: 'test-presentation',
    fragment: {
      id: 'frag-1',
      name: 'test',
      fullPath: '/test/fragment.pres.md',
      relativePath: './fragment.pres.md',
      extension: '.pres.md',
      isEntry: false,
      content: 'fragment content',
    },
    inheritedNestingLevel: 0,
  }

  const slideNode = createSlideNode(content, slideIdInfo, creationContext)

  expect(slideNode.content).toBe('')
  expect(slideNode.id).toBe('S1')
})

test('createSlideNodes should create multiple slide nodes from content blocks', () => {
  const { context } = setUp()
  const slideContents: SlideContent[] = [
    {
      content: 'First slide',
      childLevel: 0,
      isDelimiter: false,
    },
    {
      content: 'Second slide',
      childLevel: 0,
      isDelimiter: false,
    },
    {
      content: 'Third slide',
      childLevel: 0,
      isDelimiter: false,
    },
  ]

  const creationContext: SlideCreationContext = {
    presentationName: 'test-presentation',
    fragment: {
      id: 'frag-1',
      name: 'test',
      fullPath: '/test/fragment.pres.md',
      relativePath: './fragment.pres.md',
      extension: '.pres.md',
      isEntry: false,
      content: 'fragment content',
    },
    inheritedNestingLevel: 0,
  }

  const slideNodes = createSlideNodes(slideContents, creationContext, context)

  expect(slideNodes).toHaveLength(3)
  expect(slideNodes[0].content).toBe('First slide')
  expect(slideNodes[1].content).toBe('Second slide')
  expect(slideNodes[2].content).toBe('Third slide')

  const ids = slideNodes.map(node => node.id)
  expect(new Set(ids).size).toBe(3)
})

test('createSlideNodes should create slide nodes with proper hierarchy', () => {
  const { context } = setUp()
  const slideContents: SlideContent[] = [
    {
      content: 'Parent slide',
      childLevel: 0,
      isDelimiter: false,
    },
    {
      content: 'Child slide',
      childLevel: 1,
      isDelimiter: false,
    },
    {
      content: 'Sibling slide',
      childLevel: 0,
      isDelimiter: false,
    },
  ]

  const creationContext: SlideCreationContext = {
    presentationName: 'test-presentation',
    fragment: {
      id: 'frag-1',
      name: 'test',
      fullPath: '/test/fragment.pres.md',
      relativePath: './fragment.pres.md',
      extension: '.pres.md',
      isEntry: false,
      content: 'fragment content',
    },
    inheritedNestingLevel: 0,
  }

  const slideNodes = createSlideNodes(slideContents, creationContext, context)

  expect(slideNodes).toHaveLength(3)
  expect(slideNodes[0].delimiterLevel).toBe(0)
  expect(slideNodes[1].delimiterLevel).toBe(1)
  expect(slideNodes[2].delimiterLevel).toBe(0)

  expect(slideNodes[1].id).toMatch(/C/)
})

test('createSlideNodes should handle empty content blocks', () => {
  const { context } = setUp()
  const slideContents: SlideContent[] = [
    {
      content: '',
      childLevel: 0,
      isDelimiter: false,
    },
  ]

  const creationContext: SlideCreationContext = {
    presentationName: 'test-presentation',
    fragment: {
      id: 'frag-1',
      name: 'test',
      fullPath: '/test/fragment.pres.md',
      relativePath: './fragment.pres.md',
      extension: '.pres.md',
      isEntry: false,
      content: 'fragment content',
    },
    inheritedNestingLevel: 0,
  }

  const slideNodes = createSlideNodes(slideContents, creationContext, context)

  expect(slideNodes).toHaveLength(1)
  expect(slideNodes[0].content).toBe('')
})

test('createSlideNodes should handle inherited nesting level', () => {
  const { context } = setUp()
  const slideContents: SlideContent[] = [
    {
      content: 'Slide with inherited nesting',
      childLevel: 0,
      isDelimiter: false,
    },
  ]

  const creationContext: SlideCreationContext = {
    presentationName: 'test-presentation',
    fragment: {
      id: 'frag-1',
      name: 'test',
      fullPath: '/test/fragment.pres.md',
      relativePath: './fragment.pres.md',
      extension: '.pres.md',
      isEntry: false,
      content: 'fragment content',
    },
    inheritedNestingLevel: 2,
  }

  const slideNodes = createSlideNodes(slideContents, creationContext, context)

  expect(slideNodes).toHaveLength(1)
  expect(slideNodes[0].delimiterLevel).toBe(2)
})
