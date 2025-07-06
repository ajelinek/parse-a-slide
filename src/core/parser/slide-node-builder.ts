import { SlideNode } from '../../types/slide'
import { RawSlide } from './fragment-splitter'
import { FrontMatter } from '../../types/frontmatter'

/**
 * Responsible for building SlideNode objects from RawSlide input
 * and managing the hierarchy of slides via a parent stack.
 */
export class SlideNodeBuilder {
  private slideNodes: SlideNode[] = []
  private parentStack: SlideNode[] = [] // Index represents the level

  // For hierarchical ID generation
  private topLevelCounter = 0
  private childCounters = new Map<string, number>() // parentId -> childCount

  public addSlideNode(rawSlide: RawSlide, frontMatter?: FrontMatter): SlideNode {
    const slideNode = this.buildSlideNode(rawSlide, frontMatter)
    this.updateNavigationReferences(slideNode, rawSlide.childLevel)
    this.updateParentStack(rawSlide.childLevel, slideNode)
    return slideNode
  }

  /**
   * Returns all slide nodes that have been built
   */
  public getSlideNodes(): SlideNode[] {
    return this.slideNodes
  }

  /**
   * Builds a SlideNode from a RawSlide
   */
  private buildSlideNode(rawSlide: RawSlide, frontMatter?: FrontMatter): SlideNode {
    const slideNode: SlideNode = {
      id: this.generateSlideId(rawSlide.childLevel),
      url: '',
      navigation: {
        childSlideId: null,
        parentSlideId: null,
        nextSlideId: null,
        previousSlideId: null,
      },
      content: rawSlide.content,
      fragmentPath: rawSlide.path,
      frontMatter,
    }

    this.slideNodes.push(slideNode)
    return slideNode
  }

  /**
   * Generates a hierarchical slide ID based on level and parent context
   */
  private generateSlideId(level: number): string {
    if (level === 0) {
      // Top-level slide: S1, S2, S3...
      this.topLevelCounter++
      return `S${this.topLevelCounter}`
    } else {
      // Child slide: inherit parent ID + C + child number
      const parent = this.parentStack[level - 1]
      const parentId = parent.id

      // Get or initialize child counter for this parent
      const currentChildCount = this.childCounters.get(parentId) || 0
      const newChildCount = currentChildCount + 1
      this.childCounters.set(parentId, newChildCount)

      return `${parentId}C${newChildCount}`
    }
  }

  /**
   * Updates navigation references for directional arrow pad behavior
   */
  private updateNavigationReferences(currentNode: SlideNode, level: number): void {
    // Set parent relationship if there's a parent at the previous level
    if (level > 0 && this.parentStack[level - 1]) {
      const parent = this.parentStack[level - 1]
      currentNode.navigation.parentSlideId = parent.id

      // If parent doesn't have a child yet, set this as the child
      if (parent.navigation.childSlideId === null) {
        parent.navigation.childSlideId = currentNode.id
      }
    }

    // Connect to previous sibling if one exists at this level
    if (this.parentStack[level]) {
      const previousSibling = this.parentStack[level]
      currentNode.navigation.previousSlideId = previousSibling.id
      previousSibling.navigation.nextSlideId = currentNode.id
    }
  }

  /**
   * Updates the parent stack with the new slide at the given level
   */
  private updateParentStack(level: number, slideNode: SlideNode): void {
    // Truncate the stack to the current level + 1
    this.parentStack.length = level + 1

    // Set this slide as the current slide at this level
    this.parentStack[level] = slideNode
  }
}
