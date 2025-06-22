import { Presentation } from 'presentation'
import { SlideNode } from 'slide'
import { Fragment } from '../../types/presentation'
import { createError, err, ErrorCode, ok } from '../../utils/error'
import { splitIntoRawSlides } from './fragment-splitter'

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

  return ok(slideNodes)
}
