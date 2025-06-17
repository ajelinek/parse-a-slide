import { Result } from 'neverthrow'
import { AppError, ErrorCode, createError, ok, err } from '../../utils/error'
import { GlobalContext, ParentStackItem } from './types'

/**
 * Create and initialize global parsing context
 */
export function createGlobalContext(): GlobalContext {
  return {
    slideNodes: [],
    globalTopLevelCount: 0,
    globalParentStack: [],
    fragmentProcessingStack: [],
  }
}

/**
 * Add fragment to processing stack with circular reference detection
 */
export function pushFragmentToStack(context: GlobalContext, fragmentPath: string): Result<void, AppError> {
  if (context.fragmentProcessingStack.includes(fragmentPath)) {
    return err(createError('Circular reference detected', ErrorCode.PARSER_CIRCULAR_REFERENCE))
  }

  context.fragmentProcessingStack.push(fragmentPath)
  return ok(undefined)
}

/**
 * Remove last fragment from processing stack
 */
export function popFragmentFromStack(context: GlobalContext): string | null {
  return context.fragmentProcessingStack.pop() || null
}

/**
 * Update parent stack when new slides are created
 */
export function updateParentStack(context: GlobalContext, slideId: string, level: number): void {
  // Clear any deeper levels first
  clearDeeperLevels(context, level + 1)

  // Add or update the current level
  context.globalParentStack[level] = { id: slideId, level }
}

/**
 * Clear parent stack entries deeper than specified level
 */
export function clearDeeperLevels(context: GlobalContext, fromLevel: number): void {
  context.globalParentStack = context.globalParentStack.filter(item => item.level < fromLevel)
}

/**
 * Find parent for a given child level
 */
export function findParent(parentStack: ParentStackItem[], childLevel: number): ParentStackItem | null {
  for (let i = parentStack.length - 1; i >= 0; i--) {
    if (parentStack[i].level < childLevel) {
      return parentStack[i]
    }
  }
  return null
}

/**
 * Increment and return the global top-level slide count
 */
export function incrementTopLevelCount(context: GlobalContext): number {
  return ++context.globalTopLevelCount
}

/**
 * Adjust global counter (used for fragment substitution naming)
 */
export function adjustTopLevelCount(context: GlobalContext, adjustment: number): void {
  context.globalTopLevelCount += adjustment
}
