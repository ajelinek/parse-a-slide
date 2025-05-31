# F6: Presentation Inflation - Technical Design

## 1. Overview

This feature introduces a new capability within the `Discovery` module to load content for a discovered presentation. It involves creating a new public method in `Discovery` that takes a `PresentationMetadata` object, reads the content of its entry file and associated fragment files (using `FSUtils.readFile`), and then returns an "inflated" `Presentation` object. This inflated object augments the existing `PresentationMetadata` and `FragmentMetadata` with their respective file content and serves as the input for subsequent processing steps like parsing and generation.

## 2. Implementation Details

#### 2.1. New/Updated Types (`src/types/presentation.ts`)

1.  **`Fragment` Type (Represents FragmentMetadata with Content):**

    - Purpose: To hold the metadata _and_ content of a single presentation fragment.
    - Structure:
      ```pseudocode
      TYPE Fragment EXTENDS FragmentMetadata:
        ADD PROPERTY content: string // Raw content of the fragment file
      END TYPE
      ```

2.  **`Presentation` Type (Represents PresentationMetadata with Content):**
    - Purpose: To represent a presentation with all its metadata and content fully loaded.
    - Structure:
      ```pseudocode
      TYPE Presentation EXTENDS (OMIT PresentationMetadata, 'fragmentMetaData'):
        ADD PROPERTY fragments: ARRAY OF Fragment // All fragments with their content
      END TYPE
      ```
    - **Clarification:** The `Presentation` type no longer has a direct top-level `content: string` property. The content of the main presentation is accessible via the entry `Fragment` (where `isEntry: true`) within the `fragments` array. `BuildHandler` transforms `PresentationMetadata.fragmentMetaData` into this `fragments` array.

#### 2.2. `FSUtils` Module (`src/utils/fs-utils.ts`)

- **Status**: This module **already exists** at `src/utils/fs-utils.ts`.
- **Relevant Existing Function**:
  - `readFile(filePath: string): PasResult<string>`
    - Purpose: Reads the content of a file.
    - Signature: `export async function readFile(filePath: string): PasResult<string>`
    - This existing function perfectly matches the requirements for F6. No new file system utilities need to be created for reading files in this feature.

#### 2.3. `Discovery` Module (`src/core/discovery.ts`)

- **Status**: This module **already exists**.
- **New Public Function**:

  - **`inflatePresentation(presentationMetadata: PresentationMetadata, fsUtils: { readFile: typeof import('../utils/fs-utils').readFile }): PasResult<Presentation>`**

    - Purpose: Takes a single `PresentationMetadata` object, reads the content for all its defined fragments using the provided `fsUtils.readFile`, and returns an inflated `Presentation` object. This object contains the original metadata along with the fully populated `Fragment` objects (including their content).
    - Signature (Conceptual Typescript): `export async function inflatePresentation(presentationMetadata: PresentationMetadata, fsUtils: { readFile: (filePath: string) => PasResult<string> }): PasResult<Presentation>`
    - Implementation Details (High-Level Pseudocode):

      ```pseudocode
      FUNCTION inflatePresentation(presentationMetadata, fsUtils):
        INITIALIZE empty list: inflatedFragments

        IF presentationMetadata.fragmentMetaData IS NOT EMPTY:
          FOR EACH fragmentMeta IN presentationMetadata.fragmentMetaData:
            READ content FROM fragmentMeta.fullPath USING fsUtils.readFile
            IF read FAILED, RETURN error (propagate file read error)

            CREATE newFragment WITH fragmentMeta AND content
            ADD newFragment TO inflatedFragments
          END FOR

          // Validation: Ensure an entry fragment was found if fragments were processed
          IF NO entry fragment IS PRESENT in inflatedFragments:
            RETURN error (e.g., "Entry fragment missing in listed fragments")
          END IF
        END IF

        // Construct the final Presentation object
        CREATE presentationObject:
          COPY all properties from presentationMetadata (excluding 'fragmentMetaData')
          SET presentationObject.fragments = inflatedFragments
        END CREATE

        RETURN ok(presentationObject)
      END FUNCTION
      ```

    - Error Handling: Uses `PasResult<Presentation>`, consistent with project conventions (`Promise<Result<Presentation, AppError>>`).

### Error Handling

Following the project's conventions, we'll use the `neverthrow` library's `Result` type for error handling. Specifically, `PasResult<T>` (an alias for `Promise<Result<T, AppError>>`) will be used for async functions, allowing for readable code with async/await syntax. Helper functions `pasOk` and `pasErr` can be used if available, or `ok()` and `err()` directly.

## 4. Change Summary

The following table summarizes the planned changes for implementing the Presentation Inflation feature:

