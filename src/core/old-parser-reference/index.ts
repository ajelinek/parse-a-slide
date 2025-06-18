/**
 * PARSER ORCHESTRATION - HIGH-LEVEL FLOW
 * =====================================
 *
 * This module orchestrates the parsing of presentations into slide nodes through a structured pipeline:
 *
 * 1. **ENTRY VALIDATION**
 *    - Validate presentation structure and locate entry fragment
 *    - Create fragment map for efficient lookups during processing
 *
 * 2. **CONTENT SPLITTING** (content-splitter.ts)
 *    - Split fragment content by delimiters (---) into slide sections
 *    - Determine nesting levels and hierarchy structure
 *
 * 3. **FRAGMENT PROCESSING** (fragment-resolver.ts)
 *    - Detect fragment references like `@./other-fragment.md`
 *    - Resolve relative paths and handle circular reference detection
 *    - Recursively embed referenced fragments with proper nesting
 *
 * 4. **CONTENT BUFFERING** (content-processor.ts)
 *    - Buffer non-fragment content for slide creation
 *    - Flush buffers when fragment references are encountered
 *    - Manage slide node accumulation and retrieval
 *
 * 5. **SLIDE CREATION** (slide-builder.ts)
 *    - Generate unique slide IDs based on hierarchy
 *    - Create slide nodes with proper metadata and nesting levels
 *    - Apply fragment substitution naming for embedded fragments
 *
 * 6. **NAVIGATION LINKING** (navigation-linker.ts)
 *    - Establish parent-child relationships between slides
 *    - Link sequential navigation (previous/next) within hierarchy levels
 *    - Handle complex navigation scenarios across nesting levels
 *
 * 7. **PROCESSOR PIPELINE** (processor-pipeline.ts)
 *    - Apply optional processors to transform slide content
 *    - Validate processor results and handle errors
 *
 * CONTEXT MANAGEMENT (context-manager.ts):
 * - Global context tracks state across all fragments
 * - Parent stack maintains hierarchy during recursive processing
 * - Circular reference detection prevents infinite loops
 *
 * ERROR HANDLING:
 * - Result types for safe error propagation
 * - Graceful handling of missing fragments with warnings
 * - Validation of presentation structure before processing
 */

import { Result } from 'neverthrow'
import { Fragment, Presentation } from '../../types/presentation'
import { Processor } from '../../types/processor'
import { SlideNode } from '../../types/slide'
import { AppError, ErrorCode, createError, err, ok } from '../../utils/error'
import { ContentProcessor, createContentProcessor } from './content-processor'
import { splitContentByDelimiters } from './content-splitter'
import { createGlobalContext } from './context-manager'
import { applyFragmentSubstitutionNaming, extractFragmentReference, resolveFragmentPath } from './fragment-resolver'
import { connectNavigationLinks } from './navigation-linker'
import { applyProcessors } from './processor-pipeline'
import { GlobalContext, SlideContent } from './types'

/**
 * Parse a presentation into a list of slide nodes.
 * @param presentation The presentation to parse
 * @param processors Optional array of processors to apply to each slide node
 * @returns A Result containing an array of slide nodes or an error
 */
export function parse(presentation: Presentation, processors: Processor[] = []): Result<SlideNode[], AppError> {
  const entryFragmentResult = validatePresentation(presentation)
  if (entryFragmentResult.isErr()) {
    return err(entryFragmentResult.error)
  }

  const fragmentMap = createFragmentMap(presentation.fragments)

  try {
    const globalContext = createGlobalContext()
    const slideNodes = parseFragmentContent(
      entryFragmentResult.value,
      fragmentMap,
      presentation.metadata.name,
      new Set(),
      0,
      globalContext
    )

    return applyProcessors(slideNodes, processors)
  } catch (error) {
    return err(handleParserError(error))
  }
}

/**
 * Validate presentation structure and return entry fragment
 */
export function validatePresentation(presentation: Presentation): Result<Fragment, AppError> {
  const entryFragment = presentation.fragments.find(fragment => fragment.isEntry)
  if (!entryFragment) {
    return err(createError('No entry fragment found', ErrorCode.NO_ENTRY_FRAGMENT))
  }
  return ok(entryFragment)
}

function parseFragmentContent(
  fragment: Fragment,
  fragmentMap: Map<string, Fragment>,
  presentationName: string,
  processedFragments: Set<string>,
  inheritedNestingLevel: number,
  globalContext: GlobalContext
): SlideNode[] {
  const slideContents = splitContentByDelimiters(fragment.content)
  const visitedFragments = new Set(processedFragments)
  const contentProcessor = createContentProcessor(fragment, presentationName, inheritedNestingLevel, globalContext)

  for (const section of slideContents) {
    const content = section.content.trim()
    const fragmentRef = extractFragmentReference(content)

    if (isStandaloneFragmentReference(fragmentRef, content)) {
      contentProcessor.flushBuffer()
      processFragmentReference(
        fragmentRef!,
        section,
        fragment,
        fragmentMap,
        presentationName,
        visitedFragments,
        inheritedNestingLevel,
        globalContext,
        contentProcessor
      )
    } else {
      contentProcessor.addToBuffer(section)
    }
  }

  contentProcessor.flushBuffer()
  connectNavigationLinks(contentProcessor.getSlideNodes())
  return contentProcessor.getSlideNodes()
}

