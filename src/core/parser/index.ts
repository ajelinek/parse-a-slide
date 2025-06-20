import { ok } from 'assert'
import { Result, err } from 'neverthrow/dist'
import { Presentation } from 'presentation'
import { SlideNode } from 'slide'
import { AppError, createError, ErrorCode } from '../../utils/error'
import { Fragment } from '../../types/presentation'
import { determineDelimiterLevel } from './utils'
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
