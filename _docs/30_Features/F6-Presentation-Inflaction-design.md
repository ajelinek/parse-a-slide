# F6: Fragment Inflation - Technical Design

## 1. Overview

This feature introduces a utility function within the `Discovery` module to "inflate" presentation fragments with their content. It involves creating a new public method, `inflateFragments`, in the `Discovery` module. This method takes an array of `FragmentMetadata` objects, reads the content of each associated file (using `FSUtils.readFile`), and returns an array of `Fragment` objects. Each `Fragment` object augments its original `FragmentMetadata` with its respective file content. These inflated `Fragment` objects are then used to populate the `fragments` array within a `Presentation` object, serving as input for subsequent processing steps like parsing and generation.

## 2. Implementation Details

#### 2.1. New/Updated Types (`src/types/presentation.ts`)

1.  **`Fragment` Type (Represents FragmentMetadata with Content):**

    - Purpose: To hold the metadata _and_ content of a single presentation fragment.
    - Status: This type definition remains central to the feature.
    - Structure (Pseudocode):
      ```pseudocode
      TYPE Fragment EXTENDS FragmentMetadata:
        ADD PROPERTY content: STRING // Raw content of the fragment file
      END TYPE
      ```

2.  **`Presentation` Type (Represents PresentationMetadata with Content):**
    - Purpose: To represent a presentation with all its metadata and content fully loaded.
    - Status: The structure remains the same, but the method of populating its `fragments` array is clarified.
    - Structure (Pseudocode):
      ```pseudocode
      TYPE Presentation EXTENDS (OMIT PresentationMetadata, 'fragmentMetaData'):
        ADD PROPERTY fragments: ARRAY OF Fragment // All fragments with their content
      END TYPE
      ```
    - **Clarification:** The `Presentation` type's `fragments` array will be populated using the output of the new `Discovery.inflateFragments` function, which takes `PresentationMetadata.fragmentMetaData` as input.

#### 2.2. `FSUtils` Module (`src/utils/fs-utils.ts`)

- **Status**: This module **already exists** at `src/utils/fs-utils.ts`.
- **Relevant Existing Function**:
  - `readFile(filePath: STRING): PasResult<STRING>`
    - Purpose: Reads the content of a file.
    - Signature (Conceptual): `FUNCTION readFile(filePath: STRING) RETURNS ASYNC Result<STRING, AppError>`
    - This existing function will be used by `inflateFragments`. No changes are needed in `FSUtils` for this feature.

#### 2.3. `Discovery` Module (`src/core/discovery.ts`)

- **Status**: This module **already exists**.
- **New Public Function**:

  - **`inflateFragments(fragmentMetadatas: ARRAY OF FragmentMetadata ): PasResult<ARRAY OF Fragment>`**

    - Purpose: Takes an array of `FragmentMetadata` objects, reads the content for each fragment's file using the provided `fsUtils.readFile`, and returns a `PasResult` containing an array of `Fragment` objects. Each `Fragment` object includes all original metadata plus the file content.
    - Implementation Details (High-Level Pseudocode):

      ```pseudocode
      FUNCTION inflateFragments(fragmentMetadatas):
        INITIALIZE empty list: inflatedFragmentList

        FOR EACH fragmentMeta IN fragmentMetadatas:
          INVOKE fsUtils.readFile WITH fragmentMeta.fullPath, AWAITING result
          IF read operation FAILED, THEN
            RETURN error (propagate file read error immediately, failing the batch)
          END IF
          STORE content from successful read operation

          CREATE newFragment OBJECT:
            COPY all properties from fragmentMeta
            ADD PROPERTY content with stored content
          END CREATE
          ADD newFragment TO inflatedFragmentList
        END FOR

        RETURN ok(inflatedFragmentList)
      END FUNCTION
      ```

    - Error Handling: Uses `PasResult<ARRAY OF Fragment>`, consistent with project conventions (`Promise<Result<Fragment[], AppError>>`). If any file read operation fails, the entire `inflateFragments` call should return an `err` Result, typically propagating the first error encountered.

