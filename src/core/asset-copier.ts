import path from 'path'
import { CopyOperation, CopyResult } from '../types/asset-copier'
import { PasAsyncResult, PasResult, ok, err, createError, ErrorCode } from '../utils/error'
import { pathExists, copyFile } from '../utils/fs-utils'
import { Logger } from '../utils/logger'
import { globSync } from 'glob'
import { fromThrowable } from 'neverthrow'

export async function copySourceAssets(sourceDir: string, outputDir: string): PasAsyncResult<CopyResult> {
  const logger = Logger.getInstance()
  const result: CopyResult = {
    total: 0,
    skipped: 0,
    byExtension: {},
  }

  const sourceExistsResult = await pathExists(sourceDir)
  if (sourceExistsResult.isErr()) {
    return err(sourceExistsResult.error)
  }

  if (!sourceExistsResult.value) {
    return err(createError(`Directory not found: ${sourceDir}`, ErrorCode.DIRECTORY_NOT_FOUND))
  }

  const filesResult = findAssetFiles(sourceDir)
  if (filesResult.isErr()) {
    return err(filesResult.error)
  }

  const copyOperations = createCopyOperations(filesResult.value, sourceDir, outputDir)
  await processCopyOperations(copyOperations, result, logger)

  logger.info(`Asset copying completed: ${result.total} files copied, ${result.skipped} skipped`)
  return ok(result)
}

function findAssetFiles(sourceDir: string): PasResult<string[]> {
  const safeGlobSync = fromThrowable(
    (dir: string) => globSync('**/*', { cwd: dir, absolute: true, nodir: true }),
    error => {
      const errorObj = error as { message?: string }
      return createError(
        `Error finding files in ${sourceDir}: ${errorObj.message || 'Unknown error'}`,
        ErrorCode.IO_ERROR
      )
    }
  )

  return safeGlobSync(sourceDir).map(allFiles => allFiles.filter(isPresentationFile))
}

function createCopyOperations(assetFiles: string[], sourceDir: string, outputDir: string): CopyOperation[] {
  return assetFiles.map(sourceFile => {
    const relativePath = path.relative(sourceDir, sourceFile)
    const targetPath = path.join(outputDir, relativePath)

    return {
      source: sourceFile,
      target: targetPath,
    }
  })
}

async function processCopyOperations(
  copyOperations: CopyOperation[],
  result: CopyResult,
  logger: Logger
): Promise<void> {
  const copyPromises = copyOperations.map(async operation => {
    const copyResult = await copyFile(operation.source, operation.target)

    if (copyResult.isOk()) {
      const extension = path.extname(operation.source).toLowerCase().replace('.', '')
      result.total++
      result.byExtension[extension] = (result.byExtension[extension] || 0) + 1
    } else {
      logger.error(`Failed to copy file: ${operation.source}`, copyResult.error)
      result.skipped++
    }
  })

  await Promise.all(copyPromises)
}

function isPresentationFile(file: string): boolean {
  const fileName = path.basename(file)
  return !fileName.includes('.pres.md') && !fileName.includes('.pres.mdx')
}
