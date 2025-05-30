# F5: Presentation Discovery

## Feature Overview

The Presentation Discovery module is responsible for finding presentation files (marked with `.pres.md` or `.pres.mdx` extensions) within a specified directory structure. It will distinguish between main presentations (`index.pres.md(x)`) and fragments (non-index presentation files), associate fragments with their respective main presentations, and return structured metadata about each presentation without loading their contents.

This module will serve as a critical foundation for the build process, enabling the system to identify all presentations in a project before parsing their contents.

## User Stories

- **S1**: Identify `index.pres.md(x)` files as main presentations.
- **S2**: Identify all non-`index.pres.md(x)` files (e.g., `anyname.pres.md(x)`) as fragments associated with the main presentation in their directory.
- **S3**: Return `PresentationMetadata` (paths only, no content) for each presentation.
- **S4**: Validate against conflicting `index.pres` files in the same directory.

## Implementation Details

### PresentationMetadata Type

```typescript
export interface PresentationMetadata {
  id: string // A unique identifier generated for the presentation
  url: string // A URL representing the presentation
  fullPath: string // The absolute file system path to the presentation's entry point
  name: string // The name of the presentation (e.g., directory name for `index.pres` or the filename itself)
  entrySlideId: string // ID of the entry slide
  fragmentMetaData: FragmentMetadata[] // Array of fragment metadata
}
```

### FragmentMetadata Type

```typescript
export interface FragmentMetadata {
  id: string // A unique identifier generated for the fragment
  name: string // The name of the fragment file
  fullPath: string // The absolute file system path to the fragment file
  relativePath: string // The path of the fragment relative to the presentation root
  extension: string // The file extension of the fragment
  isEntry: boolean // Indicates if this fragment is the main entry point of the presentation (e.g., `index.pres`)
}
```

### Discovery Module Implementation

The Discovery module will export a main function `discoverPresentations` that takes an input directory and returns metadata for all presentations found within it. It will:

1. Use existing `findFiles` utility to locate all `*.pres.md` and `*.pres.mdx` files
2. Group files by directory
3. For each directory with presentation files:
   - Identify the main entry point (`index.pres.md` or `index.pres.mdx`)
   - Create a unique ID for the presentation
   - Generate the `PresentationMetadata` object
   - For each fragment file (including the entry point):
     - Create a unique ID for the fragment
     - Generate the `FragmentMetadata` object with `isEntry` set appropriately
4. Validate that there are no conflicting index files (e.g., both `.md` and `.mdx`)
5. Return an array of `PresentationMetadata` objects for each valid presentation

The module will handle errors gracefully using the established `neverthrow` pattern and `PasResult` type.

### Internal Helper Types and Functions

```typescript
// Internal type to organize files by directory during discovery
type DirectoryFileMap = Map<string, string[]>

// Internal type to represent validated files in a directory
interface DirectoryPresFiles {
  indexFile?: string
  fragmentFiles: string[]
  format?: 'md' | 'mdx'
}

// Groups files by their parent directory
function groupFilesByDirectory(files: string[]): DirectoryFileMap {
  // Implementation details
}

// Validates files in a directory to ensure no conflicting index files
function validateDirectoryContents(files: string[]): Result<DirectoryPresFiles, AppError> {
  // Implementation details
}

// Creates metadata from validated files
function createPresentationMetadata(dir: string, files: DirectoryPresFiles): PresentationMetadata {
  // Implementation details
}
```

### Error Handling

The Discovery module will follow the established error handling pattern using neverthrow and the PasResult type for async operations. New error codes:

- **`CONFLICTING_INDEX_FILES`**: For when a directory contains multiple index files with different formats.
- **`NO_PRESENTATION_FILES`**: For when no presentation files are found in the specified directory.

## System Flow

1. User invokes the CLI build command with an input directory
2. The `BuildHandler` calls `Discovery.discoverPresentations(inputDir)`
3. The Discovery module:
   - Searches for all presentation files
   - Organizes them into presentation metadata objects
   - Validates the structure
   - Returns the metadata or appropriate errors
4. The BuildHandler proceeds with processing each presentation or reports errors

## Technical Design

### File Structure

- **`src/core/discovery.ts`**: Implementation of the Discovery module with the main `discoverPresentations` function and helper functions.
- **`src/core/types/presentation.ts`**: Type definitions for presentation-related structures.
- **`src/core/__tests__/discovery.test.ts`**: Unit tests for the Discovery module.

