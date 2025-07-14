/**
 * Represents a single node in the slide hierarchy for the HTML context menu.
 */
export interface SlideHierarchy {
  title: string;
  url: string;
  children: SlideHierarchy[];
}
