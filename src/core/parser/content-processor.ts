import { Fragment } from '../../types/presentation'
import { SlideNode } from '../../types/slide'
import { createSlideNodes } from './slide-builder'
import { SlideContent, SlideCreationContext, GlobalContext } from './types'

export type ContentProcessor = {
  addToBuffer: (section: SlideContent) => void
  flushBuffer: () => void
  addSlideNodes: (nodes: SlideNode[]) => void
  getSlideNodes: () => SlideNode[]
  getLastSlideNode: () => SlideNode | null
}

export function createContentProcessor(
  fragment: Fragment,
  presentationName: string,
  inheritedNestingLevel: number,
  globalContext: GlobalContext
): ContentProcessor {
  let slideNodes: SlideNode[] = []
  const buffer: SlideContent[] = []

  return {
    addToBuffer: (section: SlideContent) => buffer.push(section),

    flushBuffer: () => {
      if (buffer.length > 0) {
        const creationContext: SlideCreationContext = {
          presentationName,
          fragment,
          inheritedNestingLevel,
        }
        const newNodes = createSlideNodes(buffer.splice(0, buffer.length), creationContext, globalContext)
        slideNodes.push(...newNodes)
      }
    },

    addSlideNodes: (nodes: SlideNode[]) => slideNodes.push(...nodes),

    getSlideNodes: () => slideNodes,

    getLastSlideNode: () => (slideNodes.length > 0 ? slideNodes[slideNodes.length - 1] : null),
  }
}
