import { expect, test } from 'vitest'
import { SlideNodeBuilder } from '../slide-node-builder'
import { RawSlide } from '../fragment-splitter'
import { SlideNode } from '../../../types/slide'
import { parseMarkdownTable, toNullable } from '../../../test-utils/markdown-table-util'

// Create a raw slide with the given content, child level and path
function createRawSlide(content: string, childLevel: number, path = 'test.pres.md'): RawSlide {
  return {
    content,
    childLevel,
    isFragment: false,
    path,
  }
}

// Setup function to initialize test resources
function setUp(rawSlides: RawSlide[] = []) {
  const builder = new SlideNodeBuilder()

  // Add all provided raw slides to the builder
  rawSlides.forEach(slide => builder.addSlideNode(slide))

  return { builder }
}

// Generate an array of SlideNodes from a markdown table structure
function generateTestSlides(markdownTable: string) {
  // Parse the markdown table to get the structure
  const rows = parseMarkdownTable<{
    id: string
    parentSlideId: string
    childSlideId: string
    previousSlideId: string
    nextSlideId: string
  }>(markdownTable)

  // Convert table rows to expected slide nodes
  return rows.map(row => ({
    id: row.id,
    navigation: {
      parentSlideId: toNullable(row.parentSlideId),
      childSlideId: toNullable(row.childSlideId),
      previousSlideId: toNullable(row.previousSlideId),
      nextSlideId: toNullable(row.nextSlideId),
    },
  }))
}

// Verify slides match the expected structure from markdown table
function verifySlideStructure(slides: SlideNode[], markdownTable: string) {
  const expectedSlides = generateTestSlides(markdownTable)

  // Verify same number of slides
  expect(slides.length).toBe(expectedSlides.length)

  slides.forEach((slide, index) => {
    expect(slide.id).toBe(expectedSlides[index].id)
    expect(slide.navigation).toEqual(expectedSlides[index].navigation)
  })
}

test('should create slide node with correct ID', () => {
  const { builder } = setUp()

  const slide = builder.addSlideNode(createRawSlide('Slide content', 0))

  expect(slide.id).toBe('s1')
  expect(slide.content).toBe('Slide content')
  expect(slide.fragmentPath).toBe('test.pres.md')
  expect(slide.navigation.parentSlideId).toBeNull()
  expect(slide.navigation.childSlideId).toBeNull()
  expect(slide.navigation.previousSlideId).toBeNull()
  expect(slide.navigation.nextSlideId).toBeNull()
})

test('should create multiple slide nodes with sequential IDs', () => {
  const rawSlides = [createRawSlide('Slide 1', 0), createRawSlide('Slide 2', 0)]
  const { builder } = setUp(rawSlides)
  const slides = builder.getSlideNodes()

  expect(slides.length).toBe(2)

  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | s1 | null          | null         | null            | s2          |
    | s2 | null          | null         | s1              | null        |
  `

  verifySlideStructure(slides, structureTable)
})

test('should establish parent-child relationships based on childLevel', () => {
  const rawSlides = [createRawSlide('Parent', 0), createRawSlide('Child', 1)]
  const { builder } = setUp(rawSlides)
  const slides = builder.getSlideNodes()

  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | s1 | null          | s2           | null            | null        |
    | s2 | s1            | null         | null            | null        |
  `

  verifySlideStructure(slides, structureTable)
})

test('should handle multiple levels of nesting', () => {
  const rawSlides = [createRawSlide('Level 0', 0), createRawSlide('Level 1', 1), createRawSlide('Level 2', 2)]
  const { builder } = setUp(rawSlides)
  const slides = builder.getSlideNodes()

  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | s1 | null          | s2           | null            | null        |
    | s2 | s1            | s3           | null            | null        |
    | s3 | s2            | null         | null            | null        |
  `

  verifySlideStructure(slides, structureTable)
})

test('should reset parent stack when going back to a lower level', () => {
  const rawSlides = [
    createRawSlide('Level 0 A', 0),
    createRawSlide('Level 1 A', 1),
    createRawSlide('Level 2 A', 2),
    createRawSlide('Level 0 B', 0),
  ]
  const { builder } = setUp(rawSlides)
  const slides = builder.getSlideNodes()

  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | s1 | null          | s2           | null            | null        |
    | s2 | s1            | s3           | null            | null        |
    | s3 | s2            | null         | null            | null        |
    | s4 | null          | null         | s1              | null        |
  `

  // Only verify the last slide which is the one going back to a lower level
  verifySlideStructure(slides, structureTable)
})

test('should connect siblings with next/previous references', () => {
  const rawSlides = [createRawSlide('Parent', 0), createRawSlide('Child 1', 1), createRawSlide('Child 2', 1)]
  const { builder } = setUp(rawSlides)
  const slides = builder.getSlideNodes()

  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | s2 | s1            | null         | null            | s3          |
    | s3 | s1            | null         | s2              | null        |
  `

  // Only verify the child slides (skip the parent)
  verifySlideStructure([slides[1], slides[2]], structureTable)
})

test('should handle complex hierarchy with siblings at multiple levels', () => {
  const rawSlides = [
    createRawSlide('S1', 0),
    createRawSlide('S2', 1),
    createRawSlide('S3', 2),
    createRawSlide('S4', 2),
    createRawSlide('S5', 1),
  ]
  const { builder } = setUp(rawSlides)
  const slides = builder.getSlideNodes()

  const structureTable = `
    | id | parentSlideId | childSlideId | previousSlideId | nextSlideId |
    | -- | ------------- | ------------ | --------------- | ----------- |
    | s1 | null          | s2           | null            | null        |
    | s2 | s1            | s3           | null            | s5          |
    | s3 | s2            | null         | null            | s4          |
    | s4 | s2            | null         | s3              | null        |
    | s5 | s1            | null         | s2              | null        |
  `

  verifySlideStructure(slides, structureTable)
})
