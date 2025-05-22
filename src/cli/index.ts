import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { buildCommand } from './commands/build-command'

export const cli = async (args: string[]) => {
  return (
    yargs(hideBin(args))
      .usage('Usage: $0 <command> [options]')
      .command(buildCommand)
      .example('$0 build --input="./deck.md"', 'Process a single presentation file')
      .example('$0 build --help', 'Show detailed help for build command')
      .example('$0 --help', 'Show general help information')
      .epilogue('For more information, visit https://github.com/username/parse-a-slide')
      .help('help')
      .alias('help', 'h')
      .describe('help', 'Show help information')
      .version()
      // Version has no alias to avoid conflict with -v for verbose
      .describe('version', 'Show version information')
      .demandCommand(1, 'A command is required. Use build or --help for available commands')
      .strict()
      .exitProcess(false)
      .parseAsync()
  )
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
