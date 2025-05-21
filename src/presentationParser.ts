export interface SlideNode {
  id: string
  content: string
  parentId: string | null
  childId: string | null
  nextId: string | null
  prevId: string | null
}

export interface ParsedSlidesOutput {
  slides: Map<string, SlideNode>
}

const SLIDE_START_COMMENT_MDX = '{\/* slide-start *\/}'
const SLIDE_END_COMMENT_MDX = '{\/* slide-end *\/}'

export function parseSlides(mdxContent: string): ParsedSlidesOutput {
  const slidesMap = new Map<string, SlideNode>()
  const tempNodes: SlideNode[] = []

  const idCounters = new Map<string | null, number>() // Key: parentId (or null for root), Value: next child index for that parent

  // If no slide comments are present at all, return empty.
  if (mdxContent.indexOf(SLIDE_START_COMMENT_MDX) === -1) {
    return { slides: new Map() }
  }

  function generateIdForNode(parentId: string | null): string {
    const counter = idCounters.get(parentId) || 0
    idCounters.set(parentId, counter + 1)
    const index = counter + 1 // 1-based index
    if (parentId === null) {
      // For root nodes, format as S<index>
      return `S${index}`
    } else {
      // For child nodes, format as <parentId>.<index>
      // The parentId will already be in S<n> or S<n>.<m> format.
      return `${parentId}.${index}`
    }
  }

  function doParse(currentMdx: string, parentIdFromCaller: string | null) {
    currentMdx = currentMdx.trim() // Trim the input for this level first.
    if (currentMdx === '') {
      // If, after trimming, the content for this level is empty, create an empty slide.
      // This handles cases like {/* slide-start */}{/* slide-end */} or {/* slide-start %}   {/* slide-end */}
      const slideId = generateIdForNode(parentIdFromCaller)
      tempNodes.push({
        id: slideId,
        content: '',
        parentId: parentIdFromCaller,
        childId: null,
        nextId: null,
        prevId: null,
      })
      return
    }

    let effectiveParentForNestedBlocks = parentIdFromCaller
    let cursor = 0 // Main cursor for iterating through currentMdx

    // Phase 1: Determine initial text segment or create a container
    const firstBlockStartIndex = currentMdx.indexOf(SLIDE_START_COMMENT_MDX)

    if (firstBlockStartIndex === -1) {
      // No blocks in currentMdx, so the entire currentMdx (already trimmed) is a single slide's content.
      const slideId = generateIdForNode(parentIdFromCaller)
      tempNodes.push({
        id: slideId,
        content: currentMdx, // currentMdx is already trimmed
        parentId: parentIdFromCaller,
        childId: null,
        nextId: null,
        prevId: null,
      })
      return // Done with this level
    }

    // There is at least one block.
    const initialTextContent = currentMdx.substring(0, firstBlockStartIndex).trim()

    if (initialTextContent) {
      // There's actual text before the first block. This text forms a slide.
      const initialTextSlideId = generateIdForNode(parentIdFromCaller)
      tempNodes.push({
        id: initialTextSlideId,
        content: initialTextContent,
        parentId: parentIdFromCaller,
        childId: null,
        nextId: null,
        prevId: null,
      })
      effectiveParentForNestedBlocks = initialTextSlideId // This slide is the parent for subsequent blocks at this level.
    } else {
      // No initial text, or only whitespace before the first block.
      // This means currentMdx starts effectively with a block. Create an empty container slide for this level.
      const containerSlideId = generateIdForNode(parentIdFromCaller)
      tempNodes.push({
        id: containerSlideId,
        content: '',
        parentId: parentIdFromCaller,
        childId: null,
        nextId: null,
        prevId: null,
      })
      effectiveParentForNestedBlocks = containerSlideId // This empty container is the parent.
    }

    // Phase 2: Process only the explicit slide blocks. Text between blocks is ignored.
    cursor = 0 // Start searching for blocks from the beginning of (trimmed) currentMdx
    while (cursor < currentMdx.length) {
      const nextBlockStartActual = currentMdx.indexOf(SLIDE_START_COMMENT_MDX, cursor)
      if (nextBlockStartActual === -1) {
        // No more blocks found. Any trailing text is ignored.
        break
      }

      // Move cursor to the start of the block
      cursor = nextBlockStartActual

      const blockContentStartPos = cursor + SLIDE_START_COMMENT_MDX.length
      let balance = 1
      let searchPos = blockContentStartPos
      let blockContentEndPos = -1
      let blockFullEndPos = -1

      while (searchPos < currentMdx.length) {
        const nextStart = currentMdx.indexOf(SLIDE_START_COMMENT_MDX, searchPos)
        const nextEnd = currentMdx.indexOf(SLIDE_END_COMMENT_MDX, searchPos)

        if (nextEnd === -1) {
          // Malformed block, no end tag
          blockContentEndPos = currentMdx.length
          blockFullEndPos = currentMdx.length
          break
        }

        if (nextStart !== -1 && nextStart < nextEnd) {
          balance++
          searchPos = nextStart + SLIDE_START_COMMENT_MDX.length
        } else {
          balance--
          searchPos = nextEnd + SLIDE_END_COMMENT_MDX.length
          if (balance === 0) {
            blockContentEndPos = nextEnd
            blockFullEndPos = searchPos
            break
          }
        }
      }
      if (blockContentEndPos === -1) {
        // Still unclosed (EOF before balance hit 0)
        blockContentEndPos = currentMdx.length
        blockFullEndPos = currentMdx.length
      }

      const innerBlockMdx = currentMdx.substring(blockContentStartPos, blockContentEndPos)
      // IMPORTANT: Recursive call to doParse.
      // The parent for the content of this inner block is 'effectiveParentForNestedBlocks',
      // which was determined by the initial text/container of the CURRENT doParse call.
      doParse(innerBlockMdx, effectiveParentForNestedBlocks)

      cursor = blockFullEndPos // Move cursor past the processed block
    }
  }

  // Initial call to doParse. For top-level content, parentIdForSubtree is null.
  // We need to ensure that only content delineated by slide comments creates slides at the root.
  // The initial `if (mdxContent.indexOf(SLIDE_START_COMMENT_MDX) === -1)` handles no slides.
  // The challenge is to make doParse(mdxContent, null) only process blocks, not surrounding text.

  // A new approach for the top level: iterate through top-level blocks first.
  let topLevelCursor = 0
  while (topLevelCursor < mdxContent.length) {
    const nextBlockStart = mdxContent.indexOf(SLIDE_START_COMMENT_MDX, topLevelCursor)
    if (nextBlockStart === -1) break // No more top-level blocks

    // We are at a top-level slide block.
    // The parentIdForSubtree for this block's *direct content segments* will be null.
    // The generateIdForNode(null) will create S1, S2, etc.

    let balance = 1
    const blockContentStartPos = nextBlockStart + SLIDE_START_COMMENT_MDX.length
    let searchPos = blockContentStartPos
    let blockContentEndPos = -1
    let blockFullEndPos = -1

    while (searchPos < mdxContent.length) {
      const nextStart = mdxContent.indexOf(SLIDE_START_COMMENT_MDX, searchPos)
      const nextEnd = mdxContent.indexOf(SLIDE_END_COMMENT_MDX, searchPos)

      if (nextEnd === -1) {
        blockContentEndPos = mdxContent.length
        blockFullEndPos = mdxContent.length
        break
      }
      if (nextStart !== -1 && nextStart < nextEnd) {
        balance++
        searchPos = nextStart + SLIDE_START_COMMENT_MDX.length
      } else {
        balance--
        searchPos = nextEnd + SLIDE_END_COMMENT_MDX.length
        if (balance === 0) {
          blockContentEndPos = nextEnd
          blockFullEndPos = searchPos
          break
        }
      }
    }
    if (blockContentEndPos === -1) {
      // Unclosed
      blockContentEndPos = mdxContent.length
      blockFullEndPos = mdxContent.length
    }

    const outerBlockContent = mdxContent.substring(blockContentStartPos, blockContentEndPos)
    // For this outer block, its direct segments will have parentIdForSubtree = null initially.
    // The first segment inside this block will become a root slide (e.g., S1).
    // Any nested blocks will get S1 (or S2 etc.) as their parent.
    // The key is that `doParse` is now called only for content *within* an identified top-level block.
    doParse(outerBlockContent, null) // Content within this top block gets parsed with parentId = null for its direct segments.

    topLevelCursor = blockFullEndPos
  }

  // Populate slidesMap and determine rootSlideId
  if (tempNodes.length > 0) {
    // Link nodes (childId, nextId, prevId)
    tempNodes.forEach(node => {
      slidesMap.set(node.id, node)

      const children = tempNodes
        .filter(c => c.parentId === node.id)
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }))
      if (children.length > 0) node.childId = children[0].id

      const siblings = tempNodes
        .filter(s => s.parentId === node.parentId)
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }))
      const myIndexInSiblings = siblings.findIndex(s => s.id === node.id)
      if (myIndexInSiblings > 0) node.prevId = siblings[myIndexInSiblings - 1].id
      if (myIndexInSiblings < siblings.length - 1) node.nextId = siblings[myIndexInSiblings + 1].id
    })
  }

  return { slides: slidesMap }
}
