import { expect, test } from 'vitest'
import { isEmbeddedFragment, extractFragmentPath } from '../parser-utils'

test('isEmbeddedFragment should return true for content containing only a fragment reference', () => {
  expect(isEmbeddedFragment('[title](path/to/file.pres.md)')).toBe(true)
  expect(isEmbeddedFragment('[another title](file.pres.mdx)')).toBe(true)
  expect(isEmbeddedFragment('  [title](path/to/file.pres.md)  ')).toBe(true)
  expect(isEmbeddedFragment('\n[title](path/to/file.pres.md)\n')).toBe(true)
  expect(isEmbeddedFragment('\t[title](path/to/file.pres.md)\r\n')).toBe(true)
  expect(isEmbeddedFragment(' \n  [complex title with spaces](./path/to/file.pres.md)  \n')).toBe(true)
})

test('isEmbeddedFragment should return false for content with characters beyond the fragment reference', () => {
  expect(isEmbeddedFragment('Text before [title](path/to/file.pres.md)')).toBe(false)
  expect(isEmbeddedFragment('[title](path/to/file.pres.md) text after')).toBe(false)
  expect(isEmbeddedFragment('Line before\n[title](path/to/file.pres.md)')).toBe(false)
  expect(isEmbeddedFragment('[title](path/to/file.pres.md)\nLine after')).toBe(false)
  expect(isEmbeddedFragment('* [title](path/to/file.pres.md)')).toBe(false)
})

test('isEmbeddedFragment should return false for non-fragment content', () => {
  expect(isEmbeddedFragment('')).toBe(false)
  expect(isEmbeddedFragment('  ')).toBe(false)
  expect(isEmbeddedFragment('regular text')).toBe(false)
  expect(isEmbeddedFragment('[title](path/to/file.md)')).toBe(false)
  expect(isEmbeddedFragment('[title](path/to/file.pres.txt)')).toBe(false)
  expect(isEmbeddedFragment('![image](path/to/file.pres.md)')).toBe(false)
})

test('isEmbeddedFragment should return false for malformed fragment references', () => {
  expect(isEmbeddedFragment('[title](path/to/file.pres.md')).toBe(false)
  expect(isEmbeddedFragment('title](path/to/file.pres.md)')).toBe(false)
  expect(isEmbeddedFragment('[title(path/to/file.pres.md)')).toBe(false)
})

test('extractFragmentPath should extract path from standard fragment reference', () => {
  expect(extractFragmentPath('[Fragment Title](path/to/file.pres.md)')).toBe('path/to/file.pres.md')
})

test('extractFragmentPath should extract path from fragment reference with whitespace', () => {
  expect(extractFragmentPath('  [Fragment Title](path/to/file.pres.md)  ')).toBe('path/to/file.pres.md')
  expect(extractFragmentPath('\n[Fragment Title](path/to/file.pres.md)\n')).toBe('path/to/file.pres.md')
  expect(extractFragmentPath('\t[Fragment Title](path/to/file.pres.md)\r\n')).toBe('path/to/file.pres.md')
})

test('extractFragmentPath should extract path from fragment reference with mdx extension', () => {
  expect(extractFragmentPath('[Fragment Title](path/to/file.pres.mdx)')).toBe('path/to/file.pres.mdx')
})

test('extractFragmentPath should handle paths with special characters', () => {
  expect(extractFragmentPath('[Complex Path](./path-with_special.chars/file.pres.md)')).toBe('./path-with_special.chars/file.pres.md')
  expect(extractFragmentPath('[Path with spaces](./path with spaces/file.pres.md)')).toBe('./path with spaces/file.pres.md')
})

test('extractFragmentPath should return null for non-matching content', () => {
  expect(extractFragmentPath('Regular content')).toBeNull()
  expect(extractFragmentPath('[Not a fragment](regular-file.md)')).toBeNull()
  expect(extractFragmentPath('[Fragment with wrong extension](file.md)')).toBeNull()
  expect(extractFragmentPath('[Fragment with wrong extension](file.pres.txt)')).toBeNull()
})

test('extractFragmentPath should return null for malformed fragment references', () => {
  expect(extractFragmentPath('[title](path/to/file.pres.md')).toBeNull()
  expect(extractFragmentPath('title](path/to/file.pres.md)')).toBeNull()
  expect(extractFragmentPath('[title(path/to/file.pres.md)')).toBeNull()
})
