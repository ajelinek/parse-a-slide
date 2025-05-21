import { describe, it, expect } from 'vitest'
// Assuming parseSlides will be updated to return ParsedSlidesOutput
// and SlideNode, ParsedSlidesOutput types will be defined in the parser file
import { parseSlides, type SlideNode, type ParsedSlidesOutput } from '../../src/utilities/slideParser'

describe('slideParser', () => {
  it('should parse empty content as no slides', () => {
    const expected: ParsedSlidesOutput = {
      rootSlideId: null,
      slides: new Map(),
    }
    expect(parseSlides('')).toEqual(expected)
  })

  it('should parse content with no slide comments as no slides', () => {
    const expected: ParsedSlidesOutput = {
      rootSlideId: null,
      slides: new Map(),
    }
    expect(parseSlides('Just some text.')).toEqual(expected)
  })

  it('should ignore content outside explicit slide blocks', () => {
    const mdx = `Preamble. {/* slide-start */}# Slide 1{/* slide-end */} Postamble.`
    const expectedSlides = new Map<string, SlideNode>()
    expectedSlides.set('S1', {
      id: 'S1',
      content: '# Slide 1',
      parentId: null,
      childId: null,
      nextId: null,
      prevId: null,
    })

    const expected: ParsedSlidesOutput = {
      rootSlideId: 'S1',
      slides: expectedSlides,
    }

    const result = parseSlides(mdx)
    expect(result).toEqual(expected)
  })

  it('should parse a single slide', () => {
    const mdx = ` {/* slide-start */} # Hello World {/* slide-end */} `
    const expectedSlides = new Map<string, SlideNode>()
    expectedSlides.set('S1', {
      id: 'S1',
      content: '# Hello World',
      parentId: null,
      childId: null,
      nextId: null,
      prevId: null,
    })
    const expected: ParsedSlidesOutput = {
      rootSlideId: 'S1',
      slides: expectedSlides,
    }
    // Adjusting test to directly expect the new ID format
    const result = parseSlides(mdx)
    expect(result).toEqual(expected)
  })

  it('should parse multiple top-level slides', () => {
    const mdx = `
      {/* slide-start */}
      # Slide 1
      {/* slide-end */}
      {/* slide-start */}
      ## Slide 2
      {/* slide-end */}
    `
    const expectedSlides = new Map<string, SlideNode>()
    expectedSlides.set('S1', {
      id: 'S1',
      content: '# Slide 1',
      parentId: null,
      childId: null,
      nextId: 'S2',
      prevId: null,
    })
    expectedSlides.set('S2', {
      id: 'S2',
      content: '## Slide 2',
      parentId: null,
      childId: null,
      nextId: null,
      prevId: 'S1',
    })
    const expected: ParsedSlidesOutput = {
      rootSlideId: 'S1',
      slides: expectedSlides,
    }
    expect(parseSlides(mdx)).toEqual(expected)
  })

  it('should parse nested slides (as per new "every segment is a slide" rule)', () => {
    const mdx = `
      {/* slide-start */}
      Parent Text
       {/* slide-start */}
        Child 1 Text
       {/* slide-end */}
      
       More Parent Text
     
       {/* slide-start */}
       Child 2 Text
       {/* slide-end */}
      
       Final Parent Text
      {/* slide-end */}
    `
    const expectedSlides = new Map<string, SlideNode>()
    // New logic: "More Parent Text" and "Final Parent Text" are ignored.
    // S1 ("Parent Text")
    //   S1.1 ("Child 1 Text")
    //   S1.2 ("Child 2 Text")
    expectedSlides.set('S1', {
      id: 'S1',
      content: 'Parent Text',
      parentId: null,
      childId: 'S1.1', // Child is S1.1
      nextId: null,
      prevId: null,
    })
    expectedSlides.set('S1.1', {
      id: 'S1.1',
      content: 'Child 1 Text',
      parentId: 'S1',
      childId: null,
      nextId: 'S1.2', // Next sibling is S1.2
      prevId: null,
    })
    expectedSlides.set('S1.2', {
      // Was S1.2.1, "More Parent Text" was S1.2
      id: 'S1.2',
      content: 'Child 2 Text',
      parentId: 'S1', // Parent is S1
      childId: null,
      nextId: null, // No next sibling, "Final Parent Text" is ignored
      prevId: 'S1.1', // Prev sibling is S1.1
    })

    const expected: ParsedSlidesOutput = {
      rootSlideId: 'S1',
      slides: expectedSlides,
    }
    expect(parseSlides(mdx)).toEqual(expected)
  })

  it('should parse deeply nested slides (as per new "every segment is a slide" rule)', () => {
    const mdx = `
      {/* slide-start */}
      L1 Start
      {/* slide-start */}
      L2 Start
      {/* slide-start */}
      L3
      {/* slide-end */}
      L2 End
      {/* slide-end */}
      L1 End
      {/* slide-end */}
    `
    // Original: "id_0" (L1 Start), "id_0_0" (L2 Start), "id_0_0_0" (L3), "id_0_1" (L2 End), "id_1" (L1 End)
    // New logic: "L2 End" and "L1 End" are ignored.
    // S1 (L1 Start)
    //   S1.1 (L2 Start)
    //     S1.1.1 (L3)

    const expectedSlides = new Map<string, SlideNode>()
    expectedSlides.set('S1', {
      id: 'S1',
      content: 'L1 Start',
      parentId: null,
      childId: 'S1.1',
      nextId: null, // No S2 as "L1 End" is ignored
      prevId: null,
    })
    expectedSlides.set('S1.1', {
      id: 'S1.1',
      content: 'L2 Start',
      parentId: 'S1',
      childId: 'S1.1.1',
      nextId: null, // No S1.2 as "L2 End" is ignored
      prevId: null,
    })
    expectedSlides.set('S1.1.1', {
      id: 'S1.1.1',
      content: 'L3',
      parentId: 'S1.1',
      childId: null,
      nextId: null,
      prevId: null,
    })
    // S1.2 ("L2 End") and S2 ("L1 End") are no longer created.

    const expected: ParsedSlidesOutput = {
      rootSlideId: 'S1',
      slides: expectedSlides,
    }
    expect(parseSlides(mdx)).toEqual(expected)
  })

  it('should handle slides with no content', () => {
    const mdx = ` {/* slide-start */}{/* slide-end */} {/* slide-start */}# Next{/* slide-end */} `
    // S1 (empty), next S2 (# Next)
    const expectedSlides = new Map<string, SlideNode>()
    expectedSlides.set('S1', { id: 'S1', content: '', parentId: null, childId: null, nextId: 'S2', prevId: null })
    expectedSlides.set('S2', { id: 'S2', content: '# Next', parentId: null, childId: null, nextId: null, prevId: 'S1' })
    const expected: ParsedSlidesOutput = {
      rootSlideId: 'S1',
      slides: expectedSlides,
    }
    expect(parseSlides(mdx)).toEqual(expected)
  })

  it('should handle nested slides with no direct parent content before child', () => {
    const mdx = ` {/* slide-start */}{/* slide-start */}## Nested{/* slide-end */}{/* slide-end */} `
    // S1 (empty parent segment), child S1.1 (## Nested)
    const expectedSlides = new Map<string, SlideNode>()
    expectedSlides.set('S1', { id: 'S1', content: '', parentId: null, childId: 'S1.1', nextId: null, prevId: null })
    expectedSlides.set('S1.1', {
      id: 'S1.1',
      content: '## Nested',
      parentId: 'S1',
      childId: null,
      nextId: null,
      prevId: null,
    })
    const expected: ParsedSlidesOutput = {
      rootSlideId: 'S1',
      slides: expectedSlides,
    }
    expect(parseSlides(mdx)).toEqual(expected)
  })

  it('should handle malformed (unclosed) slides gracefully', () => {
    const mdx = `
    {/* slide-start */}
    # Valid Slide
    {/* slide-end */}
    {/* slide-start */}
    # Unclosed Slide
    `
    // S1 (# Valid Slide), next S2 (# Unclosed Slide)
    const expectedSlides = new Map<string, SlideNode>()
    expectedSlides.set('S1', {
      id: 'S1',
      content: '# Valid Slide',
      parentId: null,
      childId: null,
      nextId: 'S2',
      prevId: null,
    })
    expectedSlides.set('S2', {
      id: 'S2',
      content: '# Unclosed Slide',
      parentId: null,
      childId: null,
      nextId: null,
      prevId: 'S1',
    })
    const expected: ParsedSlidesOutput = {
      rootSlideId: 'S1',
      slides: expectedSlides,
    }
    expect(parseSlides(mdx)).toEqual(expected)
  })

  it('should parse complex nested structure with specified IDs', () => {
    const mdx = `
{/* slide-start */}
Content for 1
  {/* slide-start */} Content for 1.1 {/* slide-end */}
  {/* slide-start */}
  Content for 1.2
    {/* slide-start */} Content for 1.2.1 {/* slide-end */}
    {/* slide-start */} Content for 1.2.2 {/* slide-end */}
  {/* slide-end */}
  {/* slide-start */} Content for 1.3 {/* slide-end */}
{/* slide-end */}
{/* slide-start */} Content for 2 {/* slide-end */}
{/* slide-start */}
Content for 3
  {/* slide-start */} Content for 3.1 {/* slide-end */}
  {/* slide-start */} Content for 3.2 {/* slide-end */}
  {/* slide-start */}
  Content for 3.3
    {/* slide-start */} Content for 3.3.1 {/* slide-end */}
    {/* slide-start */} Content for 3.3.2 {/* slide-end */}
  {/* slide-end */}
  {/* slide-start */} Content for 3.4 {/* slide-end */}
  {/* slide-start */} Content for 3.5 {/* slide-end */}
{/* slide-end */}
{/* slide-start */} Content for 4 {/* slide-end */}
`
    // The OLD "id_0", "id_0_0" logic vs "1", "1.1" was due to `useComplexIdSchema`.
    // Now it will consistently be S<n>.<m>...
    // Root nodes: S1, S2, S3, S4

    // S1 ("Content for 1")
    //   S1.1 ("Content for 1.1")
    //   S1.2 ("Content for 1.2")
    //     S1.2.1 ("Content for 1.2.1")
    //     S1.2.2 ("Content for 1.2.2")
    //   S1.3 ("Content for 1.3")
    // S2 ("Content for 2")
    // S3 ("Content for 3")
    //   S3.1 ("Content for 3.1")
    //   S3.2 ("Content for 3.2")
    //   S3.3 ("Content for 3.3")
    //     S3.3.1 ("Content for 3.3.1")
    //     S3.3.2 ("Content for 3.3.2")
    //   S3.4 ("Content for 3.4")
    //   S3.5 ("Content for 3.5")
    // S4 ("Content for 4")

    const expectedSlides = new Map<string, SlideNode>()
    expectedSlides.set('S1', {
      id: 'S1',
      content: 'Content for 1',
      parentId: null,
      childId: 'S1.1',
      nextId: 'S2',
      prevId: null,
    })
    expectedSlides.set('S1.1', {
      id: 'S1.1',
      content: 'Content for 1.1',
      parentId: 'S1',
      childId: null,
      nextId: 'S1.2',
      prevId: null,
    })
    expectedSlides.set('S1.2', {
      id: 'S1.2',
      content: 'Content for 1.2',
      parentId: 'S1',
      childId: 'S1.2.1',
      nextId: 'S1.3',
      prevId: 'S1.1',
    })
    expectedSlides.set('S1.2.1', {
      id: 'S1.2.1',
      content: 'Content for 1.2.1',
      parentId: 'S1.2',
      childId: null,
      nextId: 'S1.2.2',
      prevId: null,
    })
    expectedSlides.set('S1.2.2', {
      id: 'S1.2.2',
      content: 'Content for 1.2.2',
      parentId: 'S1.2',
      childId: null,
      nextId: null,
      prevId: 'S1.2.1',
    })
    expectedSlides.set('S1.3', {
      id: 'S1.3',
      content: 'Content for 1.3',
      parentId: 'S1',
      childId: null,
      nextId: null,
      prevId: 'S1.2',
    })

    expectedSlides.set('S2', {
      id: 'S2',
      content: 'Content for 2',
      parentId: null,
      childId: null,
      nextId: 'S3',
      prevId: 'S1',
    })

    expectedSlides.set('S3', {
      id: 'S3',
      content: 'Content for 3',
      parentId: null,
      childId: 'S3.1',
      nextId: 'S4',
      prevId: 'S2',
    })
    expectedSlides.set('S3.1', {
      id: 'S3.1',
      content: 'Content for 3.1',
      parentId: 'S3',
      childId: null,
      nextId: 'S3.2',
      prevId: null,
    })
    expectedSlides.set('S3.2', {
      id: 'S3.2',
      content: 'Content for 3.2',
      parentId: 'S3',
      childId: null,
      nextId: 'S3.3',
      prevId: 'S3.1',
    })
    expectedSlides.set('S3.3', {
      id: 'S3.3',
      content: 'Content for 3.3',
      parentId: 'S3',
      childId: 'S3.3.1',
      nextId: 'S3.4',
      prevId: 'S3.2',
    })
    expectedSlides.set('S3.3.1', {
      id: 'S3.3.1',
      content: 'Content for 3.3.1',
      parentId: 'S3.3',
      childId: null,
      nextId: 'S3.3.2',
      prevId: null,
    })
    expectedSlides.set('S3.3.2', {
      id: 'S3.3.2',
      content: 'Content for 3.3.2',
      parentId: 'S3.3',
      childId: null,
      nextId: null,
      prevId: 'S3.3.1',
    })
    expectedSlides.set('S3.4', {
      id: 'S3.4',
      content: 'Content for 3.4',
      parentId: 'S3',
      childId: null,
      nextId: 'S3.5',
      prevId: 'S3.3',
    })
    expectedSlides.set('S3.5', {
      id: 'S3.5',
      content: 'Content for 3.5',
      parentId: 'S3',
      childId: null,
      nextId: null,
      prevId: 'S3.4',
    })

    expectedSlides.set('S4', {
      id: 'S4',
      content: 'Content for 4',
      parentId: null,
      childId: null,
      nextId: null,
      prevId: 'S3',
    })

    const expected: ParsedSlidesOutput = {
      rootSlideId: 'S1',
      slides: expectedSlides,
    }
    expect(parseSlides(mdx)).toEqual(expected)
  })

  it('should correctly parse sample-presentation.mdx content', () => {
    const mdxContent = `
--- 
title: Sample Presentation
description: A demonstration of the presentation slide system.
pubDate: 2023-01-01
tags: ["astro", "slides", "testing"]
---

{/* slide-start */}
# Welcome to Sample Presentation
This is the first slide.
{/* slide-end */}

{/* slide-start */}
## Second Slide
Content for the second slide.
{/* slide-end */}

{/* slide-start */}
## Slide with Nested Content
This slide contains other slides.
    {/* slide-start */}
    ### Nested Slide 1
    Content for 3.1
    {/* slide-end */}
    {/* slide-start */}
    ### Nested Slide 2
    Content for 3.2
    {/* slide-end */}
{/* slide-end */}

{/* slide-start */}
## Final Slide
The last slide in this presentation.
{/* slide-end */}
`
    const result = parseSlides(mdxContent)
    expect(result.rootSlideId).toBe('S1')
    expect(result.slides.size).toBe(6) // S1, S2, S3, S3.1, S3.2, S4
    expect(result.slides.has('S1')).toBe(true)
    expect(result.slides.get('S1')?.content).toContain('# Welcome to Sample Presentation')
  })
})
