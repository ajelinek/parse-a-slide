import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'

export const cli = async (args: string[]) => {
  return yargs(hideBin(args))
    .usage('Usage: $0 <command> [options]')
    .command('build', 'Process presentation source files and generate specified output format', yargs => {
      return yargs
        .option('input', {
          describe: 'Input source file(s) or glob patterns',
          type: 'array',
          demandOption: true,
        })
        .option('output-dir', {
          alias: 'o',
          describe: 'Directory for output files',
          type: 'string',
          default: './dist_slides',
        })
        .option('format', {
          alias: 'f',
          describe: 'Output format type',
          choices: ['md', 'mdx', 'html'],
          default: 'mdx',
        })
        .option('watch', {
          alias: 'w',
          describe: 'Enable watch mode for automatic rebuilding on file changes',
          type: 'boolean',
          default: false,
        })
        .option('clean', {
          describe: 'Clean the output directory before building',
          type: 'boolean',
          default: false,
        })
        .option('verbose', {
          alias: 'v',
          describe: 'Enable verbose logging',
          type: 'boolean',
          default: false,
        })
        .example('$0 build --input="./presentations/**/*.md"', 'Process all Markdown files in presentations directory')
        .example(
          '$0 build --input="./deck.md" --format="html" --output-dir="./site"',
          'Convert deck.md to HTML in site directory'
        )
        .example('$0 build --input="./slides/*.md" --watch', 'Process slides and watch for changes')
    })
    .example('$0 build --input="./deck.md"', 'Process a single presentation file')
    .example('$0 build --help', 'Show detailed help for build command')
    .example('$0 --help', 'Show general help information')
    .epilogue('For more information, visit https://github.com/username/parse-a-slide')
    .help('help')
    .alias('help', 'h')
    .describe('help', 'Show help information')
    .version()
    .alias('version', 'v')
    .describe('version', 'Show version information')
    .demandCommand(1, 'A command is required. Use build or --help for available commands')
    .strict()
    .exitProcess(false)
    .parse()
}

// Main function for CLI execution
if (require.main === module) {
  ;(async () => {
    try {
      await cli(process.argv)
    } catch (error) {
      console.error(error)
      process.exit(1)
    }
  })()
}

export default cli
