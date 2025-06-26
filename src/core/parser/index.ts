import { Presentation } from 'presentation'
import { SlideNode } from 'slide'
import { Fragment } from '../../types/presentation'
import { createError, err, ErrorCode, ok } from '../../utils/error'
import { splitIntoRawSlides } from './fragment-splitter'
import { array } from '@types/yargs'
import { isEmbeddedFragment } from './parser-utils'

export function parsePresentation(presentation: Presentation) {
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
    if(isEmbeddedFragment(rawSlide.content)) {
      const fragmentRawSlides = splitIntoRawSlides(rawSlide.content, true)

      if (!fragmentRawSlides.isOk()) return fragmentRawSlides
      rawSlideArray.splice(index, 1, ...fragmentRawSlides.value)
      index--
    }

    
  }

  return ok(slideNodes)
}
