# Feature: F8 - Front Matter Parsing - Technical Design

## 1. Feature Overview

This feature introduces a robust front matter parsing capability into the application through a new, dedicated **Inflation Stage**. This stage sits cleanly between the existing **Discovery** and **Parsing** stages, ensuring a clear separation of concerns.

The core principle is **"Inflate-then-Parse"**. A new `PresentationInflator` module is responsible for all file I/O. It reads fragment content, uses a `FrontMatterParser` utility to extract YAML front matter, and performs a simplified merge operation: the entry point's front matter is used as a base, which is then overridden by each individual fragment's front matter.

The result is a fully inflated `Presentation` object where each `Fragment` contains its final, pre-merged front matter. This object is then passed to the `Parser`, which can now operate without any knowledge of file systems or merge logic, simplifying its implementation significantly.

## 2. System / User Flow

The new architecture follows a clean, three-stage pipeline:

```mermaid
graph TD
    subgraph STAGE_1_DISCOVERY [Stage 1: Discovery]
        A[Start: Input Path] --> B(Discovery Module);
        B --> C{PresentationMetadata};
    end

    subgraph STAGE_2_INFLATION [Stage 2: Inflation]
        C --> D(PresentationInflator Module);
        D --> E{Read Entry Point File};
        E --> F[Parse Entry Front Matter];
        F --> G[Loop All Fragments];
        G -- For Each Fragment --> H{Read Fragment File};
        H --> I[Parse Fragment Front Matter];
        I --> J[Merge: Entry + Fragment];
        J --> K[Create Enhanced Fragment];
        K --> L(Inflated Presentation Object);
    end

    subgraph STAGE_3_PARSING [Stage 3: Parsing]
        L --> M(Parser Module);
        M --> N[Build SlideNodes];
        N --> O{Final SlideDeck};
    end
```

## 3. Change Summary Table

| Module/File Path | Item Name | Status | Description |
|:--|:--|:--|:--|
| `src/core/presentation-inflator.ts` | `PresentationInflator` | New | Handles file reading, front matter extraction, and merging logic. |
| `src/core/front-matter-parser.ts` | `FrontMatterParser` | New | A stateless utility for parsing YAML front matter and merging objects. |
| `src/core/discovery.ts` | `Discovery Module` | Refactored | Responsibility narrowed to only finding file paths and returning `PresentationMetadata`. |
| `src/core/parser/index.ts` | `Parser Module` | Modified | Modified to process `Fragment` objects that now contain pre-processed `frontMatter`. It passes this data to the `SlideNodeBuilder`. |
| `src/core/parser/slide-node-builder.ts`| `SlideNodeBuilder` | Modified | Modified to accept `frontMatter` data and apply it to the `SlideNode` being built, mapping fields to the node's properties. |
| `src/types/presentation.ts` | `Fragment` | Updated | Enhanced to include an optional `frontMatter` object. |
| `package.json` | `gray-matter` | New Dependency | The library used for parsing YAML front matter. |


## 4. Implementation Details

### 4.1. New Module: `FrontMatterParser` (`src/core/front-matter-parser.ts`)

A stateless utility for handling YAML front matter.

#### **Public API**
```typescript
/**
 * Parses raw file content to separate YAML front matter from the main content.
 * @param rawContent The raw string content of a file.
 * @returns An object containing the parsed front matter and the content without front matter.
 */
function parse(rawContent: string): { frontMatter: object, content: string }

/**
 * Merges two front matter objects. Properties from the `overrideObject` will overwrite those in the `baseObject`.
 * @param baseObject The base object (e.g., from the entry point).
 * @param overrideObject The overriding object (e.g., from a specific fragment).
 * @returns A new object with the merged properties.
 */
function merge(baseObject: object, overrideObject: object): object
```

### 4.2. New Module: `PresentationInflator` (`src/core/presentation-inflator.ts`)

