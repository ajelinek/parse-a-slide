import { SlideNode } from '../../types/slide'
import { NavigationContext } from './types'

/**
 * Establish all navigation relationships between slides
 */
export function connectNavigationLinks(slideNodes: SlideNode[]): void {
  const context = createNavigationContext(slideNodes)

  linkParentChildRelationships(slideNodes, context)
  linkSameParentSiblings(slideNodes, context)
  linkSequentialSlides(slideNodes, context)
  finalizeNavigationLinks(slideNodes, context)
}

/**
 * Create navigation context maps for efficient lookups
 */
function createNavigationContext(slideNodes: SlideNode[]): NavigationContext {
  const slideMap = new Map<string, SlideNode>()
  const hierarchyLevels = new Map<number, SlideNode[]>()
  const parentChildMap = new Map<string, string[]>()
  const siblingGroups = new Map<string, SlideNode[]>()

  for (const slide of slideNodes) {
    slideMap.set(slide.id, slide)

    if (!hierarchyLevels.has(slide.delimiterLevel)) {
      hierarchyLevels.set(slide.delimiterLevel, [])
    }
    hierarchyLevels.get(slide.delimiterLevel)!.push(slide)

    if (slide.navigation.parentSlideId) {
      if (!parentChildMap.has(slide.navigation.parentSlideId)) {
        parentChildMap.set(slide.navigation.parentSlideId, [])
      }
      parentChildMap.get(slide.navigation.parentSlideId)!.push(slide.id)
      
      // Group slides by their parent for sibling linking
      const parentKey = slide.navigation.parentSlideId
      if (!siblingGroups.has(parentKey)) {
        siblingGroups.set(parentKey, [])
      }
      siblingGroups.get(parentKey)!.push(slide)
    }
  }

  return { slideMap, hierarchyLevels, parentChildMap, siblingGroups }
}

/**
 * Establish parent-child navigation relationships
 */
export function linkParentChildRelationships(slideNodes: SlideNode[], context: NavigationContext): void {
  // Set parent-child navigation first
  for (const node of slideNodes) {
    if (node.navigation.parentSlideId) {
      const parentNode = context.slideMap.get(node.navigation.parentSlideId)
      if (parentNode && !parentNode.navigation.childSlideId) {
        parentNode.navigation.childSlideId = node.id
      }
    }
  }
}

/**
 * Link slides with the same parent (siblings) together
 */
export function linkSameParentSiblings(slideNodes: SlideNode[], context: NavigationContext): void {
  // Connect siblings with the same parent
  for (const [parentId, siblings] of context.siblingGroups.entries()) {
    // Sort siblings by their ID using natural sort (S1C1, S1C2, etc.)
    siblings.sort((a, b) => {
      // Extract numbers from ID to ensure proper numeric sorting
      const getNumber = (id: string) => {
        const match = id.match(/C(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      }
      return getNumber(a.id) - getNumber(b.id)
    })
    
    // Link siblings sequentially
    for (let i = 0; i < siblings.length - 1; i++) {
      const current = siblings[i]
      const next = siblings[i + 1]
      
      current.navigation.nextSlideId = next.id
      next.navigation.previousSlideId = current.id
    }
  }
}

/**
 * Link slides in sequential order (previous/next)
 */
export function linkSequentialSlides(slideNodes: SlideNode[], context: NavigationContext): void {
  // First pass: Set basic previous/next navigation between consecutive slides
  for (let i = 0; i < slideNodes.length - 1; i++) {
    const current = slideNodes[i]
    const next = slideNodes[i + 1]

    // Handle child slides with the same parent (siblings)
    if (current.navigation.parentSlideId && next.navigation.parentSlideId) {
      // Both are child slides - check if they share the same parent
      if (current.navigation.parentSlideId === next.navigation.parentSlideId) {
        // Sequential child slides - link them together
        current.navigation.nextSlideId = next.id
        next.navigation.previousSlideId = current.id
      }
      // Handle child slides at the same hierarchy level but with different parents
      else if (current.delimiterLevel === next.delimiterLevel) {
        // Check if next slide ID follows the pattern of being a sibling in sequence
        if (current.id.replace(/C\d+$/, '') === next.id.replace(/C\d+$/, '')) {
          current.navigation.nextSlideId = next.id
          next.navigation.previousSlideId = current.id
        }
      }
    }

    // Handle embedded fragment slides (FS notation)
    if (current.id.includes('FS') && next.id.includes('FS')) {
      // Within embedded slides, link sequentially
      next.navigation.previousSlideId = current.id
      current.navigation.nextSlideId = next.id
    } else if (!current.id.includes('FS') && next.id.includes('FS')) {
      // First embedded slide links to the slide before the embedding
      next.navigation.previousSlideId = current.id
    }

    // Set navigation for top-level slides
    if (next.navigation.parentSlideId === null) {
      // Find the previous top-level slide for the next slide
      if (!next.navigation.previousSlideId) {
        for (let j = i; j >= 0; j--) {
          const candidate = slideNodes[j]
          if (candidate.navigation.parentSlideId === null && !candidate.id.includes('FS')) {
            next.navigation.previousSlideId = candidate.id
            break
          }
        }
      }
    }

    // Set next links for top-level slides without children
    if (
      current.navigation.parentSlideId === null &&
      !current.navigation.childSlideId &&
      !current.navigation.nextSlideId &&
      !current.id.includes('FS')
    ) {
      current.navigation.nextSlideId = next.id
    }
  }

  // Second pass: Set navigation for parent slides with children
  const topLevelSlides = slideNodes.filter(n => !n.navigation.parentSlideId)
  for (let i = 0; i < topLevelSlides.length - 1; i++) {
    const current = topLevelSlides[i]
    const next = topLevelSlides[i + 1]

    if (current.navigation.childSlideId) {
      current.navigation.nextSlideId = next.id
    }
  }
}

/**
 * Perform final navigation link adjustments
 */
export function finalizeNavigationLinks(slideNodes: SlideNode[], context: NavigationContext): void {
  // Third pass: Set child slides to link to parent's next slide
  for (const node of slideNodes) {
    if (node.navigation.parentSlideId && !node.navigation.nextSlideId) {
      const rootParent = findRootParent(node, context.slideMap)
      if (rootParent && rootParent.navigation.nextSlideId) {
        node.navigation.nextSlideId = rootParent.navigation.nextSlideId
      }
    }
  }

  // Final pass: Restore correct navigation for embedded slides (FS notation)
  for (let i = 0; i < slideNodes.length; i++) {
    const current = slideNodes[i]
    if (current.id.includes('FS') && !current.navigation.nextSlideId) {
      const next = i < slideNodes.length - 1 ? slideNodes[i + 1] : null
      if (next) {
        current.navigation.nextSlideId = next.id
      }
    }
  }
}

/**
 * Find the top-level parent of a nested slide
 */
export function findRootParent(slideNode: SlideNode, slideMap: Map<string, SlideNode>): SlideNode | null {
  let current = slideNode
  while (current.navigation.parentSlideId) {
    const parent = slideMap.get(current.navigation.parentSlideId)
    if (!parent) break
    current = parent
  }
  return current === slideNode ? null : current
}
