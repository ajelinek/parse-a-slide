import { Result } from 'neverthrow'
import path from 'path'
import { Fragment } from '../../types/presentation'
import { SlideNode } from '../../types/slide'
import { AppError, ErrorCode, createError, ok, err } from '../../utils/error'
import { FragmentReference, EmbeddingContext, GlobalContext } from './types'

/**
 * Extract a fragment reference from content if it exists.
 * A fragment reference is a Markdown link with a .pres.md or .pres.mdx extension.
 */
export function extractFragmentReference(content: string): FragmentReference | null {
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
export function resolveFragmentPath(referencedPath: string, currentFragmentPath: string): string {
  const currentDir = path.dirname(currentFragmentPath)
  return path.normalize(path.join(currentDir, referencedPath))
}

/**
 * Detect circular references in fragment embedding
 */
export function detectCircularReference(fragmentPath: string, processingStack: string[]): boolean {
  return processingStack.includes(fragmentPath)
}

/**
 * Process embedding of a referenced fragment with proper context
 */
export function processFragmentEmbedding(
  fragmentRef: FragmentReference,
  embeddingContext: EmbeddingContext,
  fragmentMap: Map<string, Fragment>,
  visitedFragments: Set<string>,
  globalContext: GlobalContext,
  parseFragmentContentFn: (
    fragment: Fragment,
    fragmentMap: Map<string, Fragment>,
    presentationName: string,
    processedFragments: Set<string>,
    inheritedNestingLevel: number,
    context: GlobalContext
  ) => SlideNode[]
): Result<SlideNode[], AppError> {
  const referencedPath = resolveFragmentPath(fragmentRef.path, '')

  if (!fragmentMap.has(referencedPath)) {
    console.warn(`Fragment reference '${fragmentRef.path}' not found. Skipping.`)
    return ok([])
  }

  if (visitedFragments.has(referencedPath)) {
    return err(createError('Circular reference detected', ErrorCode.PARSER_CIRCULAR_REFERENCE))
  }

  visitedFragments.add(referencedPath)
  const referencedFragment = fragmentMap.get(referencedPath)!

  const embeddedNodes = parseFragmentContentFn(
    referencedFragment,
    fragmentMap,
    '', // presentationName will be provided by caller
    visitedFragments,
    embeddingContext.embeddingLevel,
    globalContext
  )

  visitedFragments.delete(referencedPath)

  return ok(embeddedNodes)
}

/**
 * Apply fragment substitution naming to embedded fragment slides
 */
export function applyFragmentSubstitutionNaming(
  slideNodes: SlideNode[],
  baseSlideId: string,
  embeddingLevel: number,
  presentationName: string,
  fragmentId: string
): void {
  // Count how many top-level slides we're renaming
  const topLevelSlidesCount = slideNodes.filter(
    node => node.delimiterLevel === 0 || node.delimiterLevel === embeddingLevel
  ).length

  for (let i = 0; i < slideNodes.length; i++) {
    const node = slideNodes[i]
    const newId = `${baseSlideId}FS${i + 1}`
    node.id = newId
    node.url = `/${presentationName}/${newId}`
    node.fragmentId = fragmentId
  }
}
