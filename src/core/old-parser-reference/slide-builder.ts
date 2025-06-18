import { SlideNode } from '../../types/slide'
import { SlideContent, SlideCreationContext, SlideIdInfo, GlobalContext } from './types'
import { findParent, incrementTopLevelCount, updateParentStack } from './context-manager'

/**
 * Create slide nodes from content segments
 */
export function createSlideNodes(
  slideContents: SlideContent[],
  creationContext: SlideCreationContext,
  globalContext: GlobalContext
): SlideNode[] {
  const slideNodes: SlideNode[] = []

  for (const content of slideContents) {
    const slideIdInfo = generateSlideId(content.childLevel, creationContext.inheritedNestingLevel, globalContext)
    const slideNode = createSlideNode(content.content, slideIdInfo, creationContext)

    slideNodes.push(slideNode)
    globalContext.slideNodes.push(slideNode)

    // Update parent stack for this slide
    updateParentStack(globalContext, slideIdInfo.id, slideIdInfo.level)

    // Set parent-child relationship
    if (slideIdInfo.parentId) {
      const parentNode =
        slideNodes.find(n => n.id === slideIdInfo.parentId) ||
        globalContext.slideNodes.find(n => n.id === slideIdInfo.parentId)
      if (parentNode && !parentNode.navigation.childSlideId) {
        parentNode.navigation.childSlideId = slideIdInfo.id
      }
    }
  }

  return slideNodes
}

/**
 * Generate unique slide IDs based on hierarchy and context
 */
export function generateSlideId(
  childLevel: number,
  inheritedNestingLevel: number,
  globalContext: GlobalContext
): SlideIdInfo {
  const absoluteLevel = childLevel + inheritedNestingLevel
  const isTopLevel = absoluteLevel === inheritedNestingLevel
  let slideId: string
  let parentId: string | null = null

  // Initialize the childIdCounters map if it doesn't exist
  if (!globalContext.childIdCounters) {
    globalContext.childIdCounters = new Map<string, number>()
  }

  if (isTopLevel && inheritedNestingLevel === 0) {
    slideId = `S${incrementTopLevelCount(globalContext)}`
    // Clear parent stack when returning to top level
    globalContext.globalParentStack.length = 0
  } else {
    const parent = findParent(globalContext.globalParentStack, absoluteLevel)
    if (parent) {
      // Get or initialize counter for this parent
      const currentCount = globalContext.childIdCounters.get(parent.id) || 0
      const nextCount = currentCount + 1
      globalContext.childIdCounters.set(parent.id, nextCount)
      
      slideId = `${parent.id}C${nextCount}`
      parentId = parent.id
    } else {
      slideId = `S${incrementTopLevelCount(globalContext)}`
    }

    // Clean up deeper levels in parent stack
    while (
      globalContext.globalParentStack.length &&
      globalContext.globalParentStack[globalContext.globalParentStack.length - 1].level >= absoluteLevel
    ) {
      globalContext.globalParentStack.pop()
    }
  }

  return {
    id: slideId,
    parentId,
    level: absoluteLevel,
  }
}

/**
 * Create a complete SlideNode with all required properties
 */
export function createSlideNode(
  content: string,
  slideIdInfo: SlideIdInfo,
  creationContext: SlideCreationContext
): SlideNode {
  return {
    id: slideIdInfo.id,
    url: `/${creationContext.presentationName}/${slideIdInfo.id}`,
    content,
    navigation: {
      parentSlideId: slideIdInfo.parentId,
      childSlideId: null,
      previousSlideId: null,
      nextSlideId: null,
    },
    fragmentId: creationContext.fragment.id,
    userDefinedFrontMatter: {},
    delimiterLevel: slideIdInfo.level,
  }
}
