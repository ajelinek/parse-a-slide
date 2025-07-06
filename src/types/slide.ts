import { FrontMatter } from './frontmatter'

/**
 * Represents a single slide in a presentation.
 */
export interface SlideNode {
  id: string
  url: string
  navigation: SlideNavigation
  content: string
  assets?: Asset[]
  fragmentPath: string // ID of the fragment this slide originated from
  frontMatter?: FrontMatter // All metadata from YAML front matter
}

/**
 * Navigation data for a slide.
 * Defines the relationships between slides.
 */
export interface SlideNavigation {
  parentSlideId: string | null
  childSlideId: string | null
  previousSlideId: string | null
  nextSlideId: string | null
}

/**
 * Asset associated with a slide.
 */
export interface Asset {
  path: string
  data?: any // In-memory representation of the asset
}

/**
 * Represents a collection of SlideNode objects.
 */
export type SlideNodes = SlideNode[]
