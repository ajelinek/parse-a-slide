import { BuildCommandOptions } from '../../types/cli'
import { discoverPresentations } from '../../core/discovery'
import { inflate } from '../../core/presentation-inflator'
import { parsePresentation } from '../../core/parser'
import { copySourceAssets } from '../../core/asset-copier'
import { toHtml } from '../../core/generator/generateHtml'
import { Logger } from '../../utils/logger'
import { LogLevel } from '../../types/logger'
import { PasAsyncResult, ok, err, createError, ErrorCode } from '../../utils/error'

/**
 * Handler function for the build command
 * Takes clean typed options object instead of raw yargs arguments
 */
export async function buildHandler(options: BuildCommandOptions): PasAsyncResult<void> {
  const logLevel = options.quiet ? LogLevel.ERROR : options.verbose ? LogLevel.DEBUG : LogLevel.INFO
  const logger = Logger.getInstance(logLevel)

  // Main execution flow
  for (const inputPath of options.input) {
    const processResult = await processInputPath(inputPath)
    if (processResult.isErr()) {
      return err(processResult.error)
    }
  }

  logger.info('Build completed successfully')
  return ok(undefined)

  // Helper functions
  function logError(result: any, message: string): PasAsyncResult<void> {
    logger.error(message, result.error)
    return Promise.resolve(err(result.error))
  }

  async function processInputPath(inputPath: string): PasAsyncResult<void> {
    logger.info(`Processing input: ${inputPath}`)

    const discoveryResult = await discoverPresentations(inputPath)
    if (discoveryResult.isErr()) return logError(discoveryResult, `Failed to discover presentations in ${inputPath}:`)

    const presentations = discoveryResult.value
    if (presentations.length === 0) {
      logger.info(`No presentations found in ${inputPath}`)
      return ok(undefined)
    }

    for (const presentationMetadata of presentations) {
      const processResult = await processSinglePresentation(presentationMetadata)
      if (processResult.isErr()) return err(processResult.error)
    }

    return ok(undefined)
  }

  async function processSinglePresentation(presentationMetadata: any): PasAsyncResult<void> {
    logger.info(`Processing presentation: ${presentationMetadata.name}`)

    const inflateResult = await inflate(presentationMetadata)
    if (inflateResult.isErr()) return logError(inflateResult, `Failed to inflate presentation ${presentationMetadata.name}:`)

    const presentation = inflateResult.value

    const parseResult = parsePresentation(presentation)
    if (parseResult.isErr()) return logError(parseResult, `Failed to parse presentation ${presentationMetadata.name}:`)

    const slideNodes = parseResult.value
    logger.info(`Generated ${slideNodes.length} slides for ${presentationMetadata.name}`)

    const copyResult = await copySourceAssets(presentationMetadata.fullPath, options.outputDir)
    if (copyResult.isErr()) return logError(copyResult, `Failed to copy assets for ${presentationMetadata.name}:`)

    const generateResult = await generateOutput(slideNodes, presentationMetadata)
    if (generateResult.isErr()) return err(generateResult.error)

    logger.info(`Successfully processed presentation: ${presentationMetadata.name}`)
    return ok(undefined)
  }

  async function generateOutput(slideNodes: any[], presentationMetadata: any): PasAsyncResult<void> {
    if (options.format === 'html') {
      await toHtml(slideNodes, {
        sourceDir: presentationMetadata.fullPath,
        outputDir: options.outputDir,
      })
    } else {
      logger.info(`Format ${options.format} generation not yet implemented`)
    }

    return ok(undefined)
  }
}
