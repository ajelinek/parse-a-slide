#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { helloWorld } from './index' // Example import

yargs(hideBin(process.argv))
  .command(
    'hello',
    'Prints a hello message',
    () => {},
    argv => {
      console.log(helloWorld())
      console.log('CLI is working!')
      console.log('Arguments:', argv)
    }
  )
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .alias('h', 'help')
  .parse()
