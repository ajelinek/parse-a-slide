import { Result } from 'neverthrow'
import { Fragment, Presentation } from '../types/presentation'
import { Processor } from '../types/processor'
import { SlideNode, SlideNavigation } from '../types/slide'
import { AppError, ErrorCode, createError, ok, err } from '../utils/error'
import path from 'path'

/**
 * Interface for slide content segments after splitting by delimiters
 */
interface SlideContent {
  content: string
  childLevel: number // 0 for not a child, 1+ for nested child levels
  isDelimiter: boolean
}

/**
 * Interface for fragment reference extracted from content
 */
interface FragmentReference {
  fullMatch: string
  text: string
  path: string
}

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

  // Create a map of fragments by relative path for reference lookups
  const fragmentMap = new Map<string, Fragment>()
  for (const fragment of presentation.fragments) {
    fragmentMap.set(fragment.relativePath, fragment)
  }

  try {
    // Parse the presentation via a single unified flow that supports embedded fragments
    const slideNodes = parseFragmentContent(entryFragment, fragmentMap, presentation.metadata.name)

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
 * Global context for slide generation across all fragments
 */
interface SlideGenerationContext {
  globalTopLevelCount: number
  globalParentStack: { id: string; level: number }[]
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
  context?: SlideGenerationContext
): SlideNode[] {
  const slideContents = splitContentByDelimiters(fragment.content)
  const visitedFragments = new Set(processedFragments)

  // Initialize or use existing slide generation context
  const slideContext = context || {
    globalTopLevelCount: 0,
    globalParentStack: [],
  }

  let slideNodes: SlideNode[] = []
  const buffer: SlideContent[] = []

  const flushBuffer = () => {
    if (buffer.length > 0) {
      const newNodes = createSlideNodes(
        buffer.splice(0, buffer.length),
        fragment,
        presentationName,
        inheritedNestingLevel,
        slideContext
      )
      slideNodes.push(...newNodes)
    }
  }

  for (const section of slideContents) {
    const content = section.content.trim()
    const fragmentRef = extractFragmentReference(content)

    if (fragmentRef && content === fragmentRef.fullMatch) {
      flushBuffer()

      const referencedPath = resolveReferencedFragmentPath(fragmentRef.path, fragment.relativePath)

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
          slideContext
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
            // TODO: This might need refinement based on the exact expected behavior
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
          slideContext.globalTopLevelCount -= topLevelSlidesCount

          for (let i = 0; i < embeddedNodes.length; i++) {
            const node = embeddedNodes[i]
            const newId = `${baseSlideId}FS${i + 1}`
            node.id = newId
            node.url = `/${presentationName}/${newId}`
            node.fragmentId = fragment.id
          }
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

/**
 * Connect navigation links between slides
 */
function connectNavigationLinks(slideNodes: SlideNode[]): void {
  // Set parent-child navigation first
  for (const node of slideNodes) {
    if (node.navigation.parentSlideId) {
      const parentNode = slideNodes.find(n => n.id === node.navigation.parentSlideId)
      if (parentNode && !parentNode.navigation.childSlideId) {
        parentNode.navigation.childSlideId = node.id
      }
    }
  }

  // First pass: Set basic previous/next navigation between consecutive slides
  for (let i = 0; i < slideNodes.length - 1; i++) {
    const current = slideNodes[i]
    const next = slideNodes[i + 1]

    // Handle child slides with dot notation (e.g., S1.C1, S1.C2)
    if (current.navigation.parentSlideId && next.navigation.parentSlideId) {
      // Both are child slides - check if they share the same parent
      if (current.navigation.parentSlideId === next.navigation.parentSlideId) {
        // Sequential child slides - link them together
        current.navigation.nextSlideId = next.id
        next.navigation.previousSlideId = current.id
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

  // Third pass: Set child slides to link to parent's next slide
  for (const node of slideNodes) {
    if (node.navigation.parentSlideId && !node.navigation.nextSlideId) {
      const rootParent = findRootParent(node, slideNodes)
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

function findRootParent(node: SlideNode, slideNodes: SlideNode[]): SlideNode | null {
  let current = node
  while (current.navigation.parentSlideId) {
    const parent = slideNodes.find(n => n.id === current.navigation.parentSlideId)
    if (!parent) break
    current = parent
  }
  return current === node ? null : current
}

/**
 * Split slide content by delimiters
 */
function splitContentByDelimiters(content: string): SlideContent[] {
  const lines = content.split('\n')
  const result: SlideContent[] = []
  let currentContent: string[] = []
  let nextChildLevel = 0
  let currentMaxLevel = 0
  let lastWasSiblingDelimiter = false

  const flushCurrentContent = () => {
    if (currentContent.length > 0) {
      result.push({
        content: currentContent.join('\n'),
        childLevel: nextChildLevel,
        isDelimiter: false,
      })
      currentContent = []
    } else if (lastWasSiblingDelimiter) {
      result.push({
        content: '',
        childLevel: nextChildLevel,
        isDelimiter: false,
      })
    }
  }

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine === '---' || trimmedLine === '--->' || trimmedLine === '-->>') {
      flushCurrentContent()

      if (trimmedLine === '---') {
        lastWasSiblingDelimiter = true
        nextChildLevel = 0
        currentMaxLevel = Math.max(currentMaxLevel, 0)
      } else {
        lastWasSiblingDelimiter = false
        const newLevel = trimmedLine === '--->' ? 1 : 2

        // Validate that we're not skipping levels
        if (newLevel > currentMaxLevel + 1) {
          throw createError('Invalid nesting increase: cannot skip levels', ErrorCode.PARSER_DELIMITER_SEQUENCE_ERROR)
        }

        nextChildLevel = newLevel
        currentMaxLevel = Math.max(currentMaxLevel, newLevel)
      }
      continue
    }

    lastWasSiblingDelimiter = false
    currentContent.push(line)
  }

  if (currentContent.length > 0) {
    result.push({
      content: currentContent.join('\n').trim(),
      childLevel: nextChildLevel,
      isDelimiter: false,
    })
  } else if (lastWasSiblingDelimiter) {
    // Handle case where presentation ends with a delimiter - create empty slide
    result.push({
      content: '',
      childLevel: nextChildLevel,
      isDelimiter: false,
    })
  }

  return result.filter(slide => !slide.isDelimiter)
}

/**
 * Create slide nodes from content segments
 */
function createSlideNodes(
  slideContents: SlideContent[],
  fragment: Fragment,
  presentationName: string,
  inheritedNestingLevel: number = 0,
  context: SlideGenerationContext
): SlideNode[] {
  const slideNodes: SlideNode[] = []

  for (const content of slideContents) {
    const absoluteLevel = content.childLevel + inheritedNestingLevel
    const isTopLevel = absoluteLevel === inheritedNestingLevel
    let slideId: string
    let parentSlideId: string | null = null

    if (isTopLevel && inheritedNestingLevel === 0) {
      slideId = `S${++context.globalTopLevelCount}`
      context.globalParentStack.length = 0
    } else {
      const parent = findParent(context.globalParentStack, absoluteLevel)
      if (parent) {
        const childCount = slideNodes.filter(n => n.id.startsWith(parent.id + 'C')).length + 1
        slideId = `${parent.id}C${childCount}`
        parentSlideId = parent.id
      } else {
        slideId = `S${++context.globalTopLevelCount}`
      }

      while (
        context.globalParentStack.length &&
        context.globalParentStack[context.globalParentStack.length - 1].level >= absoluteLevel
      ) {
        context.globalParentStack.pop()
      }
    }

    const slideNode: SlideNode = {
      id: slideId,
      url: `/${presentationName}/${slideId}`,
      content: content.content,
      navigation: {
        parentSlideId,
        childSlideId: null,
        previousSlideId: null,
        nextSlideId: null,
      },
      fragmentId: fragment.id,
      userDefinedFrontMatter: {},
      delimiterLevel: absoluteLevel,
    }

    slideNodes.push(slideNode)
    context.globalParentStack.push({ id: slideId, level: absoluteLevel })

    if (parentSlideId) {
      const parentNode = slideNodes.find(n => n.id === parentSlideId)
      if (parentNode && !parentNode.navigation.childSlideId) {
        parentNode.navigation.childSlideId = slideId
      }
    }
  }

  return slideNodes
}

function findParent(parentStack: { id: string; level: number }[], childLevel: number) {
  for (let i = parentStack.length - 1; i >= 0; i--) {
    if (parentStack[i].level < childLevel) {
      return parentStack[i]
    }
  }
  return null
}

/**
 * Extract a fragment reference from content if it exists.
 * A fragment reference is a Markdown link with a .pres.md or .pres.mdx extension.
 */
function extractFragmentReference(content: string): FragmentReference | null {
  const regex = /^\s*\[(.*?)\]\(([^)]+\.pres\.(md|mdx))\)\s*$/
  const match = content.match(regex)

  if (match) {
    return {
      fullMatch: match[0],
      text: match[1],
      path: match[2],
    }
  }

  return null
}

/**
 * Resolve a referenced fragment path relative to the current fragment
 */
function resolveReferencedFragmentPath(referencedPath: string, currentFragmentPath: string): string {
  const currentDir = path.dirname(currentFragmentPath)
  return path.normalize(path.join(currentDir, referencedPath))
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
