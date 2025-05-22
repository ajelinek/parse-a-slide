import { buildHandler } from '../handlers/build-handler'

// Export a basic command module that can be used directly with yargs.command()
export const buildCommand = {
  command: 'build',
  describe: 'Process presentation source files and generate specified output format',
  builder: {
    input: {
      describe: 'Input source file(s) or glob patterns',
      type: 'array' as const,
      demandOption: true,
    },
    'output-dir': {
      alias: 'o',
      describe: 'Directory for output files',
      type: 'string' as const,
      default: './dist_slides',
    },
    format: {
      alias: 'f',
      describe: 'Output format type',
      choices: ['md', 'mdx', 'html'] as const,
      type: 'string' as const,
      default: 'mdx',
    },
    watch: {
      alias: 'w',
      describe: 'Enable watch mode for automatic rebuilding on file changes',
      type: 'boolean' as const,
      default: false,
    },
    clean: {
      describe: 'Clean the output directory before building',
      type: 'boolean' as const,
      default: false,
    },
    verbose: {
      alias: 'v',
      describe: 'Enable verbose logging',
      type: 'boolean' as const,
      default: false,
    },
  },
  handler: buildHandler,
}
