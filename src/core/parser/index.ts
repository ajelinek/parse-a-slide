import { Presentation } from 'presentation'
import { SlideNode } from 'slide'
import { Fragment } from '../../types/presentation'
import { createError, err, ErrorCode, ok, PasResult } from '../../utils/error'
import { RawSlide, splitIntoRawSlides } from './fragment-splitter'
import { extractFragmentPath, isEmbeddedFragment } from './parser-utils'
import { Logger } from '../../utils/logger'
import { SlideNodeBuilder } from './slide-node-builder'
import path from 'path'

interface ProcessingContext {
  fragmentMap: Map<string, Fragment>
  processingChain: Set<string>
  slideNodeBuilder: SlideNodeBuilder
}

interface EmbeddedFragmentParams {
  rawSlide: RawSlide
  context: ProcessingContext
  inheritedLevel: number
}

export function parsePresentation(presentation: Presentation): PasResult<SlideNode[]> {
  const entryFragment = findEntryFragment(presentation)
  if (!entryFragment.isOk()) return err(entryFragment.error)

  const rawSlides = splitIntoRawSlides(entryFragment.value.content, entryFragment.value.relativePath)
  if (!rawSlides.isOk()) return err(rawSlides.error)

  const context = createProcessingContext(presentation, entryFragment.value.relativePath)

  Logger.getInstance().debug('Raw slides', rawSlides.value)

  return processRawSlides(rawSlides.value, context)
}

function processRawSlides(rawSlideArray: RawSlide[], context: ProcessingContext): PasResult<SlideNode[]> {
  let previousLevel = 0

  for (let index = 0; index < rawSlideArray.length; index++) {
    const rawSlide = rawSlideArray[index]

    context.processingChain.add(rawSlide.path)

    if (rawSlide.childLevel < previousLevel) {
      cleanProcessingChainToPath(context.processingChain, rawSlide.path)
    }

    const embeddedResult = tryProcessEmbeddedFragment({
      rawSlide,
      context,
      inheritedLevel: rawSlide.childLevel,
    })

    if (embeddedResult.isOk()) {
      const fragmentSlides = embeddedResult.value
      if (fragmentSlides.length > 0) {
        rawSlideArray.splice(index, 1, ...fragmentSlides)
        index--
        previousLevel = rawSlide.childLevel
        continue
      }
    } else {
      return err(embeddedResult.error)
    }

    // Get the fragment that contains this raw slide to access its front matter
    const fragment = context.fragmentMap.get(rawSlide.path)
    context.slideNodeBuilder.addSlideNode(rawSlide, fragment?.frontMatter)
    previousLevel = rawSlide.childLevel
  }

  return ok(context.slideNodeBuilder.getSlideNodes())
}

function tryProcessEmbeddedFragment(params: EmbeddedFragmentParams): PasResult<RawSlide[]> {
  if (!isEmbeddedFragment(params.rawSlide.content)) {
    return ok([])
  }

  const fragmentPath = extractFragmentPath(params.rawSlide.content)
  if (!fragmentPath) {
    return ok([])
  }

  const normalizedPath = normalizeFragmentPath(fragmentPath)

  if (params.context.processingChain.has(normalizedPath)) {
    return err(createError('Circular reference detected', ErrorCode.PARSER_CIRCULAR_REFERENCE))
  }

  const fragmentSlides = getEmbeddedFragmentSlides({
    rawSlide: params.rawSlide,
    context: params.context,
    normalizedPath,
    inheritedLevel: params.inheritedLevel,
  })

  if (fragmentSlides.isOk() && fragmentSlides.value.length > 0) {
    params.context.processingChain.add(normalizedPath)
  }

  return fragmentSlides
}

function getEmbeddedFragmentSlides(params: {
  rawSlide: RawSlide
  context: ProcessingContext
  normalizedPath: string
  inheritedLevel: number
}): PasResult<RawSlide[]> {
  const fragmentContent = params.context.fragmentMap.get(params.normalizedPath)

  if (!fragmentContent?.content) {
    const originalPath = extractFragmentPath(params.rawSlide.content)
    Logger.getInstance().info(`Fragment reference ${originalPath} not found`)
    return ok([])
  }

  return splitIntoRawSlides(fragmentContent.content, params.normalizedPath, true, params.inheritedLevel)
}

function findEntryFragment(presentation: Presentation): PasResult<Fragment> {
  const entryFragment = presentation.fragments.find(fragment => fragment.isEntry)

  if (!entryFragment) {
    return err(createError('No entry fragment found in presentation', ErrorCode.NO_ENTRY_FRAGMENT))
  }

  return ok(entryFragment)
}

function createProcessingContext(presentation: Presentation, entryPath: string): ProcessingContext {
  const fragmentMap = new Map<string, Fragment>()
  presentation.fragments.forEach(fragment => {
    fragmentMap.set(fragment.relativePath, fragment)
  })

  const processingChain = new Set<string>()
  processingChain.add(entryPath)

  return {
    fragmentMap,
    processingChain,
    slideNodeBuilder: new SlideNodeBuilder(),
  }
}

function normalizeFragmentPath(fragmentPath: string): string {
  return path.normalize(fragmentPath.startsWith('./') ? fragmentPath.slice(2) : fragmentPath)
}

function cleanProcessingChainToPath(processingChain: Set<string>, targetPath: string) {
  const chainArray = Array.from(processingChain)

  for (let i = chainArray.length - 1; i >= 0; i--) {
    if (chainArray[i] === targetPath) {
      break
    }
    processingChain.delete(chainArray[i])
  }
}

export const parse = parsePresentation