function createFragmentMap(fragments: Fragment[]): Map<string, Fragment> {
  const fragmentMap = new Map<string, Fragment>()
  for (const fragment of fragments) {
    fragmentMap.set(fragment.relativePath, fragment)
  }
  return fragmentMap
}

function handleParserError(error: unknown): AppError {
  if (error instanceof Error && 'code' in error) {
    return error as AppError
  }
  return createError(error instanceof Error ? error.message : String(error), ErrorCode.PARSER_ERROR)
}

function isStandaloneFragmentReference(fragmentRef: any, content: string): boolean {
  return fragmentRef && content === fragmentRef.fullMatch
}

function processFragmentReference(
  fragmentRef: any,
  section: SlideContent,
  currentFragment: Fragment,
  fragmentMap: Map<string, Fragment>,
  presentationName: string,
  visitedFragments: Set<string>,
  inheritedNestingLevel: number,
  globalContext: GlobalContext,
  contentProcessor: ContentProcessor
): void {
  const referencedPath = resolveFragmentPath(fragmentRef.path, currentFragment.relativePath)

  if (isCircularReference(visitedFragments, referencedPath)) {
    throw createError('Circular reference detected', ErrorCode.PARSER_CIRCULAR_REFERENCE)
  }

  if (!fragmentMap.has(referencedPath)) {
    handleMissingFragment(fragmentRef.path, section, contentProcessor)
    return
  }

  if (visitedFragments.has(referencedPath)) {
    return
  }

  processEmbeddedFragment(
    fragmentMap.get(referencedPath)!,
    section,
    currentFragment,
    fragmentMap,
    presentationName,
    visitedFragments,
    inheritedNestingLevel,
    globalContext,
    contentProcessor
  )
}

function isCircularReference(visitedFragments: Set<string>, referencedPath: string): boolean {
  return visitedFragments.has(referencedPath)
}

function handleMissingFragment(fragmentPath: string, section: SlideContent, contentProcessor: ContentProcessor): void {
  console.warn(`Fragment reference '${fragmentPath}' not found. Skipping.`)
  contentProcessor.addToBuffer(section)
}

function processEmbeddedFragment(
  referencedFragment: Fragment,
  section: SlideContent,
  currentFragment: Fragment,
  fragmentMap: Map<string, Fragment>,
  presentationName: string,
  visitedFragments: Set<string>,
  inheritedNestingLevel: number,
  globalContext: GlobalContext,
  contentProcessor: ContentProcessor
): void {
  visitedFragments.add(referencedFragment.relativePath)

  const slideBeforeFragmentRef = contentProcessor.getLastSlideNode()
  const embeddingLevel = section.childLevel + inheritedNestingLevel

  const embeddedNodes = parseFragmentContent(
    referencedFragment,
    fragmentMap,
    presentationName,
    visitedFragments,
    embeddingLevel,
    globalContext
  )

  adjustEmbeddedNodeLevels(embeddedNodes, embeddingLevel)

  if (section.childLevel === 0) {
    applySiblingFragmentNaming(
      embeddedNodes,
      slideBeforeFragmentRef,
      embeddingLevel,
      presentationName,
      currentFragment.id,
      globalContext
    )
  }

  updateFragmentOrigin(embeddedNodes, currentFragment.id)
  contentProcessor.addSlideNodes(embeddedNodes)
  visitedFragments.delete(referencedFragment.relativePath)
}

function adjustEmbeddedNodeLevels(embeddedNodes: SlideNode[], embeddingLevel: number): void {
  embeddedNodes.forEach(node => {
    const relativeLevel = node.delimiterLevel - embeddingLevel
    if (relativeLevel > 0) {
      node.delimiterLevel = embeddingLevel
    }
  })
}

function applySiblingFragmentNaming(
  embeddedNodes: SlideNode[],
  slideBeforeFragmentRef: SlideNode | null,
  embeddingLevel: number,
  presentationName: string,
  currentFragmentId: string,
  globalContext: GlobalContext
): void {
  const baseSlideId = slideBeforeFragmentRef ? slideBeforeFragmentRef.id : 'S0'

  const topLevelSlidesCount = embeddedNodes.filter(
    node => node.delimiterLevel === 0 || node.delimiterLevel === embeddingLevel
  ).length

  globalContext.globalTopLevelCount -= topLevelSlidesCount
  applyFragmentSubstitutionNaming(embeddedNodes, baseSlideId, embeddingLevel, presentationName, currentFragmentId)
}

function updateFragmentOrigin(embeddedNodes: SlideNode[], fragmentId: string): void {
  embeddedNodes.forEach(node => {
    node.fragmentId = fragmentId
  })
}
