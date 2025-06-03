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
  childLevel: number // 0 for not a child, 1+ for nested child levels
  isDelimiter: boolean
}

function splitContentByDelimiters(content: string): SlideContent[] {
  const lines = content.split('\n')
  const result: SlideContent[] = []
  let currentContent: string[] = []
  let nextChildLevel = 0

  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Check for different types of delimiters
    if (trimmedLine === '--->') {
      // If we have content, add it first
      if (currentContent.length > 0) {
        result.push({
          content: currentContent.join('\n'),
          childLevel: nextChildLevel,
          isDelimiter: false
        })
        currentContent = []
      }
      // Mark the next content as a level 1 child
      nextChildLevel = 1
    } else if (trimmedLine === '-->>') {
      // If we have content, add it first
      if (currentContent.length > 0) {
        result.push({
          content: currentContent.join('\n'),
          childLevel: nextChildLevel,
          isDelimiter: false
        })
        currentContent = []
      }
      // Mark the next content as a level 2 child
      nextChildLevel = 2
    } else if (trimmedLine === '---') {
      // If we have content, add it first
      if (currentContent.length > 0) {
        result.push({
          content: currentContent.join('\n'),
          childLevel: nextChildLevel,
          isDelimiter: false
        })
        currentContent = []
      }
      // Add a delimiter marker
      result.push({
        content: '',
        childLevel: 0,
        isDelimiter: true
      })
      nextChildLevel = 0
    } else {
      // Regular content line
      currentContent.push(line)
    }
  }

  // Add any remaining content
  if (currentContent.length > 0) {
    result.push({
      content: currentContent.join('\n').trim(),
      childLevel: nextChildLevel,
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
  const parentStack: { id: string; index: number; level: number }[] = []
  let topLevelSlideCount = 0
  let previousNode: SlideNode | null = null
  // Track top-level slides separately for navigation
  const topLevelSlides: { id: string; index: number }[] = []

  for (let i = 0; i < slideContents.length; i++) {
    const current = slideContents[i]
    
    // Skip delimiters, we only care about them for their effect on the next slide
    if (current.isDelimiter) {
      continue
    }

    // Create a new slide node
    const childLevel = current.childLevel
    
    // Determine slide ID and navigation
    let slideId: string
    let navigation: SlideNavigation
    let delimiterLevel: number = childLevel // Set delimiter level based on child level
    let isTopLevel = false
    
    if (childLevel > 0) {
      // Find the appropriate parent based on child level
      let parent = null
      
      // Look for the closest parent with a lower level
      for (let j = parentStack.length - 1; j >= 0; j--) {
        if (parentStack[j].level < childLevel) {
          parent = parentStack[j]
          break
        }
      }
      
      if (parent) {
        // This is a child slide
        slideId = `${parent.id}.C${slideNodes.filter(n => n.id.startsWith(parent.id + '.C')).length + 1}`
        
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
        
        // Update the parent stack for this new level
        // Remove any items at or above this level
        while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= childLevel) {
          parentStack.pop()
        }
      } else {
        // If no appropriate parent found, treat as a top-level slide
        slideId = `S${++topLevelSlideCount}`
        delimiterLevel = 0
        isTopLevel = true
        
        navigation = {
          parentSlideId: null,
          childSlideId: null,
          previousSlideId: previousNode?.id || null,
          nextSlideId: null
        }
        
        // Reset the parent stack for a new top-level slide
        parentStack.length = 0
      }
    } else {
      // This is a top-level slide
      slideId = `S${++topLevelSlideCount}`
      isTopLevel = true
      
      navigation = {
        parentSlideId: null,
        childSlideId: null,
        previousSlideId: previousNode?.id || null,
        nextSlideId: null
      }
      
      // Reset the parent stack for a new top-level slide
      parentStack.length = 0
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
    
    // Add this node to the parent stack if it could be a parent
    parentStack.push({ id: slideId, index: nodeIndex, level: childLevel })
    
    // Track top-level slides for navigation
    if (isTopLevel) {
      // If we have a previous top-level slide, set its next slide ID to this one
      // and set this slide's previous ID to the previous top-level slide
      if (topLevelSlides.length > 0) {
        const prevTopLevelIndex = topLevelSlides[topLevelSlides.length - 1].index;
        const prevTopLevelSlide = slideNodes[prevTopLevelIndex];
        
        // Update navigation links between top-level slides
        prevTopLevelSlide.navigation.nextSlideId = slideId;
        navigation.previousSlideId = prevTopLevelSlide.id;
      }
      topLevelSlides.push({ id: slideId, index: nodeIndex });
    }
    
    // Connect all level 1+ slides to the next top-level slide that will follow
    // This will be updated when we find the next top-level slide
    if (childLevel > 0 && i < slideContents.length - 1) {
      // Look ahead for the next top-level slide or delimiter
      for (let j = i + 1; j < slideContents.length; j++) {
        if (slideContents[j].childLevel === 0 || slideContents[j].isDelimiter) {
          // Found a top-level slide or delimiter, see if there's a regular slide after that
          for (let k = j; k < slideContents.length; k++) {
            if (!slideContents[k].isDelimiter && slideContents[k].childLevel === 0) {
              // This will be the next top-level slide
              // We'll set newNode.navigation.nextSlideId once we create that slide
              // For now, we'll use a placeholder based on the count
              newNode.navigation.nextSlideId = `S${topLevelSlideCount + 1}`;
              break;
            }
          }
          break;
        }
      }
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
