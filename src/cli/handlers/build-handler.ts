import { BuildCommandOptions } from '../../types/cli'
import { discoverPresentations } from '../../core/discovery'
import { inflate } from '../../core/presentation-inflator'
import { parsePresentation } from '../../core/parser'
import { copySourceAssets } from '../../core/asset-copier'
import { toHtml } from '../../core/generator/generateHtml'
import { toMdx } from '../../core/generator/generateMdx'
import { Logger } from '../../utils/logger'
import { LogLevel } from '../../types/logger'
import { PasAsyncResult, ok, err, createError, ErrorCode } from '../../utils/error'
import { cleanDir } from '../../utils/fs-utils'

/**
 * Handler function for the build command
 * Takes clean typed options object instead of raw yargs arguments
 */
export async function buildHandler(options: BuildCommandOptions): PasAsyncResult<void> {
  const logLevel = options.quiet ? LogLevel.ERROR : options.verbose ? LogLevel.DEBUG : LogLevel.INFO
  const logger = Logger.getInstance(logLevel)

  // Clean output directory if requested
  if (options.clean) {
    logger.info(`Cleaning output directory: ${options.outputDir}`)
    const cleanResult = await cleanDir(options.outputDir)
    if (cleanResult.isErr()) {
      return logError(cleanResult, `Failed to clean output directory ${options.outputDir}:`)
    }
    logger.info('Output directory cleaned successfully')
  }

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
    } else if (options.format === 'mdx') {
      // Generate MDX files for each slide
      const fs = await import('fs')
      const path = await import('path')
      
      for (let i = 0; i < slideNodes.length; i++) {
        const slideNode = slideNodes[i]
        const mdxContent = toMdx(slideNode)
        const fileName = `slide-${i + 1}.mdx`
        const filePath = path.join(options.outputDir, fileName)
        
        await fs.promises.writeFile(filePath, mdxContent, 'utf8')
      }
      
      logger.info(`Generated ${slideNodes.length} MDX slides in ${options.outputDir}`)
    } else if (options.format === 'md') {
      // Generate MD files for each slide (without frontmatter)
      const fs = await import('fs')
      const path = await import('path')
      
      for (let i = 0; i < slideNodes.length; i++) {
        const slideNode = slideNodes[i]
        const mdContent = slideNode.content // Just the content without frontmatter
        const fileName = `slide-${i + 1}.md`
        const filePath = path.join(options.outputDir, fileName)
        
        await fs.promises.writeFile(filePath, mdContent, 'utf8')
      }
      
      logger.info(`Generated ${slideNodes.length} MD slides in ${options.outputDir}`)
    } else {
      logger.info(`Format ${options.format} generation not yet implemented`)
    }

    return ok(undefined)
  }
}
