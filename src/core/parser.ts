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
interface SlideContent {
  content: string
  isChild: boolean
  isDelimiter: boolean
}

function splitContentByDelimiters(content: string): SlideContent[] {
  const lines = content.split('\n')
  const result: SlideContent[] = []
  let currentContent: string[] = []
  let isNextChild = false

  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (trimmedLine === '--->') {
      // If we have content, add it first
      if (currentContent.length > 0) {
        result.push({
          content: currentContent.join('\n'),
          isChild: isNextChild,
          isDelimiter: false
        })
        currentContent = []
      }
      // Mark the next content as a child
      isNextChild = true
    } else if (trimmedLine === '---') {
      // If we have content, add it first
      if (currentContent.length > 0) {
        result.push({
          content: currentContent.join('\n'),
          isChild: isNextChild,
          isDelimiter: false
        })
        currentContent = []
      }
      // Add a delimiter marker
      result.push({
        content: '',
        isChild: false,
        isDelimiter: true
      })
      isNextChild = false
    } else {
      // Regular content line
      currentContent.push(line)
    }
  }

  // Add any remaining content
  if (currentContent.length > 0) {
    result.push({
      content: currentContent.join('\n').trim(),
      isChild: isNextChild,
      isDelimiter: false
    })
  }

  // Filter out empty content (but keep delimiters)
  return result.filter(slide => slide.isDelimiter || slide.content.trim() !== '')
}

/**
 * Create slide nodes from content segments
 */
function createSlideNodes(slideContents: SlideContent[], fragment: Fragment, presentationName: string): SlideNode[] {
  const slideNodes: SlideNode[] = []
  const parentStack: { id: string; index: number }[] = []
  let topLevelSlideCount = 0
  let previousNode: SlideNode | null = null

  for (let i = 0; i < slideContents.length; i++) {
    const current = slideContents[i]
    
    // Skip delimiters, we only care about them for their effect on the next slide
    if (current.isDelimiter) {
      continue
    }

    // Create a new slide node
    const isChild = current.isChild
    const parent = parentStack[parentStack.length - 1]
    
    // Determine slide ID and navigation
    let slideId: string
    let navigation: SlideNavigation
    let delimiterLevel: number
    
    if (isChild && parent) {
      // This is a child slide
      slideId = `${parent.id}.C${slideNodes.filter(n => n.id.startsWith(parent.id + '.C')).length + 1}`
      delimiterLevel = 1
      
      navigation = {
        parentSlideId: parent.id,
        childSlideId: null,
        previousSlideId: null,
        nextSlideId: null
      }
      
      // Update parent's child reference
      const parentNode = slideNodes[parent.index]
      if (parentNode) {
        parentNode.navigation.childSlideId = slideId
      }
    } else {
      // This is a top-level slide
      slideId = `S${++topLevelSlideCount}`
      delimiterLevel = 0
      
      navigation = {
        parentSlideId: null,
        childSlideId: null,
        previousSlideId: previousNode?.id || null,
        nextSlideId: null
      }
      
      // Update previous node's next reference if it exists and isn't a parent with a child
      if (previousNode && !previousNode.navigation.childSlideId) {
        previousNode.navigation.nextSlideId = slideId
      }
      
      // Reset the parent stack for a new top-level slide
      parentStack.length = 0
      parentStack.push({ id: slideId, index: slideNodes.length })
    }
    
    // Create the new slide node
    const newNode: SlideNode = {
      id: slideId,
      url: `/${presentationName}/${slideId}`,
      content: current.content,
      navigation,
      fragmentId: fragment.id,
      userDefinedFrontMatter: {},
      delimiterLevel
    }
    
    // Add to our list of nodes
    const nodeIndex = slideNodes.push(newNode) - 1
    previousNode = newNode
    
    // If this is a top-level slide, update the parent stack
    if (delimiterLevel === 0) {
      parentStack[0] = { id: slideId, index: nodeIndex }
    }
  }

  return slideNodes
}

/**
 * Create navigation links for a slide based on its position
 */
// Navigation is now created inline in createSlideNodes
// This function is no longer needed

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
