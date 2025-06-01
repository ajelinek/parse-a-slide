import { Result } from 'neverthrow'
import { Fragment, Presentation } from '../types/presentation'
import { Processor } from '../types/processor'
import { SlideNode, SlideNavigation } from '../types/slide'
import { AppError, ErrorCode, createError, ok, err } from '../utils/error'

/**
 * Parse a presentation into a list of slide nodes.
 * @param presentation The presentation to parse
 * @param processors Optional array of processors to apply to each slide node
 * @returns A Result containing an array of slide nodes or an error
 */
export function parse(presentation: Presentation, processors: Processor[] = []): Result<SlideNode[], AppError> {
  // Find the entry fragment
  const entryFragment = presentation.fragments.find(fragment => fragment.isEntry)
  if (!entryFragment) {
    return err(createError('No entry fragment found', ErrorCode.NO_ENTRY_FRAGMENT))
  }

  // Split the content into slides and parse them
  const slideContents = splitContentByDelimiters(entryFragment.content)
  const slideNodes = createSlideNodes(slideContents, entryFragment, presentation.metadata.name)

  // Apply processors to all slide nodes
  const processedNodes = applyProcessors(slideNodes, processors)
  if (processedNodes.isErr()) {
    return processedNodes
  }

  return ok(processedNodes.value)
}

/**
 * Split slide content by delimiters and filter out empty slides
 */
function splitContentByDelimiters(content: string): string[] {
  return content
    .split(/^---$/m)
    .map(slide => slide.trim())
    .filter(Boolean) // Remove empty slides
}

/**
 * Create slide nodes from content segments
 */
function createSlideNodes(slideContents: string[], fragment: Fragment, presentationName: string): SlideNode[] {
  const slideNodes: SlideNode[] = []

  for (let i = 0; i < slideContents.length; i++) {
    const slideId = `S${i + 1}`
    const navigation = createNavigation(i, slideContents.length)

    const slideNode: SlideNode = {
      id: slideId,
      url: `/${presentationName}/${slideId}`,
      content: slideContents[i],
      navigation,
      fragmentId: fragment.id,
      userDefinedFrontMatter: {}, // Empty object for frontmatter (could be populated by a processor)
    }

    slideNodes.push(slideNode)
  }

  return slideNodes
}

/**
 * Create navigation links for a slide based on its position
 */
function createNavigation(index: number, totalSlides: number): SlideNavigation {
  return {
    parentSlideId: null,
    childSlideId: null,
    previousSlideId: index > 0 ? `S${index}` : null,
    nextSlideId: index < totalSlides - 1 ? `S${index + 2}` : null,
  }
}

/**
 * Apply processors to all slide nodes
 */
function applyProcessors(slideNodes: SlideNode[], processors: Processor[]): Result<SlideNode[], AppError> {
  if (processors.length === 0) {
    return ok(slideNodes)
  }

  const processedNodes: SlideNode[] = []

  for (const node of slideNodes) {
    let processedNode = node

    for (const processor of processors) {
      const result = processor.process(processedNode)
      if (result.isErr()) {
        return err(result.error)
      }
      processedNode = result.value
    }

    processedNodes.push(processedNode)
  }

  return ok(processedNodes)
}
