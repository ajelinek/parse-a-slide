import { Fragment } from '../../types/presentation'
import { SlideNode } from '../../types/slide'

/**
 * Interface for slide content segments after splitting by delimiters
 */
export interface SlideContent {
  content: string
  childLevel: number // 0 for not a child, 1+ for nested child levels
  isDelimiter: boolean
}

/**
 * Interface for fragment reference extracted from content
 */
export interface FragmentReference {
  fullMatch: string
  text: string
  path: string
}

/**
 * Global context for slide generation across all fragments
 */
export interface GlobalContext {
  slideNodes: SlideNode[]
  globalTopLevelCount: number
  globalParentStack: ParentStackItem[]
  fragmentProcessingStack: string[]
  childIdCounters?: Map<string, number> // Track child counts per parent
}

/**
 * Parent stack item for tracking hierarchy
 */
export interface ParentStackItem {
  id: string
  level: number
}

/**
 * Context for slide creation
 */
export interface SlideCreationContext {
  presentationName: string
  fragment: Fragment
  inheritedNestingLevel: number
}

/**
 * Context for fragment embedding
 */
export interface EmbeddingContext {
  embeddingLevel: number
  baseSlideId: string
  isFragmentSubstitution: boolean
}

/**
 * Information about generated slide ID
 */
export interface SlideIdInfo {
  id: string
  parentId: string | null
  level: number
}

/**
 * Delimiter information
 */
export interface DelimiterInfo {
  type: 'SIBLING' | 'CHILD'
  level: number
  position: number
}

/**
 * Navigation context for linking slides
 */
export interface NavigationContext {
  slideMap: Map<string, SlideNode>
  hierarchyLevels: Map<number, SlideNode[]>
  parentChildMap: Map<string, string[]>
  siblingGroups: Map<string, SlideNode[]>
}
