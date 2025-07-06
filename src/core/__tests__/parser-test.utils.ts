import { Result } from 'neverthrow'
import { expect } from 'vitest'
import {
  ContentMap,
  filterValidRows,
  parseMarkdownTable,
  toNullable,
  trimContent,
} from '../../test-utils/markdown-table-util'
import { Fragment, Presentation } from '../../types/presentation'
import { SlideNode, SlideNavigation } from '../../types/slide'
import { AppError, ErrorCode } from '../../utils/error'

/**
 * Normalizes content by trimming whitespace and ensuring consistent newlines
 */
export function normalizeContent(content: string): string {
  return content.trim().replace(/\r\n/g, '\n')
}

/**
 * Helper function to assert a successful result
 */
export function assertSuccessResult<T>(result: Result<T, AppError>): T {
  expect(result.isOk()).toBe(true)
  return result._unsafeUnwrap()
}

/**
 * Helper function to assert an error result
 */
export function assertErrorResult(result: Result<any, AppError>, code: ErrorCode, messageContains?: string): void {
  expect(result.isErr()).toBe(true)
  const error = result._unsafeUnwrapErr()
  expect(error.code).toBe(code)
  if (messageContains) {
    expect(error.message).toContain(messageContains)
  }
}

/**
 * Interface for slide table rows without content field
 */
export interface SlideTableRow extends Record<string, string> {
  id: string
  parentSlideId: string
  childSlideId: string
  previousSlideId: string
  nextSlideId: string
}

/**
 * Creates slide nodes by combining a table of structure/navigation with a separate content map
 * @param markdownTable Table with slide structure and navigation (without content)
 * @param contentMap Map of slide content by ID
 * @param presentationName The presentation name to use for URLs
 * @returns An array of partial SlideNode objects
 */
export function createSlidesFromTableAndContent(
  markdownTable: string,
  contentMap: ContentMap,
  presentationName = 'presentation1'
): Partial<SlideNode>[] {
  // Parse the markdown table into rows of data
  const rows = parseMarkdownTable<SlideTableRow>(markdownTable)

  // Convert rows to SlideNode objects with proper type safety
  return rows.map((row: SlideTableRow) => {
    // Get content from map or use empty string if not found
    const content = contentMap[row.id] || ''

    // Ensure all navigation properties are explicitly null (not undefined) when missing
    const navigation: SlideNavigation = {
      parentSlideId: toNullable(row.parentSlideId || 'null'),
      childSlideId: toNullable(row.childSlideId || 'null'),
      previousSlideId: toNullable(row.previousSlideId || 'null'),
      nextSlideId: toNullable(row.nextSlideId || 'null'),
    }

    return {
      id: row.id,
      url: `/${presentationName}/${row.id}`,
      content: trimContent(content),
      navigation,
      fragmentPath: expect.any(String) as string,
    }
  })
}

/**
 * Simple assertion for slide nodes that checks existence by ID and content matching
 * with normalization for whitespace differences
 */
export function assertSlideNodes(actual: SlideNode[], expected: Partial<SlideNode>[]) {
  // Filter out invalid nodes
  const validExpected = filterValidRows(expected)

  // For each expected node, find and verify the matching actual node
  validExpected.forEach(expectedNode => {
    // Find matching node by ID
    const matchingNode = actual.find(node => node.id === expectedNode.id)

    // Assert node exists
    expect(matchingNode, `No slide with ID ${expectedNode.id} was found`).toBeDefined()
    if (!matchingNode) return

    // Assert content matches after normalization
    if (expectedNode.content) {
      const normalizedActual = normalizeContent(matchingNode.content)
      const normalizedExpected = normalizeContent(expectedNode.content)
      expect(normalizedActual).toBe(normalizedExpected)
    }

    // Verify navigation properties as a complete object
    if (expectedNode.navigation) {
      expect(matchingNode.navigation).toEqual(expectedNode.navigation)
    }
  })
}

/**
 * Processes content to remove indentation from template literals
 */
export function processContent(content: string): string {
  return content
    .trim()
    .split('\n')
    .map(line => line.trimStart())
    .join('\n')
}

/**
 * Creates a Fragment object with the given properties
 */
export function createFragment(content: string, id: string, relativePath: string, isEntry: boolean = false): Fragment {
  return {
    id,
    name: relativePath.split('/').pop() || `${id}.pres.md`,
    fullPath: `/path/to/${relativePath}`,
    relativePath,
    extension: '.md',
    isEntry,
    content: processContent(content),
  }
}

/**
 * Creates a Presentation object with the given fragments
 */
export function createPresentation(fragments: Fragment[]): Presentation {
  return {
    metadata: {
      id: 'presentation1',
      url: '/presentation1',
      fullPath: '/path/to/presentation',
      name: 'presentation1',
      extension: '.md',
      entrySlideId: 'S1',
      fragmentMetaData: fragments,
    },
    fragments,
  }
}

export function createTestData(
  content: Record<string, string>,
  structureTable: string
): {
  expectedSlides: Partial<SlideNode>[]
} {
  const contentMap = content as ContentMap
  const expectedSlides = createSlidesFromTableAndContent(structureTable, contentMap)

  return {
    expectedSlides,
  }
}