Orchestrates the inflation process.

#### **Public API**
```typescript
/**
 * Takes presentation metadata, reads all associated files, processes front matter,
 * and returns a fully inflated Presentation object.
 * @param metadata The PresentationMetadata from the Discovery stage.
 * @returns A Promise resolving to a complete Presentation object.
 */
async function inflate(metadata: PresentationMetadata): Promise<Presentation>
```

#### **Workflow**
1.  Identifies the entry point fragment from `metadata.entryPoint`.
2.  Reads the entry point file and uses `FrontMatterParser.parse()` to get the `baseFrontMatter`.
3.  Iterates through all fragments defined in `metadata.fragments`.
4.  For each fragment:
    *   Reads the file content.
    *   Parses its front matter (`fragmentFrontMatter`) and gets clean content.
    *   Merges the two: `finalFrontMatter = FrontMatterParser.merge(baseFrontMatter, fragmentFrontMatter)`.
    *   Creates an enhanced `Fragment` object with the clean content and `finalFrontMatter`.
5.  Returns a `Presentation` object containing the list of these enhanced `Fragment` objects.

### 4.3. Type Changes (`src/types/presentation.ts`)

The `Fragment` type will be updated to carry the processed front matter.

```typescript
// Updated Fragment Type
interface Fragment extends FragmentMetadata {
  content: string; // Content WITHOUT the front matter block
  frontMatter?: Record<string, any>; // The final, merged front matter object
}
```

### 4.4. Parser and SlideNodeBuilder Modifications

The `Parser` and `SlideNodeBuilder` will be modified to handle the new `frontMatter` property available on each `Fragment`.

-   **Parser Input**: The `Parser` will receive the fully inflated `Presentation` object from the `PresentationInflator`.

-   **Parser Logic**: The core responsibility of the `Parser` is to orchestrate the creation of `SlideNode`s. As it processes each `Fragment` (the entry point first, then any embedded fragments), it will:
    1.  Hold a reference to the `Fragment`'s `frontMatter`.
    2.  Call `splitIntoRawSlides` on the `Fragment`'s `content`.
    3.  For each `RawSlide` returned, it will call the `SlideNodeBuilder`, passing **both** the `RawSlide` and the `frontMatter` from the Fragment the `RawSlide` originated from.

-   **`SlideNodeBuilder` Modifications**: The builder is responsible for constructing the final `SlideNode`. Its `buildSlideNode` method will be updated to accept the `frontMatter` object and apply its values.

    ```typescript
    // Conceptual update to SlideNodeBuilder's build method
    private buildSlideNode(rawSlide: RawSlide, frontMatter?: Record<string, any>): SlideNode {
      const slideNode: SlideNode = {
        id: this.generateSlideId(rawSlide.childLevel),
        content: rawSlide.content,
        fragmentPath: rawSlide.path,
        
        // Apply properties from frontMatter
        title: frontMatter?.title,
        description: frontMatter?.description,
        author: frontMatter?.author,
        date: frontMatter?.date,
        appearance: frontMatter?.appearance,
        userDefinedFrontMatter: frontMatter?.userDefined,
        
        // Existing navigation logic
        navigation: { /* ... */ },
        url: '',
      };

      this.slideNodes.push(slideNode);
      return slideNode;
    }
    ```
    This ensures that the pre-merged `frontMatter` from the inflation stage is correctly applied to every slide derived from a given fragment, with no merge logic needed within the builder itself.

## 5. Test Scenarios (Gherkin)

### 5.1. `FrontMatterParser` Tests
```gherkin
Feature: Front Matter Parser Utility

  @status_complete
  Scenario: Correctly parse content with front matter
    Given a string with a valid YAML front matter block
    When `parse` is called
    Then it should return an object with the parsed 'frontMatter'
    And the 'content' property should not contain the front matter block

  @status_complete
  Scenario: Handle content without front matter
    Given a string without a YAML front matter block
    When `parse` is called
    Then the 'frontMatter' object should be empty
    And the 'content' should be the original string

  @status_complete
  Scenario: Handle content without front matter
  Scenario: Merge two front matter objects
    Given a 'base' object and an 'override' object
    When `merge` is called
    Then the returned object should contain all keys from both
    And properties from the 'override' object should win in case of conflict
```

