export type ParsedBuildArgs = {
  input: (string | number)[]
  'output-dir': string
  format: 'md' | 'mdx' | 'html'
  watch: boolean
  clean: boolean
  verbose: boolean
  [key: string]: unknown
}
