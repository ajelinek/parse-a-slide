import { Result } from 'neverthrow'
import { SlideNode } from '../../types/slide'
import { Processor } from '../../types/processor'
import { AppError, ok, err } from '../../utils/error'

/**
 * Apply all processors to all slide nodes in sequence
 */
export function applyProcessors(slideNodes: SlideNode[], processors: Processor[]): Result<SlideNode[], AppError> {
  if (processors.length === 0) {
    return ok(slideNodes)
  }

  const processedNodes: SlideNode[] = []

  for (const node of slideNodes) {
    const result = applyProcessorToSlide(node, processors)
    if (result.isErr()) {
      return err(result.error)
    }
    processedNodes.push(result.value)
  }

  return ok(processedNodes)
}

/**
 * Apply a sequence of processors to a single slide
 */
export function applyProcessorToSlide(slideNode: SlideNode, processors: Processor[]): Result<SlideNode, AppError> {
  let processedNode = slideNode

  for (const processor of processors) {
    const result = processor.process(processedNode)
    if (result.isErr()) {
      return err(result.error)
    }

    const validationResult = validateProcessorResult(processedNode, result.value)
    if (validationResult.isErr()) {
      return err(validationResult.error)
    }

    processedNode = result.value
  }

  return ok(processedNode)
}

/**
 * Validate that processor didn't break required slide properties
 */
export function validateProcessorResult(originalSlide: SlideNode, processedSlide: SlideNode): Result<void, AppError> {
  // Basic validation - ensure required properties are still present
  if (!processedSlide.id || !processedSlide.url || !processedSlide.navigation) {
    return err(new AppError('Processor corrupted required slide properties', 'PROCESSOR_VALIDATION_ERROR' as any))
  }

  // Ensure ID hasn't changed (processors shouldn't modify slide IDs)
  if (processedSlide.id !== originalSlide.id) {
    return err(
      new AppError(
        `Processor illegally modified slide ID from ${originalSlide.id} to ${processedSlide.id}`,
        'PROCESSOR_VALIDATION_ERROR' as any
      )
    )
  }

  return ok(undefined)
}