### Error Handling

Following the project's conventions, we'll use the `neverthrow` library's `Result` type for error handling. Specifically, `PasResult<T>` (an alias for `Promise<Result<T, AppError>>`) will be used for async functions, allowing for readable code with async/await syntax. Helper functions `pasOk` and `pasErr` can be used if available, or `ok()` and `err()` directly.

## 4. Change Summary

The following table summarizes the planned changes for implementing the Fragment Inflation feature:

| Module/File Path            | Item Name          | Status    | Description                                                                                                                                       |
| :-------------------------- | :----------------- | :-------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/types/presentation.ts` | `Fragment`         | Unchanged | Type representing `FragmentMetadata` augmented with its file `content`. (Definition remains key, format updated to pseudocode).                   |
| `src/types/presentation.ts` | `Presentation`     | Unchanged | Type structure remains; clarification on how `fragments` are populated using `inflateFragments`. (Format updated to pseudocode).                  |
| `src/core/discovery.ts`     | `inflateFragments` | New       | Public function that takes an array of `FragmentMetadata`, reads files, and returns a `PasResult<ARRAY OF Fragment>` with content-rich fragments. |
| `src/utils/fs-utils.ts`     | `readFile`         | Unchanged | Existing function will be used by `inflateFragments` to read file contents. No changes required to `fs-utils.ts` for this feature.                |

- **Relevant Rules & Memories**: (As previously listed)

## 5. Test Scenarios

This section outlines the test scenarios for the Fragment Inflation feature, focusing on the `inflateFragments` function.

```gherkin
Feature: Fragment Inflation via inflateFragments

  #---------------------------------------------------------------------------
  # Module: Discovery (src/core/discovery.ts)
  # Function: inflateFragments
  #---------------------------------------------------------------------------

  @happyPath
  Scenario: Successfully inflate a single fragment
    Given an array containing one "FragmentMetadata" object
    And the file specified by its "fullPath" exists and is readable
    When "inflateFragments" is called with this array and a functional "fsUtils.readFile"
    Then the function should return a "PasResult.ok"
    And the result should be an array containing one "Fragment" object
    And this "Fragment" object should extend the input "FragmentMetadata"
    And its "content" property should hold the string content of the file

  @happyPath
  Scenario: Successfully inflate multiple fragments
    Given an array containing multiple "FragmentMetadata" objects
    And all files specified by their respective "fullPath" properties exist and are readable
    When "inflateFragments" is called with this array and a functional "fsUtils.readFile"
    Then the function should return a "PasResult.ok"
    And the result should be an array of "Fragment" objects, with the same length as the input array
    And each "Fragment" object should correspond to an input "FragmentMetadata" object
    And each "Fragment" object's "content" property should hold the string content of its respective file
    And the order of "Fragment" objects in the result should match the order of "FragmentMetadata" in the input

  @happyPath
  Scenario: Successfully handle an empty array of fragment metadata for inflation
    Given an empty array of "FragmentMetadata" objects
    When "inflateFragments" is called with this empty array
    Then the function should return a "PasResult.ok"
    And the result should be an empty array

  @errorPath
  Scenario: Fail to inflate fragments if a file is unreadable
    Given an array of "FragmentMetadata" objects, where at least one refers to a file that is unreadable (e.g., due to permissions)
    When "inflateFragments" is called with this array and "fsUtils.readFile" that simulates a read error for the unreadable file
    Then the function should return a "PasResult.err"
    And the error should indicate a file read failure, referencing the problematic file path

  @errorPath
  Scenario: Fail to inflate fragments if a file does not exist
    Given an array of "FragmentMetadata" objects, where at least one refers to a file that does not exist
    When "inflateFragments" is called with this array and "fsUtils.readFile" that simulates a "file not found" error for that file
    Then the function should return a "PasResult.err"
    And the error should indicate a file read failure (specifically, file not found), referencing the problematic file path

```
