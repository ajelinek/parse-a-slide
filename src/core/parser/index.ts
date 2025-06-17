import { Result } from 'neverthrow'
import { Fragment, Presentation } from '../../types/presentation'
import { Processor } from '../../types/processor'
import { SlideNode } from '../../types/slide'
import { AppError, ErrorCode, createError, ok, err } from '../../utils/error'
import { splitContentByDelimiters } from './content-splitter'
import { extractFragmentReference, resolveFragmentPath, applyFragmentSubstitutionNaming } from './fragment-resolver'
import { createSlideNodes } from './slide-builder'
import { connectNavigationLinks } from './navigation-linker'
import { createGlobalContext, pushFragmentToStack, popFragmentFromStack } from './context-manager'
import { applyProcessors } from './processor-pipeline'
import { SlideContent, SlideCreationContext, GlobalContext } from './types'

/**
 * Parse a presentation into a list of slide nodes.
 * @param presentation The presentation to parse
 * @param processors Optional array of processors to apply to each slide node
 * @returns A Result containing an array of slide nodes or an error
 */
export function parse(presentation: Presentation, processors: Processor[] = []): Result<SlideNode[], AppError> {
  // Validate presentation and find entry fragment
  const entryFragmentResult = validatePresentation(presentation)
  if (entryFragmentResult.isErr()) {
    return err(entryFragmentResult.error)
  }

  // Create a map of fragments by relative path for reference lookups
  const fragmentMap = new Map<string, Fragment>()
  for (const fragment of presentation.fragments) {
    fragmentMap.set(fragment.relativePath, fragment)
  }

  try {
    // Initialize global context
    const globalContext = createGlobalContext()

    // Parse the presentation via a single unified flow that supports embedded fragments
    const slideNodes = parseFragmentContent(
      entryFragmentResult.value,
      fragmentMap,
      presentation.metadata.name,
      new Set(),
      0,
      globalContext
    )

    // Apply processors to all slide nodes
    const processedNodes = applyProcessors(slideNodes, processors)
    if (processedNodes.isErr()) {
      return processedNodes
    }

    return ok(processedNodes.value)
  } catch (error) {
    // Handle parser errors (like delimiter sequence errors)
    if (error instanceof Error && 'code' in error) {
      return err(error as AppError)
    }
    return err(createError(error instanceof Error ? error.message : String(error), ErrorCode.PARSER_ERROR))
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

/**
 * Parse content from a fragment, handling any embedded fragments
 */
function parseFragmentContent(
  fragment: Fragment,
  fragmentMap: Map<string, Fragment>,
  presentationName: string,
  processedFragments: Set<string> = new Set(),
  inheritedNestingLevel: number = 0,
  globalContext: GlobalContext
): SlideNode[] {
  const slideContents = splitContentByDelimiters(fragment.content)
  const visitedFragments = new Set(processedFragments)

  let slideNodes: SlideNode[] = []
  const buffer: SlideContent[] = []

  const flushBuffer = () => {
    if (buffer.length > 0) {
      const creationContext: SlideCreationContext = {
        presentationName,
        fragment,
        inheritedNestingLevel,
      }
      const newNodes = createSlideNodes(buffer.splice(0, buffer.length), creationContext, globalContext)
      slideNodes.push(...newNodes)
    }
  }

  for (const section of slideContents) {
    const content = section.content.trim()
    const fragmentRef = extractFragmentReference(content)

    if (fragmentRef && content === fragmentRef.fullMatch) {
      flushBuffer()

      const referencedPath = resolveFragmentPath(fragmentRef.path, fragment.relativePath)

      if (fragmentMap.has(referencedPath) && !visitedFragments.has(referencedPath)) {
        visitedFragments.add(referencedPath)
        const referencedFragment = fragmentMap.get(referencedPath)!

        // Capture the slide that immediately precedes this fragment reference
        const slideBeforeFragmentRef = slideNodes.length > 0 ? slideNodes[slideNodes.length - 1] : null

        // For embedded fragments, the embedding level becomes the base level
        // All content in the embedded fragment should be at or relative to this level
        const embeddingLevel = section.childLevel + inheritedNestingLevel

        const embeddedNodes = parseFragmentContent(
          referencedFragment,
          fragmentMap,
          presentationName,
          visitedFragments,
          embeddingLevel,
          globalContext
        )

        // Adjust delimiter levels: embedded fragment content should maintain its internal
        // hierarchy but be based at the embedding level
        embeddedNodes.forEach(node => {
          // The first slide in embedded fragment should be at embedding level
          // Subsequent slides maintain their relative hierarchy
          const relativeLevel = node.delimiterLevel - embeddingLevel
          if (relativeLevel > 0) {
            // This is a child slide within the embedded fragment
            // Keep it at the same level as the embedding level for now
            node.delimiterLevel = embeddingLevel
          }
        })

        // Handle FS naming only for sibling-level fragments
        if (section.childLevel === 0) {
          // This is a sibling-level fragment - use existing FS naming
          // Use the slide that was captured before fragment processing
          const baseSlideId = slideBeforeFragmentRef ? slideBeforeFragmentRef.id : 'S0'

          // Count how many top-level slides we're renaming
          const topLevelSlidesCount = embeddedNodes.filter(
            node => node.delimiterLevel === 0 || node.delimiterLevel === embeddingLevel
          ).length

          // Adjust the global counter to account for the renamed slides
          globalContext.globalTopLevelCount -= topLevelSlidesCount

          applyFragmentSubstitutionNaming(embeddedNodes, baseSlideId, embeddingLevel, presentationName, fragment.id)
        }

        // For embedded fragments, just add them directly since they should be processed
        // with the correct inherited nesting level already by the recursive call
        slideNodes.push(...embeddedNodes)

        // Update fragment ID for embedded nodes to track their origin
        embeddedNodes.forEach(node => {
          node.fragmentId = fragment.id
        })

        visitedFragments.delete(referencedPath)
      } else if (!fragmentMap.has(referencedPath)) {
        // Fragment not found - log warning and continue
        console.warn(`Fragment reference '${fragmentRef.path}' not found. Skipping.`)
        // Also add buffer to handle this case
        buffer.push(section)
      } else if (visitedFragments.has(referencedPath)) {
        // Circular reference detected
        throw createError('Circular reference detected', ErrorCode.PARSER_CIRCULAR_REFERENCE)
      }
    } else {
      buffer.push(section)
    }
  }

  flushBuffer()
  connectNavigationLinks(slideNodes)
  return slideNodes
}