### 5.2. `PresentationInflator` Tests
```gherkin
Feature: Presentation Inflation

  @status_complete
  Scenario: Inflate a presentation with an entry point and one fragment
    Given a PresentationMetadata with an entry point and one fragment
    And the entry point has 'base' front matter
    And the fragment has its own 'override' front matter
    When the `PresentationInflator.inflate` is called
    Then it should return a Presentation object
    And the fragment in the presentation should have a 'frontMatter' property
    And that property should be the result of merging 'base' and 'override' front matter

  @status_complete
  Scenario: Handle fragments with no front matter
    Given a PresentationMetadata where a fragment has no front matter
    When `inflate` is called
    Then the fragment's final 'frontMatter' should be identical to the entry point's front matter
```

### 5.3. `Parser` Integration Tests
```gherkin
Feature: Parser with Inflated Presentation

  Scenario: Create a SlideNode from a fragment with front matter
    Given an inflated Presentation where a Fragment has final, merged front matter
    When the `parser` processes this presentation
    Then the resulting SlideNode should have its properties (title, appearance, etc.) correctly populated from the fragment's front matter
```

### 5.4. Front Matter Extraction

```gherkin
Feature: Front Matter Extraction

  Scenario: Extract YAML front matter from fragment content
    Given a fragment with content:
      """
      ---
      title: "My Slide Title"
      description: "A test slide"
      theme: dark
      ---
      # Slide Content
      This is the main content.
      """
    When I extract front matter from the content
    Then the front matter YAML should be:
      """
      title: "My Slide Title"
      description: "A test slide"
      theme: dark
      """
    And the content without front matter should be:
      """
      # Slide Content
      This is the main content.
      """

  Scenario: Handle content without front matter
    Given a fragment with content:
      """
      # Regular Slide
      No front matter here.
      """
    When I extract front matter from the content
    Then no front matter should be found
    And the content should remain unchanged

  Scenario: Handle malformed front matter (no closing delimiter)
    Given a fragment with content:
      """
      ---
      title: "Incomplete"
      description: "No closing delimiter"
      # Regular Content
      """
    When I extract front matter from the content
    Then no front matter should be found
    And the content should remain unchanged
```

### 5.5. YAML Parsing

```gherkin
Feature: YAML Parsing

  Scenario: Parse valid YAML front matter
    Given front matter YAML:
      """
      title: "Test Slide"
      description: "A test description"
      author:
        name: "John Doe"
        email: "john@example.com"
      theme: "dark"
      customField: "custom value"
      """
    When I parse the YAML
    Then the parsing should succeed
    And the result should contain title "Test Slide"
    And the result should contain author with name "John Doe"
    And the result should contain custom field "customField" with value "custom value"

  Scenario: Handle invalid YAML syntax
    Given invalid YAML:
      """
      title: "Test
      invalid: yaml: structure:
      """
    When I parse the YAML
    Then the parsing should fail
    And the error should indicate YAML parsing failure

  Scenario: Handle non-object YAML
    Given YAML that parses to a primitive:
      """
      "just a string"
      """
    When I parse the YAML
    Then the parsing should fail
    And the error should indicate invalid YAML structure
```

### 5.6. Field Categorization

