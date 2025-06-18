import { Fragment, Presentation } from '../../types/presentation'
import { SlideNode } from '../../types/slide'
import { splitContentByDelimiters } from './content-splitter'
import { extractFragmentReference, resolveFragmentPath } from './fragment-resolver'
import { createSlideNodes } from './slide-builder'
import { connectNavigationLinks } from './navigation-linker'
import { createGlobalContext } from './context-manager'
import { SlideContent, SlideCreationContext, GlobalContext } from './types'

/**
 * Simplified parser that eliminates complex buffering logic
 *
 * Key simplifications:
 * 1. No ContentProcessor abstraction
 * 2. No buffer management - create slides immediately
 * 3. Direct array accumulation of slide nodes
 * 4. Navigation linking only at the very end
 */

export function parseSimplified(presentation: Presentation): SlideNode[] {
  const entryFragment = presentation.fragments.find(fragment => fragment.isEntry)
  if (!entryFragment) {
    throw new Error('No entry fragment found')
  }

  const fragmentMap = createFragmentMap(presentation.fragments)
  const globalContext = createGlobalContext()

  const allSlideNodes = parseFragmentContentSimplified(
    entryFragment,
    fragmentMap,
    presentation.metadata.name,
    new Set(),
    0,
    globalContext
  )

  // Apply navigation linking once at the end
  connectNavigationLinks(allSlideNodes)
  return allSlideNodes
}

function parseFragmentContentSimplified(
  fragment: Fragment,
  fragmentMap: Map<string, Fragment>,
  presentationName: string,
  visitedFragments: Set<string>,
  inheritedNestingLevel: number,
  globalContext: GlobalContext
): SlideNode[] {
  const slideContents = splitContentByDelimiters(fragment.content)
  const allSlideNodes: SlideNode[] = []
  const currentSlideContent: SlideContent[] = []

  for (const section of slideContents) {
    const content = section.content.trim()
    const fragmentRef = extractFragmentReference(content)

    if (isStandaloneFragmentReference(fragmentRef, content)) {
      // Create slides from accumulated content before processing fragment
      if (currentSlideContent.length > 0) {
        const slides = createSlidesFromContent(
          currentSlideContent.splice(0, currentSlideContent.length),
          fragment,
          presentationName,
          inheritedNestingLevel,
          globalContext
        )
        allSlideNodes.push(...slides)
      }

      // Process embedded fragment recursively
      const embeddedNodes = processFragmentReferenceSimplified(
        fragmentRef!,
        section,
        fragment,
        fragmentMap,
        presentationName,
        visitedFragments,
        inheritedNestingLevel,
        globalContext
      )

      allSlideNodes.push(...embeddedNodes)
    } else {
      // Accumulate content for next slide
      currentSlideContent.push(section)
    }
  }

  // Create slides from any remaining content
  if (currentSlideContent.length > 0) {
    const slides = createSlidesFromContent(
      currentSlideContent,
      fragment,
      presentationName,
      inheritedNestingLevel,
      globalContext
    )
    allSlideNodes.push(...slides)
  }

  return allSlideNodes
}

function createSlidesFromContent(
  slideContent: SlideContent[],
  fragment: Fragment,
  presentationName: string,
  inheritedNestingLevel: number,
  globalContext: GlobalContext
): SlideNode[] {
  const creationContext: SlideCreationContext = {
    presentationName,
    fragment,
    inheritedNestingLevel,
  }
  return createSlideNodes(slideContent, creationContext, globalContext)
}

function processFragmentReferenceSimplified(
  fragmentRef: any,
  section: SlideContent,
  currentFragment: Fragment,
  fragmentMap: Map<string, Fragment>,
  presentationName: string,
  visitedFragments: Set<string>,
  inheritedNestingLevel: number,
  globalContext: GlobalContext
): SlideNode[] {
  const referencedPath = resolveFragmentPath(fragmentRef.path, currentFragment.relativePath)

  // Handle missing or circular references
  if (!fragmentMap.has(referencedPath) || visitedFragments.has(referencedPath)) {
    console.warn(`Fragment reference issue: ${fragmentRef.path}`)
    return []
  }

  // Process the referenced fragment recursively
  visitedFragments.add(referencedPath)
  const embeddingLevel = section.childLevel + inheritedNestingLevel

  const embeddedNodes = parseFragmentContentSimplified(
    fragmentMap.get(referencedPath)!,
    fragmentMap,
    presentationName,
    visitedFragments,
    embeddingLevel,
    globalContext
  )

  visitedFragments.delete(referencedPath)
  return embeddedNodes
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
