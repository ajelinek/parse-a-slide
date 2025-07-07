/**
 * Represents a single file copy operation, containing the source and destination paths.
 */
export type CopyOperation = {
  source: string
  target: string
}

/**
 * Represents the aggregated result of a copy process, including total counts and counts by file extension.
 */
export type CopyResult = {
  total: number
  skipped: number
  byExtension: Record<string, number>
}
