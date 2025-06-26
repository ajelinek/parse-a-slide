import { Presentation } from 'presentation'
import { SlideNode } from 'slide'
import { Fragment } from '../../types/presentation'
import { createError, err, ErrorCode, ok } from '../../utils/error'
import { splitIntoRawSlides } from './fragment-splitter'
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
  const rawSlides = splitIntoRawSlides(entryFragment.content)

  if (!rawSlides.isOk()) return rawSlides

  const rawSlideArray = rawSlides.value
  for (let index = 0; index < rawSlideArray.length; index++) {
    const rawSlide = rawSlideArray[index]

    if (isEmbeddedFragment(rawSlide.content)) {
      const fragmentPath = extractFragmentPath(rawSlide.content)
      const fragmentContent = fragmentPath && fragmentMap.get(fragmentPath)

      if (fragmentContent && fragmentContent.content) {
        const fragmentRawSlides = splitIntoRawSlides(fragmentContent.content, true)

        if (!fragmentRawSlides.isOk()) return fragmentRawSlides
        rawSlideArray.splice(index, 1, ...fragmentRawSlides.value)
        index--
      } else {
        lg.info('Fragment path not found', fragmentPath)
      }
    }
  }

  return ok(slideNodes)
}
