/**
 * Metadata for a presentation fragment.
 */
export interface FragmentMetadata {
  id: string // A unique identifier generated for the fragment
  name: string // The name of the fragment file
  fullPath: string // The absolute file system path to the fragment file
  relativePath: string // The path of the fragment relative to the presentation root
  extension: string // The file extension of the fragment
  isEntry: boolean // Indicates if this fragment is the main entry point of the presentation (e.g., `index.pres`)
}

/**
 * Fragment with content loaded from file system.
 * Extends FragmentMetadata and adds the actual content of the fragment file.
 */
export interface Fragment extends FragmentMetadata {
  content: string // The content of the fragment file
}

/**
 * Metadata for a presentation.
 */
export interface PresentationMetadata {
  id: string // A unique identifier generated for the presentation
  url: string // A URL representing the presentation
  fullPath: string // The absolute file system path to the presentation's entry point
  name: string // The name of the presentation (e.g., directory name for `index.pres` or the filename itself)
  extension: string // The file extension of the presentation's entry point
  entrySlideId: string // ID of the entry slide
  fragmentMetaData: FragmentMetadata[] // Array of fragment metadata
}
