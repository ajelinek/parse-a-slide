import { Fragment, Presentation } from '../../types/presentation'
import { SlideNode } from '../../types/slide'
import { splitContentByDelimiters } from './content-splitter'
import { extractFragmentReference, resolveFragmentPath } from './fragment-resolver'
import { createSlideNodes } from './slide-builder'
import { connectNavigationLinks } from './navigation-linker'
import { createGlobalContext } from './context-manager'
import { SlideContent, GlobalContext } from './types'

/**
 * SPLICE-BASED PARSER - IN-PLACE EXPANSION
 * =======================================
 *
 * This approach maintains a single working array and expands fragments
 * in-place at their discovery position, eliminating recursion and complex
 * state management.
 *
 * Key concept: [c1, @fragment, c3] becomes [c1, frag1, frag2, c3]
 */

interface WorkingSlide {
  content: SlideContent
  sourceFragmentId: string
  inheritedNestingLevel: number
  isProcessed: boolean
}

interface ProcessingContext {
  fragmentMap: Map<string, Fragment>
  presentationName: string
  globalContext: GlobalContext
  visitedFragments: Set<string>
  processingStack: string[] // Track expansion chain for circular detection
}

export function parseSplice(presentation: Presentation): SlideNode[] {
  const entryFragment = presentation.fragments.find(fragment => fragment.isEntry)
  if (!entryFragment) {
    throw new Error('No entry fragment found')
  }

  const context: ProcessingContext = {
    fragmentMap: createFragmentMap(presentation.fragments),
    presentationName: presentation.metadata.name,
    globalContext: createGlobalContext(),
    visitedFragments: new Set(),
    processingStack: [],
  }

  // Start with entry fragment content as working array
  const workingSlides = initializeWorkingSlides(entryFragment)

  // Expand fragments in-place until no more fragments exist
  expandAllFragments(workingSlides, context)

  // Convert working slides to actual slide nodes
  const slideNodes = createFinalSlideNodes(workingSlides, context)

  // Apply navigation linking once at the end
  connectNavigationLinks(slideNodes)
  return slideNodes
}

function initializeWorkingSlides(fragment: Fragment): WorkingSlide[] {
  const slideContents = splitContentByDelimiters(fragment.content)
  return slideContents.map(content => ({
    content,
    sourceFragmentId: fragment.id,
    inheritedNestingLevel: 0,
    isProcessed: false,
  }))
}

function expandAllFragments(workingSlides: WorkingSlide[], context: ProcessingContext): void {
  let i = 0

  while (i < workingSlides.length) {
    const slide = workingSlides[i]

    if (!slide.isProcessed) {
      const fragmentRef = extractFragmentReference(slide.content.content.trim())

      if (isStandaloneFragmentReference(fragmentRef, slide.content.content.trim())) {
        // Attempt to expand this fragment in-place
        const expanded = expandFragmentAtPosition(slide, fragmentRef!, context)

        if (expanded.length > 0) {
          // Replace current slide with expanded content
          workingSlides.splice(i, 1, ...expanded)
          // Don't increment i - process the newly inserted slides
          continue
        } else {
          // Fragment couldn't be expanded (missing, circular, etc.)
          slide.isProcessed = true
        }
      } else {
        // Regular content slide - mark as processed
        slide.isProcessed = true
      }
    }

    i++
  }
}

function expandFragmentAtPosition(
  currentSlide: WorkingSlide,
  fragmentRef: any,
  context: ProcessingContext
): WorkingSlide[] {
  const referencedPath = resolveFragmentPath(fragmentRef.path, 'current-fragment-path')

  // Check for circular references using processing stack
  if (context.processingStack.includes(referencedPath)) {
    console.warn(`Circular reference detected: ${referencedPath}`)
    return []
  }

  // Check if fragment exists
  if (!context.fragmentMap.has(referencedPath)) {
    console.warn(`Fragment not found: ${fragmentRef.path}`)
    return []
  }

  // Add to processing stack and expand
  context.processingStack.push(referencedPath)

  const referencedFragment = context.fragmentMap.get(referencedPath)!
  const fragmentContent = splitContentByDelimiters(referencedFragment.content)

  const embeddingLevel = currentSlide.content.childLevel + currentSlide.inheritedNestingLevel

  const expandedSlides: WorkingSlide[] = fragmentContent.map(content => ({
    content,
    sourceFragmentId: referencedFragment.id,
    inheritedNestingLevel: embeddingLevel,
    isProcessed: false, // These might contain more fragments to expand
  }))

  // Remove from processing stack
  context.processingStack.pop()

  return expandedSlides
}

function createFinalSlideNodes(workingSlides: WorkingSlide[], context: ProcessingContext): SlideNode[] {
  const slideNodes: SlideNode[] = []

  // Group consecutive slides from same fragment
  let currentGroup: SlideContent[] = []
  let currentFragmentId = ''
  let currentNestingLevel = 0

  for (const workingSlide of workingSlides) {
    if (
      workingSlide.sourceFragmentId !== currentFragmentId ||
      workingSlide.inheritedNestingLevel !== currentNestingLevel
    ) {
      // Flush current group
      if (currentGroup.length > 0) {
        const groupSlides = createSlidesFromGroup(currentGroup, currentFragmentId, currentNestingLevel, context)
        slideNodes.push(...groupSlides)
        currentGroup = []
      }

      currentFragmentId = workingSlide.sourceFragmentId
      currentNestingLevel = workingSlide.inheritedNestingLevel
    }

    currentGroup.push(workingSlide.content)
  }

  // Flush final group
  if (currentGroup.length > 0) {
    const groupSlides = createSlidesFromGroup(currentGroup, currentFragmentId, currentNestingLevel, context)
    slideNodes.push(...groupSlides)
  }

  return slideNodes
}

function createSlidesFromGroup(
  slideContent: SlideContent[],
  fragmentId: string,
  inheritedNestingLevel: number,
  context: ProcessingContext
): SlideNode[] {
  const fragment = Array.from(context.fragmentMap.values()).find(f => f.id === fragmentId)!

  const creationContext = {
    presentationName: context.presentationName,
    fragment,
    inheritedNestingLevel,
  }

  return createSlideNodes(slideContent, creationContext, context.globalContext)
}

function createFragmentMap(fragments: Fragment[]): Map<string, Fragment> {
  const fragmentMap = new Map<string, Fragment>()
  for (const fragment of fragments) {
    fragmentMap.set(fragment.relativePath, fragment)
  }
  return fragmentMap
}

function isStandaloneFragmentReference(fragmentRef: any, content: string): boolean {
  return fragmentRef && content === fragmentRef.fullMatch
}