### Main Function Signature

```typescript
/**
 * Discovers all presentations in the specified directory.
 *
 * @param inputDir Path to the directory to search for presentations
 * @returns A PasResult containing an array of PresentationMetadata objects or an error
 */
export async function discoverPresentations(inputDir: string): PasResult<PresentationMetadata[]> {
  // Implementation details
}
```

### Integration with Existing System

The Discovery module will use the existing FSUtils module for file system operations, particularly the findFiles function for locating presentation files. It will be called by the BuildHandler during the build process to identify presentations that need to be processed.

## Dependencies

- `fs-utils.ts`: For file system operations
- `error.ts`: For error handling and result types
- `neverthrow`: For Result types

This design ensures clean separation of concerns, robust error handling, and follows the project's patterns and conventions.

## Test Scenarios

The following test scenarios ensure the proper functioning of the Presentation Discovery feature. They are organized into Happy Path and Error Path scenarios.

### Happy Path Scenarios

#### Discovery Module - Finding Presentations

```gherkin
Feature: Discover Presentations in Directory
  As a system user
  I want to find all presentations in a directory
  So that I can process them for building

   [x] Scenario: Find single presentation with index file
    Given an input directory with the following structure:
      """
      /input-dir
        ├── index.pres.md
      """
    When I call the discoverPresentations function with "/input-dir"
    Then I should receive a Result.ok with an array containing 1 PresentationMetadata object
    And the PresentationMetadata should have the correct id, url, fullPath, name, and extension
    And the PresentationMetadata should have 1 FragmentMetadata with isEntry set to true

  [x] Scenario: Find presentation with multiple fragments
    Given an input directory with the following structure:
      """
      /input-dir
        ├── index.pres.md
        ├── slide1.pres.md
        └── slide2.pres.md
      """
    When I call the discoverPresentations function with "/input-dir"
    Then I should receive a Result.ok with an array containing 1 PresentationMetadata object
    And the PresentationMetadata should have 3 FragmentMetadata objects
    And index FragmentMetadata should have isEntry set to true
    And slide1 FragmentMetadata should have isEntry set to false
    And slide2 FragmentMetadata should have isEntry set to false

  [x] Scenario: Find multiple presentations in subdirectories
    Given an input directory with the following structure:
      """
      /input-dir
        ├── pres1
        │   └── index.pres.md
        └── pres2
            └── index.pres.md
      """
    When I call the discoverPresentations function with "/input-dir"
    Then I should receive a Result.ok with an array containing 2 PresentationMetadata objects
    And each PresentationMetadata should have the correct directory name
    And each PresentationMetadata should have 1 FragmentMetadata with isEntry set to true

  [x] Scenario: Find presentation with MDX extension
    Given an input directory with the following structure:
      """
      /input-dir
        └── index.pres.mdx
      """
    When I call the discoverPresentations function with "/input-dir"
    Then I should receive a Result.ok with an array containing 1 PresentationMetadata object
    And the PresentationMetadata should have extension set to ".pres.mdx"
    And the PresentationMetadata should have 1 FragmentMetadata with isEntry set to true

  [x] Scenario: Find standalone presentation file
    Given an input directory with the following structure:
      """
      /input-dir
        └── standalone.pres.md
      """
    When I call the discoverPresentations function with "/input-dir"
    Then I should receive a Result.ok with an array containing 1 PresentationMetadata object
    And the PresentationMetadata should have name set to "standalone"
    And the PresentationMetadata should have 1 FragmentMetadata with isEntry set to true

  [x] Scenario: Find presentation with fragments in deeply nested subfolders
    Given an input directory with the following structure:
      """
      /input-dir
        ├── index.pres.md
        ├── level1
        │   ├── fragment1.pres.md
        │   └── level2
        │       ├── fragment2.pres.md
        │       └── level3
        │           └── fragment3.pres.md
        └── level1-alt
            └── level2-alt
                └── level3-alt
                    └── level4-alt
                        └── level5-alt
                            └── fragment5.pres.md
      """
    When I call the discoverPresentations function with "/input-dir"
    Then I should receive a Result.ok with an array containing 1 PresentationMetadata object
    And the PresentationMetadata should have 5 FragmentMetadata objects
    And the FragmentMetadata for "index.pres.md" should have isEntry set to true
    And the FragmentMetadata for "fragment1.pres.md" should have isEntry set to false
    And the FragmentMetadata for "fragment2.pres.md" should have isEntry set to false
    And the FragmentMetadata for "fragment3.pres.md" should have isEntry set to false
    And the FragmentMetadata for "fragment5.pres.md" should have isEntry set to false

  [x] Scenario: Ignore non-presentation files
    Given an input directory with the following structure:
      """
      /input-dir
        ├── index.pres.md
        ├── regular.md
        ├── regular.mdx
        ├── image.png
        └── other-files
            ├── script.js
            └── style.css
      """
    When I call the discoverPresentations function with "/input-dir"
    Then I should receive a Result.ok with an array containing 1 PresentationMetadata object
    And the PresentationMetadata should have 3 FragmentMetadata objects
    And the FragmentMetadata for "index.pres.md" should have isEntry set to true
    And the FragmentMetadata for "regular.md" should have isEntry set to false
    And the FragmentMetadata for "regular.mdx" should have isEntry set to false
    And the PresentationMetadata should not include non-presentation files

  [x] Scenario: Find presentation with index file nested two directories deep
    Given an input directory with the following structure:
      """
      /input-dir
        └── category
            └── subcategory
                ├── index.pres.md
                └── slide1.pres.md
      """
    When I call the discoverPresentations function with "/input-dir"
    Then I should receive a Result.ok with an array containing 1 PresentationMetadata object
    And the PresentationMetadata should have name set to "subcategory"
    And the PresentationMetadata should have 2 FragmentMetadata objects
    And the FragmentMetadata for "index.pres.md" should have isEntry set to true

  [x] Scenario: Standalone fragments without index file
    Given an input directory with the following structure:
      """
      /input-dir
        ├── fragment1.pres.md
        └── fragment2.pres.md
      """
    When I call the discoverPresentations function with "/input-dir"
    Then I should receive a Result.ok with an empty array

  [x] Scenario: Fragments in subdirectory without index file
    Given an input directory with the following structure:
      """
      /input-dir
        └── subfolder
            ├── fragment1.pres.md
            └── fragment2.pres.md
      """
    When I call the discoverPresentations function with "/input-dir"
    Then I should receive a Result.ok with an empty array

  [x] Scenario: Handle empty directory
    Given an input directory with the following structure:
      """
      /empty-dir
        # No presentation files
      """
    When I call the discoverPresentations function with "/empty-dir"
    Then I should receive a Result.ok with an empty array
```

