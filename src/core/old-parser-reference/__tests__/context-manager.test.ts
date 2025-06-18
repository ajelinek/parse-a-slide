import { expect, test } from 'vitest'
import {
  createGlobalContext,
  pushFragmentToStack,
  popFragmentFromStack,
  updateParentStack,
  clearDeeperLevels,
  findParent,
  incrementTopLevelCount,
} from '../context-manager'

function setUp() {
  return {
    context: createGlobalContext(),
  }
}

test('createGlobalContext should create initialized global context', () => {
  const context = createGlobalContext()

  expect(context.slideNodes).toEqual([])
  expect(context.globalTopLevelCount).toBe(0)
  expect(context.globalParentStack).toEqual([])
  expect(context.fragmentProcessingStack).toEqual([])
})

test('createGlobalContext should create fresh context each time', () => {
  const context1 = createGlobalContext()
  const context2 = createGlobalContext()

  expect(context1).not.toBe(context2)
  expect(context1.slideNodes).not.toBe(context2.slideNodes)
  expect(context1.globalParentStack).not.toBe(context2.globalParentStack)
})

test('pushFragmentToStack should add fragment to processing stack', () => {
  const { context } = setUp()
  const fragmentPath = '/test/fragment.pres.md'

  const result = pushFragmentToStack(context, fragmentPath)

  expect(result.isOk()).toBe(true)
  expect(context.fragmentProcessingStack).toEqual([fragmentPath])
})

test('pushFragmentToStack should detect circular reference', () => {
  const { context } = setUp()
  const fragmentPath = '/test/fragment.pres.md'

  context.fragmentProcessingStack.push(fragmentPath)

  const result = pushFragmentToStack(context, fragmentPath)

  expect(result.isErr()).toBe(true)
  if (result.isErr()) {
    expect(result.error.message).toContain('Circular reference')
  }
})

test('pushFragmentToStack should allow different fragments', () => {
  const { context } = setUp()
  const fragment1 = '/test/fragment1.pres.md'
  const fragment2 = '/test/fragment2.pres.md'

  const result1 = pushFragmentToStack(context, fragment1)
  const result2 = pushFragmentToStack(context, fragment2)

  expect(result1.isOk()).toBe(true)
  expect(result2.isOk()).toBe(true)
  expect(context.fragmentProcessingStack).toEqual([fragment1, fragment2])
})

test('popFragmentFromStack should remove last fragment from stack', () => {
  const { context } = setUp()
  const fragmentPath = '/test/fragment.pres.md'

  context.fragmentProcessingStack.push(fragmentPath)

  const popped = popFragmentFromStack(context)

  expect(popped).toBe(fragmentPath)
  expect(context.fragmentProcessingStack).toEqual([])
})

test('popFragmentFromStack should return null for empty stack', () => {
  const { context } = setUp()

  const popped = popFragmentFromStack(context)

  expect(popped).toBeNull()
})

test('popFragmentFromStack should handle single item stack', () => {
  const { context } = setUp()
  const fragmentPath = '/test/fragment.pres.md'

  context.fragmentProcessingStack.push(fragmentPath)

  const popped = popFragmentFromStack(context)

  expect(popped).toBe(fragmentPath)
  expect(context.fragmentProcessingStack).toEqual([])
})

test('updateParentStack should add slide to parent stack', () => {
  const { context } = setUp()

  updateParentStack(context, 'S1', 0)

  expect(context.globalParentStack).toEqual([{ id: 'S1', level: 0 }])
})

test('updateParentStack should maintain stack for multiple levels', () => {
  const { context } = setUp()

  updateParentStack(context, 'S1', 0)
  updateParentStack(context, 'S1C1', 1)

  expect(context.globalParentStack).toEqual([
    { id: 'S1', level: 0 },
    { id: 'S1C1', level: 1 },
  ])
})

test('updateParentStack should clear deeper levels when moving up', () => {
  const { context } = setUp()

  context.globalParentStack = [
    { id: 'S1', level: 0 },
    { id: 'S1C1', level: 1 },
    { id: 'S1C1C1', level: 2 },
  ]

  updateParentStack(context, 'S1C2', 1)

  expect(context.globalParentStack).toEqual([
    { id: 'S1', level: 0 },
    { id: 'S1C2', level: 1 },
  ])
})

test('clearDeeperLevels should clear levels deeper than specified', () => {
  const { context } = setUp()

  context.globalParentStack = [
    { id: 'S1', level: 0 },
    { id: 'S1C1', level: 1 },
    { id: 'S1C1C1', level: 2 },
  ]

  clearDeeperLevels(context, 1)

  expect(context.globalParentStack).toHaveLength(1)
  expect(context.globalParentStack[0]).toEqual({ id: 'S1', level: 0 })
})

test('clearDeeperLevels should handle clearing all levels', () => {
  const { context } = setUp()

  context.globalParentStack = [
    { id: 'S1', level: 0 },
    { id: 'S1C1', level: 1 },
  ]

  clearDeeperLevels(context, 0)

  expect(context.globalParentStack).toHaveLength(0)
})

test('clearDeeperLevels should not affect levels at or above threshold', () => {
  const { context } = setUp()

  context.globalParentStack = [
    { id: 'S1', level: 0 },
    { id: 'S1C1', level: 1 },
    { id: 'S1C1C1', level: 2 },
  ]

  clearDeeperLevels(context, 3)

  expect(context.globalParentStack).toEqual([
    { id: 'S1', level: 0 },
    { id: 'S1C1', level: 1 },
    { id: 'S1C1C1', level: 2 },
  ])
})

test('findParent should find parent at specified level', () => {
  const parentStack = [
    { id: 'S1', level: 0 },
    { id: 'S1C1', level: 1 },
  ]

  const parent = findParent(parentStack, 2)

  expect(parent).toEqual({ id: 'S1C1', level: 1 })
})

test('findParent should return null if level not found', () => {
  const parentStack = [
    { id: 'S1', level: 0 },
    { id: 'S1C1', level: 1 },
  ]

  const parent = findParent(parentStack, 0)

  expect(parent).toBeNull()
})

test('findParent should handle empty parent stack', () => {
  const parentStack: any[] = []

  const parent = findParent(parentStack, 1)

  expect(parent).toBeNull()
})

test('incrementTopLevelCount should increment global top level count', () => {
  const { context } = setUp()

  const count1 = incrementTopLevelCount(context)
  const count2 = incrementTopLevelCount(context)

  expect(count1).toBe(1)
  expect(count2).toBe(2)
  expect(context.globalTopLevelCount).toBe(2)
})

test('incrementTopLevelCount should continue incrementing', () => {
  const { context } = setUp()

  context.globalTopLevelCount = 5

  const count = incrementTopLevelCount(context)

  expect(count).toBe(6)
  expect(context.globalTopLevelCount).toBe(6)
})
