/**
 * Represents a single slide in a presentation.
 */
export interface SlideNode {
  id: string
  url: string
  title?: string
  description?: string
  date?: string
  author?:
    | {
        name: string
        email?: string
        website?: string
      }
    | string
  navigation: SlideNavigation
  userDefinedFrontMatter?: Record<string, unknown>
  appearance?: SlideAppearance
  content: string
  assets?: Asset[]
  fragmentPath: string // ID of the fragment this slide originated from
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
 * Slide appearance configuration.
 */
export interface SlideAppearance {
  theme?: string
  transition?: string
  backgroundImage?: string
  layout?: string
  [key: string]: any // For additional rendering-specific attributes
}

/**
 * Represents a collection of SlideNode objects.
 */
export type SlideNodes = SlideNode[]
