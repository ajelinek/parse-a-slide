import { SlideNode, SlideNavigation } from '../../types/slide'
import { RawSlide } from './fragment-splitter'

/**
 * Responsible for building SlideNode objects from RawSlide input
 * and managing the hierarchy of slides via a parent stack.
 */
export class SlideNodeBuilder {
  private slideNodes: SlideNode[] = []
  private parentStack: { level: number; node: SlideNode }[] = []

  public addSlideNode(rawSlide: RawSlide): SlideNode {
    const slideNode = this.buildSlideNode(rawSlide)
    this.updateParentStack(rawSlide.childLevel, slideNode)
    this.updateNavigationReferences(slideNode)
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
   * Updates the parent stack based on the level of the current slide
   */
  private updateParentStack(level: number, currentNode: SlideNode): void {
    // Remove any items from the stack that are at a higher or equal level
    while (this.parentStack.length > 0 && this.parentStack[this.parentStack.length - 1].level >= level) {
      this.parentStack.pop()
    }

    // If there's a parent in the stack, update the navigation references
    if (this.parentStack.length > 0) {
      const parent = this.parentStack[this.parentStack.length - 1].node
      currentNode.navigation.parentSlideId = parent.id

      // If the parent doesn't have a child yet, set this as the child
      if (parent.navigation.childSlideId === null) {
        parent.navigation.childSlideId = currentNode.id
      }
    }

    // Add the current node to the parent stack
    this.parentStack.push({ level, node: currentNode })
  }

  /**
   * Updates navigation references (previous/next) for the current slide
   */
  private updateNavigationReferences(currentNode: SlideNode): void {
    // Find siblings (nodes with the same parent)
    const siblings = this.slideNodes.filter(
      node => node.navigation.parentSlideId === currentNode.navigation.parentSlideId && node.id !== currentNode.id
    )

    // Find the most recent sibling (which should be the previous slide)
    const previousSibling = siblings.length > 0 ? siblings[siblings.length - 1] : null

    if (previousSibling) {
      // Update the previous slide's next reference
      previousSibling.navigation.nextSlideId = currentNode.id
      // Update the current slide's previous reference
      currentNode.navigation.previousSlideId = previousSibling.id
    }
  }
}