| Module/File Path            | Item Name                   | Status    | Description                                                                                                                                 |
| :-------------------------- | :-------------------------- | :-------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/types/presentation.ts` | `Fragment`                  | New       | Type representing `FragmentMetadata` augmented with its file `content`.                                                                     |
| `src/types/presentation.ts` | `Presentation`              | Updated   | Type representing `PresentationMetadata` where `fragmentMetaData` is replaced by an array of content-rich `Fragment` objects (`fragments`). |
| `src/core/discovery.ts`     | `inflateSinglePresentation` | New       | Public function to take a `PresentationMetadata` object and return a `PasResult<Presentation>` with all its fragment contents loaded.       |
| `src/utils/fs-utils.ts`     | `readFile`                  | Unchanged | Existing function will be used by `inflateSinglePresentation` to read file contents. No changes required to `fs-utils.ts` for this feature. |

- **Relevant Rules & Memories**: (As previously listed)

## 5. Test Scenarios

This section outlines the test scenarios for the Presentation Inflation feature, ensuring comprehensive coverage of its functionality.

### Module: `Discovery` (`src/core/discovery.ts`)
Function: `inflatePresentation`

#### Happy Path Scenarios

**Scenario:** Successfully inflate a presentation with only an entry fragment
  Given a `PresentationMetadata` object with one `FragmentMetadata` entry in `fragmentMetaData`, where `isEntry` is true
  And the file specified by `fragmentMetaData[0].fullPath` exists and is readable
  When `inflatePresentation` is called with this `PresentationMetadata` and a functional `fsUtils.readFile`
  Then the function should return a `PasResult.ok`
  And the resulting `Presentation` object's `fragments` array should contain one `Fragment` object
  And this `Fragment` object should be an extension of `fragmentMetaData[0]`
  And its `content` property should hold the string content of the file
  And its `isEntry` property should be true
  And all other properties from the input `PresentationMetadata` (except `fragmentMetaData`) should be copied to the `Presentation` object.

**Scenario:** Successfully inflate a presentation with an entry fragment and multiple other fragments
  Given a `PresentationMetadata` object with multiple `FragmentMetadata` entries in `fragmentMetaData`
  And one fragment is marked with `isEntry: true`
  And all files specified by the `fullPath` in each `FragmentMetadata` exist and are readable
  When `inflatePresentation` is called with this `PresentationMetadata` and a functional `fsUtils.readFile`
  Then the function should return a `PasResult.ok`
  And the resulting `Presentation` object's `fragments` array should contain the same number of `Fragment` objects as `fragmentMetaData`
  And each `Fragment` object should correspond to a `FragmentMetadata` entry, with its `content` property populated
  And the `Fragment` corresponding to the entry `FragmentMetadata` should have `isEntry: true`
  And the order of `Fragment` objects in the `fragments` array should match the order in `fragmentMetaData`.

**Scenario:** Successfully inflate a presentation with no fragments defined in metadata
  Given a `PresentationMetadata` object where `fragmentMetaData` is an empty array
  When `inflatePresentation` is called with this `PresentationMetadata`
  Then the function should return a `PasResult.ok`
  And the resulting `Presentation` object's `fragments` array should be empty
  And all other properties from the input `PresentationMetadata` (except `fragmentMetaData`) should be copied to the `Presentation` object.

#### Error Path Scenarios

**Scenario:** Fail to inflate presentation if an entry fragment file is unreadable
  Given a `PresentationMetadata` object with one `FragmentMetadata` entry in `fragmentMetaData` (marked as `isEntry: true`)
  And the file specified by `fragmentMetaData[0].fullPath` exists but is unreadable (e.g., due to permissions)
  When `inflatePresentation` is called with this `PresentationMetadata` and `fsUtils.readFile` that simulates a read error for this file
  Then the function should return a `PasResult.err`
  And the error should indicate a file read failure, referencing the problematic file path.

**Scenario:** Fail to inflate presentation if a non-entry fragment file is unreadable
  Given a `PresentationMetadata` object with multiple `FragmentMetadata` entries, including an entry fragment and a non-entry fragment
  And the entry fragment's file is readable
  And the non-entry fragment's file is unreadable
  When `inflatePresentation` is called with this `PresentationMetadata` and `fsUtils.readFile` that simulates a read error for the non-entry fragment file
  Then the function should return a `PasResult.err`
  And the error should indicate a file read failure, referencing the problematic non-entry file path.

**Scenario:** Fail to inflate presentation if `fragmentMetaData` is provided but no fragment is marked as entry
  Given a `PresentationMetadata` object with one or more `FragmentMetadata` entries in `fragmentMetaData`
  And none of these `FragmentMetadata` entries have `isEntry: true`
  When `inflatePresentation` is called with this `PresentationMetadata`
  Then the function should return a `PasResult.err`
  And the error should clearly state that an entry fragment is missing from the provided metadata.

**Scenario:** Fail to inflate presentation if a fragment's `fullPath` points to a non-existent file
  Given a `PresentationMetadata` object with a `FragmentMetadata` entry
  And the `fullPath` in this `FragmentMetadata` points to a file that does not exist
  When `inflatePresentation` is called with this `PresentationMetadata` and `fsUtils.readFile` that simulates a "file not found" error
  Then the function should return a `PasResult.err`
  And the error should indicate a file read failure (specifically, file not found), referencing the problematic file path.

### Module: `FSUtils` (`src/utils/fs-utils.ts`)
Function: `readFile` (in the context of its usage by `inflatePresentation`)

*(Note: Direct unit tests for `readFile` would cover these more exhaustively. These scenarios focus on the interaction and error propagation to `inflatePresentation`.)*

**Scenario:** `readFile` encounters a non-existent file
  Given `inflatePresentation` attempts to read a fragment file using `readFile`
  And the specified file path does not exist
  When `readFile` is invoked for that path
  Then `readFile` should return a `PasResult.err`
  And this error should be propagated by `inflatePresentation`.

**Scenario:** `readFile` encounters a file with insufficient read permissions
  Given `inflatePresentation` attempts to read a fragment file using `readFile`
  And the specified file exists but the application lacks read permissions
  When `readFile` is invoked for that path
  Then `readFile` should return a `PasResult.err`
  And this error should be propagated by `inflatePresentation`.
