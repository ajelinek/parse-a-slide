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

  // Parse the presentation via a single unified flow that supports embedded fragments
  const slideNodes = parseFragmentContent(entryFragment, fragmentMap, presentation.metadata.name)

  // Apply processors to all slide nodes
  const processedNodes = applyProcessors(slideNodes, processors)
  if (processedNodes.isErr()) {
    return processedNodes
  }

  return ok(processedNodes.value)
}

/**
 * Parse content from a fragment, handling any embedded fragments
 */
function parseFragmentContent(
  fragment: Fragment,
  fragmentMap: Map<string, Fragment>,
  presentationName: string,
  processedFragments: Set<string> = new Set()
): SlideNode[] {
  const slideContents = splitContentByDelimiters(fragment.content)
  const visitedFragments = new Set(processedFragments)

  let slideNodes: SlideNode[] = []
  const buffer: SlideContent[] = []
  let globalTopLevelCount = 0

  const flushBuffer = () => {
    if (buffer.length > 0) {
      const newNodes = createSlideNodes(
        buffer.splice(0, buffer.length),
        fragment,
        presentationName,
        globalTopLevelCount
      )
      globalTopLevelCount += newNodes.filter(n => n.delimiterLevel === 0).length
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
        const embeddedNodes = parseFragmentContent(referencedFragment, fragmentMap, presentationName, visitedFragments)

        // Rename embedded nodes with special fragment IDs
        const lastSlideId = slideNodes.length > 0 ? slideNodes[slideNodes.length - 1].id : 'S0'
        for (let i = 0; i < embeddedNodes.length; i++) {
          const node = embeddedNodes[i]
          const newId = `${lastSlideId}FS${i + 1}`
          node.id = newId
          node.url = `/${presentationName}/${newId}`
          // Update fragment ID to match the entry fragment for proper navigation
          node.fragmentId = fragment.id
        }

        slideNodes.push(...embeddedNodes)
        visitedFragments.delete(referencedPath)
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

    // Set previous link for top-level slides
    if (next.navigation.parentSlideId === null) {
      // Find the previous top-level slide
      for (let j = i; j >= 0; j--) {
        const candidate = slideNodes[j]
        if (candidate.navigation.parentSlideId === null) {
          next.navigation.previousSlideId = candidate.id
          break
        }
      }
    }

    // For next links, only set them if not already set by embedded fragment processing
    if (
      // Skip if slide has children; its logical next is dictated by tree, not linear order
      current.navigation.childSlideId === null &&
      // Skip embedded slides - they already have correct navigation from fragment processing
      !current.id.includes('FS') &&
      current.navigation.nextSlideId === null
    ) {
      current.navigation.nextSlideId = next.id
    }
  }

  // Second pass: Set child slides to link to parent's next slide
  for (const node of slideNodes) {
    if (node.navigation.parentSlideId && !node.navigation.childSlideId) {
      const rootParent = findRootParent(node, slideNodes)
      if (rootParent && rootParent.navigation.nextSlideId) {
        node.navigation.nextSlideId = rootParent.navigation.nextSlideId
      }
    }
  }

  // Third pass: Handle parent slides with children - they should link to next top-level slide
  const topLevelSlides = slideNodes.filter(n => !n.navigation.parentSlideId)
  for (let i = 0; i < topLevelSlides.length - 1; i++) {
    const current = topLevelSlides[i]
    const next = topLevelSlides[i + 1]

    if (current.navigation.childSlideId) {
      current.navigation.nextSlideId = next.id
    }
  }

  // Fourth pass: Handle non-child slides with children (like S1C1 with S1C1C1)
  for (const node of slideNodes) {
    if (node.navigation.parentSlideId && node.navigation.childSlideId) {
      const rootParent = findRootParent(node, slideNodes)
      if (rootParent && rootParent.navigation.nextSlideId) {
        node.navigation.nextSlideId = rootParent.navigation.nextSlideId
      }
    }
  }

  // Final pass: Restore correct navigation for embedded slides
  for (let i = 0; i < slideNodes.length; i++) {
    const current = slideNodes[i]
    if (current.id.includes('FS')) {
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
      } else {
        lastWasSiblingDelimiter = false
        nextChildLevel = trimmedLine === '--->' ? 1 : 2
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
  startingTopLevelCount: number = 0
): SlideNode[] {
  const slideNodes: SlideNode[] = []
  let topLevelCount = startingTopLevelCount
  const parentStack: { id: string; level: number }[] = []

  for (const content of slideContents) {
    const isTopLevel = content.childLevel === 0
    let slideId: string
    let parentSlideId: string | null = null

    if (isTopLevel) {
      slideId = `S${++topLevelCount}`
      parentStack.length = 0
    } else {
      const parent = findParent(parentStack, content.childLevel)
      if (parent) {
        const childCount = slideNodes.filter(n => n.id.startsWith(parent.id + 'C')).length + 1
        slideId = `${parent.id}C${childCount}`
        parentSlideId = parent.id
      } else {
        slideId = `S${++topLevelCount}`
      }

      while (parentStack.length && parentStack[parentStack.length - 1].level >= content.childLevel) {
        parentStack.pop()
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
      delimiterLevel: content.childLevel,
    }

    slideNodes.push(slideNode)
    parentStack.push({ id: slideId, level: content.childLevel })

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