### Error Path Scenarios

#### Discovery Module - Error Handling

```gherkin
Feature: Handle Discovery Errors
  As a system user
  I want proper error handling during presentation discovery
  So that the system fails gracefully

  [x] Scenario: Handle non-existent directory
    Given a non-existent directory path "/non-existent-dir"
    When I call the discoverPresentations function with "/non-existent-dir"
    Then I should receive a Result.err with an appropriate error message
    And the error code should indicate a FILE_SYSTEM_ERROR

  [x] Scenario: Handle conflicting index files
    Given an input directory with the following structure:
      """
      /input-dir
        ├── index.pres.md
        └── index.pres.mdx
      """
    When I call the discoverPresentations function with "/input-dir"
    Then I should receive a Result.err with an appropriate error message
    And the error code should indicate a CONFLICTING_INDEX_FILES error

  [x] Scenario: Handle permission denied
    Given an input directory "/restricted-dir" without read permissions
    When I call the discoverPresentations function with "/restricted-dir"
    Then I should receive a Result.err with an appropriate error message
    And the error code should indicate a PERMISSION_DENIED error


  [x] Scenario: Handle unexpected file system error
    Given a mock file system that generates an error when accessing "/error-dir"
    When I call the discoverPresentations function with "/error-dir"
    Then I should receive a Result.err with an appropriate error message
    And the error code should indicate a FILE_SYSTEM_ERROR

  [x] Scenario: Handle conflicting index files in subdirectories
    Given an input directory with the following structure:
      """
      /input-dir
        ├── index.pres.md
        └── subfolder
            ├── index.pres.md
            └── slide1.pres.md
      """
    When I call the discoverPresentations function with "/input-dir"
    Then I should receive a Result.err with an appropriate error message
    And the error code should indicate a NESTED_INDEX_FILES error
```
