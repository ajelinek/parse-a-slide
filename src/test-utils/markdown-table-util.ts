/**
 * Markdown table parsing utilities for tests
 *
 * These utilities help parse markdown tables into JavaScript objects for use in tests.
 */

/**
 * Parses a markdown table into an array of objects
 * @param table Markdown table as a string
 * @returns Array of objects representing the table rows
 */
export function parseMarkdownTable<T extends Record<string, string>>(markdownTable: string): T[] {
  // Debug the raw input
  console.log('\n--- DEBUG parseMarkdownTable ---')
  console.log('Raw markdown table input:', JSON.stringify(markdownTable))

  // Split into lines and clean them up
  const lines = markdownTable
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  console.log('Lines after split/trim:', lines.length)
  console.log('Lines content:', JSON.stringify(lines))

  if (lines.length < 3) {
    console.log('Not enough lines, returning empty array')
    return []
  }

  // Extract header row (first row)
  const headerRow = lines[0]
  console.log('Header row:', JSON.stringify(headerRow))

  // Skip separator row (second row)
  const separatorRow = lines[1]
  console.log('Separator row:', JSON.stringify(separatorRow))

  // Process data rows (third row onward)
  const dataRows = lines.slice(2)
  console.log('Data rows count:', dataRows.length)
  console.log('Data rows:', JSON.stringify(dataRows))

  // Extract header cells
  const headers = headerRow
    .split('|')
    .map(cell => cell.trim())
    .filter(Boolean)

  console.log('Extracted headers:', JSON.stringify(headers))

  // Process data rows
  const results = dataRows.map((row, rowIndex) => {
    console.log(`Processing row ${rowIndex}:`, JSON.stringify(row))

    const cells = row
      .split('|')
      .map(cell => cell.trim())
      .filter((_, index) => index > 0 && index <= headers.length)

    console.log(`Row ${rowIndex} cells:`, JSON.stringify(cells))

    const result = {} as Record<string, string>
    headers.forEach((header, i) => {
      if (cells[i] !== undefined) {
        result[header] = cells[i]
        console.log(`Set ${header} =`, JSON.stringify(cells[i]))
      } else {
        result[header] = ''
        console.log(`Set ${header} = '' (empty)`)
      }
    })

    console.log(`Row ${rowIndex} result:`, result)
    return result as T
  })

  console.log('Final results count:', results.length)
  console.log('--- END DEBUG parseMarkdownTable ---\n')

  return results
}

/**
 * Converts a string value from a table cell to a nullable value
 * @param value String value from table cell
 * @returns Original string or null if the string was 'null'
 */
export function toNullable(value: string): string | null {
  return value === 'null' ? null : value
}

/**
 * Normalizes content for comparison by trimming whitespace consistently
 * This matches the processing done in test setup functions
 * @param content The content to normalize
 * @returns Normalized content string
 */
export function trimContent(content: string): string {
  return content
    .trim()
    .split('\n')
    .map(line => line.trimStart())
    .join('\n')
}

/**
 * Filters out invalid rows from parsed table data
 * @param rows Array of table rows
 * @returns Filtered array with only valid rows
 */
export function filterValidRows<T extends Record<string, any>>(rows: T[], idField = 'id'): T[] {
  return rows.filter(row => row && row[idField] && row[idField] !== 'null')
}

/**
 * Map of slide content by ID
 */
export type ContentMap = Record<string, string>
