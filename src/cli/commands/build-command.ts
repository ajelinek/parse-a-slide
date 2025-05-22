import { Argv, ArgumentsCamelCase } from 'yargs'
import { buildHandler } from '../handlers/build-handler'
import { BuildCommandOptions, ParsedBuildArgs } from '../../types/cli'

/**
 * Converts raw yargs arguments to clean BuildCommandOptions
 */
function convertToHandlerOptions(args: ArgumentsCamelCase<ParsedBuildArgs>): BuildCommandOptions {
  return {
    input: args.input.map(item => String(item)), // Ensure all items are strings
    outputDir: args['output-dir'],
    format: args.format,
    watch: Boolean(args.watch),
    clean: Boolean(args.clean),
    verbose: Boolean(args.verbose),
  }
}

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
  // Convert yargs args to clean options before passing to handler
  handler: async (args: ArgumentsCamelCase<ParsedBuildArgs>) => {
    const options = convertToHandlerOptions(args)
    return buildHandler(options)
  },
}
