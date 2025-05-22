import { ArgumentsCamelCase } from 'yargs'

export async function buildHandler(args: ArgumentsCamelCase<any>) {
  console.log('BUILD HANDLER CALLED:', args)
}
