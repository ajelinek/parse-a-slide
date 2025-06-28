import { Presentation } from 'presentation'
import { SlideNode } from 'slide'
import { Fragment } from '../../types/presentation'
import { createError, err, ErrorCode, ok } from '../../utils/error'
import { RawSlide, splitIntoRawSlides } from './fragment-splitter'
import { extractFragmentPath, isEmbeddedFragment } from './parser-utils'
import { Logger } from '../../utils/logger'

export function parsePresentation(presentation: Presentation) {
  const lg = Logger.getInstance()

  const entryFragment = presentation.fragments.find(fragment => fragment.isEntry)
  if (!entryFragment) {
    return err(createError('No entry fragment found in presentation', ErrorCode.NO_ENTRY_FRAGMENT))
  }

  const fragmentMap = new Map<string, Fragment>()
  presentation.fragments.forEach(fragment => {
    fragmentMap.set(fragment.relativePath, fragment)
  })

  const slideNodes: SlideNode[] = []
  const rawSlides = splitIntoRawSlides(entryFragment.content, entryFragment.relativePath)

  if (!rawSlides.isOk()) return rawSlides

  const rawSlideArray = rawSlides.value
  lg.debug('Raw slides', rawSlideArray)

  for (let index = 0; index < rawSlideArray.length; index++) {
    const rawSlide = rawSlideArray[index]

    if (isEmbeddedFragment(rawSlide.content)) {
      const fragmentRawSlides = getEmbeddedFragmentSlides(rawSlide, fragmentMap)
      if (fragmentRawSlides.isOk() && fragmentRawSlides.value.length > 0) {
        rawSlideArray.splice(index, 1, ...fragmentRawSlides.value)
        index--
      }
    } else {
      slideNodes.push(buildSlideNode(rawSlide, slideNodes))
    }
  }

  return ok(slideNodes)
}

function getEmbeddedFragmentSlides(rawSlide: RawSlide, fragmentMap: Map<string, Fragment>) {
  const lg = Logger.getInstance()
  const fragmentPath = extractFragmentPath(rawSlide.content)
  const fragmentContent = fragmentPath && fragmentMap.get(fragmentPath)

  if (fragmentContent && fragmentContent.content) {
    return splitIntoRawSlides(fragmentContent.content, fragmentPath || '', true)
  } else {
    lg.info('Fragment path not found', fragmentPath)
    return ok([])
  }
}

function buildSlideNode(rawSlide: RawSlide, slideNodes: SlideNode[]) {
  const slideNode: SlideNode = {
    id: `s${slideNodes.length + 1}`,
    url: '',
    navigation: {
      childSlideId: null,
      parentSlideId: null,
      nextSlideId: null,
      previousSlideId: null,
    },
    content: rawSlide.content,
    fragmentPath: rawSlide.path,
  }
  slideNodes.push(slideNode)
  return slideNode
}