```gherkin
Feature: Field Categorization

  Scenario: Categorize standard metadata fields
    Given front matter data:
      """
      title: "Test Title"
      description: "Test Description"
      date: "2024-01-01"
      author: "Test Author"
      theme: "dark"
      customField: "custom"
      """
    When I categorize the fields
    Then title should be in metadata
    And description should be in metadata
    And date should be in metadata
    And author should be in metadata
    And theme should be in appearance
    And customField should be in userDefinedFrontMatter

  Scenario: Categorize appearance settings
    Given front matter data:
      """
      theme: "dark"
      transition: "slide"
      backgroundImage: "bg.jpg"
      layout: "center"
      """
    When I categorize the fields
    Then all fields should be in appearance

  Scenario: Handle empty front matter
    Given empty front matter data: {}
    When I categorize the fields
    Then metadata should be empty
    And appearance should be undefined
    And userDefinedFrontMatter should be empty
```

### 5.7. Front Matter Merging and Inheritance

```gherkin
Feature: Front Matter Inheritance

  Scenario: Merge child front matter with parent
    Given parent front matter:
      """
      theme: "dark"
      author: "Parent Author"
      customParent: "parent value"
      """
    And child front matter:
      """
      title: "Child Title"
      author: "Child Author"
      customChild: "child value"
      """
    When I merge the front matter
    Then the result should have title "Child Title"
    And the result should have author "Child Author" (child overrides)
    And the result should have theme "dark" (inherited from parent)

    And the result should have both customParent and customChild

  Scenario: Handle child front matter without parent
    Given no parent front matter
    And child front matter:
      """
      title: "Standalone Title"
      theme: "light"
      """
    When I merge the front matter
    Then the result should match the child front matter exactly
```

### 5.8. Parser Integration

```gherkin
Feature: Parser Integration

  Scenario: Create SlideNode with front matter
    Given a RawSlide with content:
      """
      ---
      title: "Test Slide"
      description: "A test slide"
      theme: "dark"
      customField: "custom"
      ---
      # Main Content
      """
    When the parser processes the slide
    Then the resulting SlideNode should have title "Test Slide"
    And the SlideNode should have description "A test slide"
    And the SlideNode should have appearance.theme "dark"
    And the SlideNode should have userDefinedFrontMatter.customField "custom"
    And the SlideNode content should be "# Main Content"

  Scenario: Handle slides without front matter
    Given a RawSlide with regular content
    When the parser processes the slide
    Then the resulting SlideNode should have no title
    And the SlideNode should have empty userDefinedFrontMatter
    And the SlideNode content should remain unchanged

  Scenario: Handle front matter inheritance in nested slides
    Given a parent slide with front matter:
      """
      theme: "dark"
      author: "Parent"
      """
    And a child slide with front matter:
      """
      title: "Child Title"
      """
    When the parser processes both slides
    Then the parent SlideNode should have theme "dark" and author "Parent"
    And the child SlideNode should have theme "dark" (inherited)
    And the child SlideNode should have author "Parent" (inherited)
    And the child SlideNode should have title "Child Title"

  Scenario: Handle front matter parsing errors gracefully
    Given a slide with invalid YAML front matter
    When the parser processes the slide
    Then the parser should log an error
    And the SlideNode should be created with original content
    And the parsing should continue for remaining slides
```

### 5.9. Error Handling

```gherkin
Feature: Error Handling

  Scenario: Handle YAML syntax errors
    Given front matter with invalid YAML syntax
    When front matter processing is attempted
    Then an error should be returned
    And the error code should be FRONT_MATTER_PARSE_ERROR
    And the error message should indicate the YAML syntax issue

  Scenario: Handle non-object YAML structures
    Given front matter that parses to a string or array
    When front matter processing is attempted
    Then an error should be returned
    And the error code should be FRONT_MATTER_INVALID_YAML
    And the error message should indicate invalid structure

  Scenario: Graceful degradation on front matter errors
    Given a presentation with some slides having invalid front matter
    When the presentation is parsed
    Then slides with valid front matter should be processed correctly
    And slides with invalid front matter should use original content
    And error messages should be logged for invalid slides
    And the overall parsing should succeed
``` 