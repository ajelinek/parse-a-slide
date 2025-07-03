import { Presentation } from 'presentation'
import { SlideNode } from 'slide'
import { Fragment } from '../../types/presentation'
import { createError, err, ErrorCode, ok, PasResult } from '../../utils/error'
import { RawSlide, splitIntoRawSlides } from './fragment-splitter'
import { extractFragmentPath, isEmbeddedFragment } from './parser-utils'
import { Logger } from '../../utils/logger'
import { SlideNodeBuilder } from './slide-node-builder'
import path from 'path'

export function parsePresentation(presentation: Presentation): PasResult<SlideNode[]> {
  const lg = Logger.getInstance()

  const entryFragment = presentation.fragments.find(fragment => fragment.isEntry)
  if (!entryFragment) {
    return err(createError('No entry fragment found in presentation', ErrorCode.NO_ENTRY_FRAGMENT))
  }

  const fragmentMap = new Map<string, Fragment>()
  presentation.fragments.forEach(fragment => {
    fragmentMap.set(fragment.relativePath, fragment)
  })

  const slideNodeBuilder = new SlideNodeBuilder()
  const rawSlides = splitIntoRawSlides(entryFragment.content, entryFragment.relativePath)

  if (!rawSlides.isOk()) return err(rawSlides.error)

  const rawSlideArray = rawSlides.value
  lg.debug('Raw slides', rawSlideArray)

  const processingChain = new Set<string>()
  processingChain.add(entryFragment.relativePath)

  let previousLevel = 0

  for (let index = 0; index < rawSlideArray.length; index++) {
    const rawSlide = rawSlideArray[index]

    processingChain.add(rawSlide.path)

    if (rawSlide.childLevel < previousLevel) {
      cleanProcessingChainToPath(processingChain, rawSlide.path)
    }

    // Handle embedded fragments - continue if processed successfully
    if (isEmbeddedFragment(rawSlide.content)) {
      const fragmentPath = extractFragmentPath(rawSlide.content)

      if (fragmentPath) {
        // Normalize the fragment path to resolve relative paths
        const normalizedFragmentPath = path.normalize(
          fragmentPath.startsWith('./') ? fragmentPath.slice(2) : fragmentPath
        )

        // Check for circular reference
        if (processingChain.has(normalizedFragmentPath)) {
          return err(createError('Circular reference detected', ErrorCode.PARSER_CIRCULAR_REFERENCE))
        }

        const fragmentRawSlides = getEmbeddedFragmentSlides(
          rawSlide,
          fragmentMap,
          normalizedFragmentPath,
          rawSlide.childLevel
        )
        if (fragmentRawSlides.isOk() && fragmentRawSlides.value.length > 0) {
          // Add fragment to processing chain and splice
          processingChain.add(normalizedFragmentPath)
          rawSlideArray.splice(index, 1, ...fragmentRawSlides.value)
          index--
          previousLevel = rawSlide.childLevel
          continue
        }
      }
    }

    // Default case: add slide node for all non-processed slides
    slideNodeBuilder.addSlideNode(rawSlide)
    previousLevel = rawSlide.childLevel
  }

  return ok(slideNodeBuilder.getSlideNodes())
}

function cleanProcessingChainToPath(processingChain: Set<string>, targetPath: string) {
  // Convert to array to iterate backwards, remove items until we hit targetPath
  const chainArray = Array.from(processingChain)

  // Remove from the end backwards until we find targetPath
  for (let i = chainArray.length - 1; i >= 0; i--) {
    if (chainArray[i] === targetPath) {
      break // Found target, stop removing
    }
    processingChain.delete(chainArray[i])
  }
}

function getEmbeddedFragmentSlides(
  rawSlide: RawSlide,
  fragmentMap: Map<string, Fragment>,
  normalizedFragmentPath?: string,
  inheritedLevel: number = 0
): PasResult<RawSlide[]> {
  const lg = Logger.getInstance()
  const originalFragmentPath = extractFragmentPath(rawSlide.content)
  const fragmentPath = normalizedFragmentPath || originalFragmentPath
  const fragmentContent = fragmentPath && fragmentMap.get(fragmentPath)

  if (fragmentContent && fragmentContent.content) {
    return splitIntoRawSlides(fragmentContent.content, fragmentPath || '', true, inheritedLevel)
  } else {
    lg.info(`Fragment reference ${originalFragmentPath} not found`)
    return ok([])
  }
}

// Export alias for backward compatibility
export const parse = parsePresentation
