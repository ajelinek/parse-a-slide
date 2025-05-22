import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'

export const cli = async (args: string[]) => {
  return yargs(hideBin(args))
    .usage('Usage: $0 <command> [options]')
    .command('build', 'Build the project', yargs => {
      return yargs.option('output', {
        alias: 'o',
        describe: 'Output directory',
        type: 'string',
        default: 'dist',
      })
    })
    .example('$0 build', 'Build with default settings')
    .example('$0 build --help', 'Show help for build command')
    .example('$0 --help', 'Show help information')
    .help('help')
    .alias('help', 'h')
    .describe('help', 'Show help information')
    .version()
    .alias('version', 'v')
    .exitProcess(false)
    .parse()
}

export default cli
