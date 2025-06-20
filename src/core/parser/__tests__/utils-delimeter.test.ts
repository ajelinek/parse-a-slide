import { test, expect } from 'vitest'
import { determineDelimiterLevel } from '../utils'

test('returns -1 for non-matching lines', () => {
  expect(determineDelimiterLevel('hello')).toBe(-1)
  expect(determineDelimiterLevel('')).toBe(-1)
  expect(determineDelimiterLevel('   ')).toBe(-1)
})

test('returns 0 for basic --- delimiter', () => {
  expect(determineDelimiterLevel('---')).toBe(0)
  expect(determineDelimiterLevel('--- ')).toBe(0)
  expect(determineDelimiterLevel(' ---')).toBe(0)
})

test('counts > characters after ---', () => {
  expect(determineDelimiterLevel('--->')).toBe(1)
  expect(determineDelimiterLevel('--->>')).toBe(2)
  expect(determineDelimiterLevel(' --->> ')).toBe(2)
  expect(determineDelimiterLevel('--->>>')).toBe(3)
  expect(determineDelimiterLevel('--->>>>')).toBe(4)
})

test('validates strict format requirements', () => {
  expect(determineDelimiterLevel('---')).toBe(0)
  expect(determineDelimiterLevel('---test')).toBe(-1)
  expect(determineDelimiterLevel('--- >')).toBe(-1)
})

test('line endings do not break the delimiter', () => {
  expect(determineDelimiterLevel('---\r\n')).toBe(0)
  expect(determineDelimiterLevel('---\r\n ')).toBe(0)
  expect(determineDelimiterLevel(' \r\n---')).toBe(0)
  expect(determineDelimiterLevel('--->\r\n')).toBe(1)
  expect(determineDelimiterLevel('--->>\r\n')).toBe(2)

  expect(determineDelimiterLevel('---\n')).toBe(0)
  expect(determineDelimiterLevel('---\n ')).toBe(0)
  expect(determineDelimiterLevel(' \n---')).toBe(0)
  expect(determineDelimiterLevel('--->\n')).toBe(1)
  expect(determineDelimiterLevel('--->>\n')).toBe(2)
})
