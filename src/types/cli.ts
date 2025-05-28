/**
 * Clean interface for build command options.
 * This keeps the handler implementation independent from yargs.
 */
export interface BuildCommandOptions {
  /** Input source file(s) or glob patterns */
  input: string[]

  /** Directory for output files */
  outputDir: string

  /** Output format type */
  format: 'md' | 'mdx' | 'html'

  /** Enable watch mode for automatic rebuilding on file changes */
  watch: boolean

  /** Clean the output directory before building */
  clean: boolean

  /** Enable verbose logging */
  verbose: boolean

  /** Suppress info-level logging (only show errors) */
  quiet: boolean
}

/**
 * Raw arguments from yargs for the build command
 */
export type ParsedBuildArgs = {
  input: (string | number)[]
  'output-dir': string
  format: 'md' | 'mdx' | 'html'
  watch: boolean
  clean: boolean
  verbose: boolean
  quiet: boolean
  [key: string]: unknown
}
