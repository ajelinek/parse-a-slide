import { SlideNode } from '../../types/slide'
import { RawSlide } from './fragment-splitter'

/**
 * Responsible for building SlideNode objects from RawSlide input
 * and managing the hierarchy of slides via a parent stack.
 */
export class SlideNodeBuilder {
  private slideNodes: SlideNode[] = []
  private parentStack: SlideNode[] = [] // Index represents the level
  private maxDepthReached = 0

  public addSlideNode(rawSlide: RawSlide): SlideNode {
    const slideNode = this.buildSlideNode(rawSlide)
    this.updateNavigationReferences(slideNode, rawSlide.childLevel)
    this.updateParentStack(rawSlide.childLevel, slideNode)
    this.maxDepthReached = Math.max(this.maxDepthReached, rawSlide.childLevel)
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
  private buildSlideNode(rawSlide: RawSlide): SlideNode {
    const slideNode: SlideNode = {
      id: this.generateSlideId(),
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

    this.slideNodes.push(slideNode)
    return slideNode
  }

  /**
   * Generates a new slide ID
   */
  private generateSlideId(): string {
    return `s${this.slideNodes.length + 1}`
  }

  /**
   * Updates navigation references before updating the parent stack
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

      // Only connect back if we haven't gone too deep since the previous sibling
      const depthSincePrevious = this.maxDepthReached - level
      if (depthSincePrevious <= 1) {
        previousSibling.navigation.nextSlideId = currentNode.id
      }
    }
  }

  /**
   * Updates the parent stack to track the most recent slide at each level
   */
  private updateParentStack(level: number, currentNode: SlideNode): void {
    // Truncate the stack to the current level (removes deeper levels)
    this.parentStack.length = level

    // Add current node as the most recent slide at this level
    this.parentStack[level] = currentNode
  }
}
