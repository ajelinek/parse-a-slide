/**
 * Author information for slides
 */
export type Author = {
  name: string
  email?: string
  website?: string
}

export type FrontMatter = {
  title?: string
  description?: string
  date?: string
  author?: Author
  theme?: string
  transition?: string
  backgroundImage?: string
  layout?: string
  [key: string]: any
}
