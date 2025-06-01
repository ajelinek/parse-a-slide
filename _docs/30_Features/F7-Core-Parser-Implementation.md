# Feature Design: F7 - Core Parser Implementation

## 1. Overview

The `Parser` module is a crucial component in the slide processing pipeline. Its primary responsibility is to take a `Presentation` object (containing `Fragment`s) and transform it into a flat, structured list of `SlideNode` objects with fully resolved navigation (parent, child, previous, next).

This transformation involves:

1.  Recursively parsing the content of each `Fragment`.
2.  Identifying slide segments based on hierarchical delimiters: `---` (sibling), `--->` (child), `-->>` (grandchild), etc.
3.  Detecting and processing Markdown references to other `.pres` fragments (e.g., `[text](./path/to/file.pres)`), embedding their parsed content hierarchically or sequentially.
4.  Creating a `SlideNode` for each effective slide, populating its content, and extracting `userDefinedFrontMatter`.
5.  Assigning unique, hierarchical, IDs to each `SlideNode`.
6.  Establishing comprehensive navigation links (`parentSlideId`, `childSlideId`, `previousSlideId`, `nextSlideId`) among all generated `SlideNode`s.
7.  Passing each finalized `SlideNode` through an extensible `Processor` pipeline.

This feature will deliver:

- **S1**: A `Parser` that accepts a `Presentation` object and outputs a `Result<SlideNode[], AppError>` containing a flat list of `SlideNode`s with resolved hierarchical and sequential navigation.
- **S2**: Handling of slide structures demarcated by `---` (sibling), `--->` (child), etc. Support for parsing frontmatter within these segments.
- **S3**: Support for an extensible `Processor` pipeline.
- **S4 (New)**: Support for detecting Markdown references to other `.pres` fragments and embedding their content, honoring the hierarchical context established by delimiters immediately preceding the reference or the line containing the reference.

## 2. Implementation Details

### 2.1. Input

The `Parser` will expose a function, `parse`, that accepts:

1.  `presentation: Presentation`: An object conforming to the structure defined in `_docs/10-Data-Model.md`.

    ```typescript
    // From _docs/10-Data-Model.md (src/core/types/presentation.ts)
    export type Presentation = {
      metadata: PresentationMetadata
      fragments: Fragment[] // Array of Fragment objects, assumed to be pre-loaded
    }

    export type Fragment = {
      metadata: FragmentMetadata
      content: string // Raw content of the fragment file
    }
    ```

2.  `processors: Processor[]`: An array of `Processor` instances.

### 2.2. Parsing Process

The core of the parser will be a recursive function, let's call it `processContentRecursive`, that handles a chunk of Markdown content and its context (like current parent ID, previous sibling ID).

**State Management during Parsing:**

- `allSlideNodes`: A flat list where all created `SlideNode` objects are stored.
- `idGenerator`: A utility to generate unique, hierarchical IDs (e.g., `F1S1`, `F1S1.C1`, `F1S2`).
- `fragmentMap`: A map of `fragment.metadata.relativePath` to `Fragment` object for quick lookup when resolving references.

**Main Parsing Loop (`parse` function):**

1.  Initialize `allSlideNodes = []`.
2.  Build `fragmentMap` from `presentation.fragments` for quick lookup of referenced fragments.
3.  **Identify Entry Fragment(s)**: Determine the primary entry fragment(s) from `presentation.fragments`. based on the `entryId` attribute in `presentation.metadata`.
4.  If no entry fragment is found, return an appropriate error (e.g., `Err(createError('No entry fragment found', ErrorCode.PARSER_ERROR))`).
5.  For the entry fragment: (Can only be one)
    - Call `processContentRecursive(entryFragment.content, null, null, entryFragment.metadata.fullPath, fragmentMap, allSlideNodes, idGenerator)`.
6.  **Post-Linking Refinement**: After the initial parsing has populated `allSlideNodes` and established `parentSlideId` and `childSlideId` links:
    1.  **Sibling Linking**: Iterate through `allSlideNodes`. For each node, identify its siblings (nodes with the same `parentSlideId`). Based on their order of appearance (which should be preserved from parsing):
        - Set `previousSlideId` for each node to its preceding sibling, if one exists.
        - Set `nextSlideId` for each node to its succeeding sibling, if one exists. At this point, the last sibling in any sequence will have `nextSlideId: null`.
    2.  **Last Child to Parent's Next Linking**: Iterate through `allSlideNodes` again. For each node `C`:
        - If `C.navigation.parentSlideId` is not `null` (so `C` is a child slide) AND `C.navigation.nextSlideId` is currently `null` (meaning `C` was the last in its direct sibling sequence from step 1):
          - Find `C`'s parent node `P` (using `C.navigation.parentSlideId` to look up in `allSlideNodes` or a map).
          - Set `C.navigation.nextSlideId = P.navigation.nextSlideId`.
7.  **Processor Pipeline**: Apply processors to each node in `allSlideNodes`.
8.  Return `Ok(allSlideNodes)`.

**Core Parsing Logic:**

The detailed logic for parsing content, handling delimiters, and embedding fragments is visually represented in the "High-Level Parsing Flow" diagram below and specified in detail in Section 6: "Key Assumptions, Behaviors, and Error Handling". The process involves iterating through content, managing state (current parent, active node for child creation), and recursively processing embedded fragments.

**High-Level Parsing Flow:**

```mermaid
graph TD
    A["Start: Parser.parse(presentation, processors)"] --> B{"Identify Entry Fragment via presentation.metadata.entryId"};
    B -- Found --> C["Initialize: allSlideNodes, idGenerator, fragmentMap, currentParentContext=null, activeParentForNextChild=null, lastProcessedNode=null"];
    B -- Not Found --> Err1["Return Error: No Entry Fragment"];

    C --> D{"Process Content of Current Fragment/Context (entryFragment initially)"};
    D -- More Content --> E["Scan for next Segment & its Preceding Delimiter/Context"];
    E --> F{"Segment Type?"};

    F -- "Delimiter '---' + Text Segment" --> G1_Text["Create SlideNode (Top-Level/Sibling from text)"];
    G1_Text --> H["Update parentId=currentParentContext, prev/next with lastProcessedNode at this level"];
    H --> I["Set activeParentForNextChild = new SlideNode"];
    I --> J["Add to allSlideNodes, update lastProcessedNode"];
    J --> D;

    F -- "Delimiter '--->' (etc.) + Text Segment" --> G2_Text["Create SlideNode (Child from text)"];
    G2_Text --> K["Update parentId=activeParentForNextChild.id, link to childSlideId/siblings"];
    K --> L["Set activeParentForNextChild = new SlideNode"];
    L --> J;

    F -- "Segment is Fragment Reference" --> ProcRef["Process Fragment Reference (see text for details)"];
    ProcRef --> DetEmbParent["Determine embeddingParentId based on Delimiter Context that led to this segment (currentParentContext for '---' context, activeParentForNextChild.id for '--->' context)"];
    DetEmbParent --> ORecurse["Invoke Parser Recursively for Referenced Fragment's content with embeddingParentId"];
    ORecurse --> LinkEmbed["Integrate embedded slides. Update lastProcessedNode."];
    LinkEmbed --> UpdateActiveParent["Update activeParentForNextChild = last slide from embedded fragment."];
    UpdateActiveParent --> D;

    D -- "No More Content in Current Context" --> Q{"Any Unprocessed Recursive Contexts (e.g. from fragment embedding)?"};
    Q -- Yes --> D;
    Q -- No --> R["All Content Processed"];

    R --> S["Post-Linking Refinement: Finalize prev/next, link last child's next to parent's next"];
    S --> T["Apply Processors to each SlideNode"];
    T --> U["Return Ok(allSlideNodes)"];
    T -- "Error in Processors" --> Err2["Return Error"];

    subgraph "Recursive Fragment Processing"
        direction LR
        ORecurse
    end
```

**ID Generation**: Example: `S1`, `S1.C1`. For slides embedded from a fragment (e.g., 'details.pres'), IDs could be `ParentID.detailsS1`, `ParentID.detailsS1.C1`, etc. The `idGenerator` will need to manage unique ID generation incorporating parent context and potentially a prefix derived from the embedded fragment's name to ensure uniqueness and traceability.

### 2.3. `SlideNode` Structure (Target, from `_docs/10-Data-Model.md`)

**Crucial Changes**:

- `navigation` must include `parentSlideId: string | null`.
- `navigation.childSlideIds: string[]` is replaced by `navigation.childSlideId: string | null` (points to the first child).
  These changes also need to be reflected in `_docs/10-Data-Model.md`.

```typescript
// Expected structure (src/core/types/presentation.ts)
export type SlideNode = {
  id: string
  url: string // e.g., /presentation-name/S1
  title?: string
  description?: string
  date?: string
  author?: object | string // { name, email?, website? } or string
  navigation: {
    parentSlideId: string | null // Existing change
    previousSlideId: string | null
    nextSlideId: string | null
    childSlideId: string | null // << NEW (replaces childSlideIds)
  }
  userDefinedFrontMatter: Record<string, any> // Parsed YAML from slide segment
  appearance?: {
    // Derived from userDefinedFrontMatter
    theme?: string
    transition?: string
    backgroundImage?: string
    layout?: string
    timing?: { duration?: number; autoAdvance?: boolean }
    [key: string]: any // Other rendering-specific attributes
  }
  content: string // Markdown/MDX content of the slide (after frontmatter)
  assets: Asset[] // Populated by processors or later stages
}

export type Asset = {
  id: string
  relativePath: string
  content: string // e.g., base64 data
}
```

### 2.4. Output

`Result<SlideNode[], AppError>`: A flat array of `SlideNode`s, fully linked.

### 2.5. Examples

This section illustrates how various Markdown content structures within fragments are parsed into `SlideNode`s, focusing on ID generation and navigation links. For brevity, `SlideNode` content and other metadata are omitted. Assume `SlideNode.url`, `title`, `description`, etc., are populated from frontmatter or defaults.

**Assumed ID Generation Scheme:**

- Root/Sibling slides: `S1`, `S2`, `S3`...
- Child slides: `<parentId>.C1`, `<parentId>.C2`... (e.g., `S1.C1`, `S1.C1.C1`)

**Example 1: Simple Sibling Slides**

**Fragment Content (`entry.pres`):**

```
# Slide 1 Title
Content for Slide 1.
---
# Slide 2 Title
Content for Slide 2.
---
# Slide 3 Title
Content for Slide 3.
```

**Resulting `SlideNode`s (simplified):**

```json
[
  {
    "id": "S1",
    "content": "# Slide 1 Title\nContent for Slide 1.",
    "navigation": { "parentSlideId": null, "previousSlideId": null, "nextSlideId": "S2", "childSlideId": null }
  },
  {
    "id": "S2",
    "content": "# Slide 2 Title\nContent for Slide 2.",
    "navigation": { "parentSlideId": null, "previousSlideId": "S1", "nextSlideId": "S3", "childSlideId": null }
  },
  {
    "id": "S3",
    "content": "# Slide 3 Title\nContent for Slide 3.",
    "navigation": { "parentSlideId": null, "previousSlideId": "S2", "nextSlideId": null, "childSlideId": null }
  }
]
```

**Example 2: Parent with Child Slides**

**Fragment Content (`entry.pres`):**

```
# Parent Slide S1
Content for S1.
--->
# Child Slide S1.C1
Content for S1.C1.
---
# Parent Slide S2
Content for S2.
--->
# Child Slide S2.C1
Content for S2.C1.
---
# Parent Slide S3
Content for S3.
```

**Resulting `SlideNode`s (simplified):**

```json
[
  {
    "id": "S1",
    "content": "# Parent Slide S1\nContent for S1.",
    "navigation": { "parentSlideId": null, "previousSlideId": null, "nextSlideId": "S2", "childSlideId": "S1.C1" }
  },
  {
    "id": "S1.C1",
    "content": "# Child Slide S1.C1\nContent for S1.C1.",
    "navigation": { "parentSlideId": "S1", "previousSlideId": null, "nextSlideId": "S2", "childSlideId": null }
  },
  {
    "id": "S2",
    "content": "# Parent Slide S2\nContent for S2.",
    "navigation": { "parentSlideId": null, "previousSlideId": "S1", "nextSlideId": "S3", "childSlideId": "S2.C1" }
  },
  {
    "id": "S2.C1",
    "content": "# Child Slide S2.C1\nContent for S2.C1.",
    "navigation": { "parentSlideId": "S2", "previousSlideId": null, "nextSlideId": "S3", "childSlideId": null }
  },
  {
    "id": "S3",
    "content": "# Parent Slide S3\nContent for S3.",
    "navigation": { "parentSlideId": null, "previousSlideId": "S2", "nextSlideId": null, "childSlideId": null }
  }
]
```

_(Note: `S1.C1` (last child of `S1`) now has `nextSlideId: "S2"` because its parent `S1`'s `nextSlideId` is `"S2"`. Similarly, `S2.C1` (last child of `S2`) has `nextSlideId: "S3"` because its parent `S2`'s `nextSlideId` is `"S3"`.)_

**Example 3: Fragment Embedding (Sequential)**

**Fragment Content (`entry.pres`):**

```
# Entry Slide 1
Content before embedding.
---
[Include Details](./details.pres)
---
# Entry Slide 2
Content after embedding.
```

**Fragment Content (`details.pres`):**

```
# Detail Slide D1
Details content 1.
---
# Detail Slide D2
Details content 2.
```

**Resulting `SlideNode`s (simplified, assuming `details.pres` is parsed and its nodes replace the reference):**

```json
[
  {
    "id": "S1", // Entry Slide 1
    "content": "# Entry Slide 1\nContent before embedding.",
    "navigation": { "parentSlideId": null, "previousSlideId": null, "nextSlideId": "S2", "childSlideId": null }
  },
  // Slides from details.pres are injected here
  {
    "id": "S2", // Detail Slide D1 (was S1 in its own fragment context)
    "content": "# Detail Slide D1\nDetails content 1.",
    "navigation": { "parentSlideId": null, "previousSlideId": "S1", "nextSlideId": "S3", "childSlideId": null }
  },
  {
    "id": "S3", // Detail Slide D2 (was S2 in its own fragment context)
    "content": "# Detail Slide D2\nDetails content 2.",
    "navigation": { "parentSlideId": null, "previousSlideId": "S2", "nextSlideId": "S4", "childSlideId": null }
  },
  {
    "id": "S4", // Entry Slide 2
    "content": "# Entry Slide 2\nContent after embedding.",
    "navigation": { "parentSlideId": null, "previousSlideId": "S3", "nextSlideId": null, "childSlideId": null }
  }
]
```

_(Note: ID scheme for embedded fragments needs careful definition. Here, they are re-numbered sequentially in the main flow for simplicity of example)._

**Example 4: Fragment Embedding (Hierarchical)**

**Fragment Content (`entry.pres`):**

```
# Main Topic M1
Content for M1.
--->
[Include Subtopics](./subtopics.pres)
---
# Main Topic M2
Content for M2.
```

**Fragment Content (`subtopics.pres`):**

```m
# Subtopic S1
Content for S1.
---
# Subtopic S2
Content for S2.
```

**Resulting `SlideNode`s (simplified):**

```json
[
  {
    "id": "S1",
    "content": "# Main Topic M1\nContent for M1.",
    "navigation": {
      "parentSlideId": null,
      "previousSlideId": null,
      "nextSlideId": "S2",
      "childSlideId": "S1.subtopicsS1"
    }
  },
  {
    "id": "S1.subtopicsS1", // From subtopics.pres, child of S1
    "content": "# Subtopic S1\nContent for S1.",
    "navigation": {
      "parentSlideId": "S1",
      "previousSlideId": null,
      "nextSlideId": "S1.subtopicsS2",
      "childSlideId": null
    }
  },
  {
    "id": "S1.subtopicsS2", // From subtopics.pres, child of S1, sibling of S1.subtopicsS1
    "content": "# Subtopic S2\nContent for S2.",
    "navigation": {
      "parentSlideId": "S1",
      "previousSlideId": "S1.subtopicsS1",
      "nextSlideId": "S2",
      "childSlideId": null
    } // Last child of S1, S1.next is S2
  },
  {
    "id": "S2",
    "content": "# Main Topic M2\nContent for M2.",
    "navigation": { "parentSlideId": null, "previousSlideId": "S1", "nextSlideId": null, "childSlideId": null }
  }
]
```

**Example 5: Deeper Nesting with `-->>` (Conceptual)**
If `-->>` means "child of the current new child context":

**Fragment Content (`entry.pres`):**

```
# Level 0

--->

# Level 1 Child

-->>

# Level 2 Grandchild (child of Level 1 Child)
```

This would be equivalent to:

```
# Level 0

--->

# Level 1 Child

--->

# Level 2 Grandchild (child of Level 1 Child)
```

**Resulting `SlideNode`s (simplified):**

```json
[
  {
    "id": "S1", // Level 0
    "content": "# Level 0",
    "navigation": { "parentSlideId": null, "previousSlideId": null, "nextSlideId": null, "childSlideId": "S1.C1" }
  },
  {
    "id": "S1.C1", // Level 1 Child
    "content": "# Level 1 Child",
    "navigation": { "parentSlideId": "S1", "previousSlideId": null, "nextSlideId": null, "childSlideId": "S1.C1.C1" }
  },
  {
    "id": "S1.C1.C1", // Level 2 Grandchild
    "content": "# Level 2 Grandchild (child of Level 1 Child)",
    "navigation": { "parentSlideId": "S1.C1", "previousSlideId": null, "nextSlideId": null, "childSlideId": null }
  }
]
```

This implies that the number of `>` in `---[>]` determines the _depth increase_ from the parent of the slide that _would have been created by `---` alone_.

These examples should help clarify the intended parsing behavior. The exact ID generation and linking logic in `processContentRecursive` will need to be robust to handle these cases.

## 3. System / User Flow

1.  **Invocation**: `BuildHandler` gets `Presentation` and `Processor[]`.
2.  **Execution**: `BuildHandler` calls `Parser.parse(presentation, processors)`.
3.  **Internal Parser Logic**:
    a. The `Parser` initializes its state (e.g., `allSlideNodes` list, `idGenerator`, `fragmentMap`).
    b. It iterates through top-level `Fragment`s in `presentation.fragments`, initiating recursive parsing (`processContentRecursive`) for each.
    c. `processContentRecursive` scans content for delimiters (`---`, `--->`) and fragment references.
    i. Segments become `SlideNode`s, frontmatter is parsed.
    ii. Delimiters dictate sibling/child relationships for subsequent recursive calls.
    iii. Fragment references trigger recursive parsing of the referenced fragment's content, embedding its slides.
    iv. All created `SlideNode`s are added to `allSlideNodes` with initial linkage.
    d. A final linking pass refines `previousSlideId`/`nextSlideId` across the `allSlideNodes` list, respecting parent/child groups.
    e. Each `SlideNode` is then processed through the `processorPipeline`.
    f. The `Parser` returns `Ok(allSlideNodes)` or an `Err`.
4.  **Result Handling**: As before.

## 4. Change Summary

### New / Updated Files

- **`src/core/parser.ts`** (New):
  - Purpose: Implements the core parsing logic as described above.
- **`src/core/types/presentation.ts`** (Update):
  - Purpose: Ensure `Presentation`, `Fragment`, `SlideNode`, `Asset`, `PresentationMetadata`, `FragmentMetadata` types align with `_docs/10-Data-Model.md` and support the parsing process.
- **`src/core/index.ts`** (Update):
  - Purpose: Export the `Parser` module's public interface.
- **`src/utils/errors.ts`** (Update or Ensure Exists):
  - Purpose: Defines `AppError` and `ErrorCode` (e.g., `PARSER_ERROR`, `FRONTMATTER_PARSE_ERROR`, `PROCESSOR_ERROR`).
- **`src/utils/frontmatterParser.ts`** (Potentially New):
  - Purpose: A utility to parse frontmatter from a string segment (e.g., using `gray-matter`). Used by `Parser`.

### New / Updated Functions

- **`src/core/parser.ts`**:
  - `export function parse(presentation: Presentation, processors: Processor[]): Result<SlideNode[], AppError>`
    - Purpose: Transforms `Presentation` object into a flat list of processed `SlideNode`s.

### New / Updated Types

- Updates to **`src/core/types/presentation.ts`** to fully align with `_docs/10-Data-Model.md` for `Presentation`, `Fragment`, `SlideNode`, `Asset`, `PresentationMetadata`, `FragmentMetadata`.

### Removal of Files, Functions, and Types

- None anticipated for this feature.

## 5. Test Scenarios

(Skipped as per `/feature-design` instructions for this step)

## 6. Key Assumptions, Behaviors, and Error Handling

### 6.1. General Parsing Behavior

- **Frontmatter Parsing**: Frontmatter within a slide segment (if present) is assumed to be at the very beginning of the segment. The parser will use a library like `gray-matter` to identify and parse this YAML content into `SlideNode.userDefinedFrontMatter`.
- **Parser Synchronicity**: The core parsing logic is **synchronous**. All fragment content is pre-loaded into memory via the `Presentation` object before parsing begins. Future considerations for extremely large presentations might introduce asynchronous operations, which would necessitate changing the `Parser.parse` return type to `PasResult<SlideNode[]>`.
- **Empty Nested Slides from Delimiters**: If a structure like `ParentSlide ---> ---> ChildSlide` is encountered (i.e., a child delimiter immediately followed by another child delimiter without intervening content for the first child), an empty intermediate slide **is created**. This empty slide becomes the parent of `ChildSlide` and the child of `ParentSlide`.

### 6.2. Hierarchical Delimiter Syntax & Level Sequencing

Each slide effectively records the `delimiterLevel` (number of `>` characters) used in the delimiter that created it. For slides created by `---` or the initial slide in an entry fragment, this level is 0.

- **`---` (No `>` characters)**:
  - When this delimiter is processed, the _next_ slide created will be a sibling to the slide that preceded the `---` delimiter (i.e., it will share the same `parentSlideId`). If the `---` is the first delimiter in an entry fragment, the new slide is a top-level slide (`parentSlideId: null`).
  - The `delimiterLevel` recorded for the new slide will be 0.
- **`---` followed by N `>` characters (N > 0; e.g., `--->` for N=1, `-->>` for N=2)**:
  - When this delimiter is processed, the _next_ slide created will be a child of the slide that _immediately preceded_ this delimiter.
  - The `delimiterLevel` recorded for this new child slide will be N.
  - **Error Condition - Strict Sequential Increase**: The `delimiterLevel` (N) of this new child slide _must_ be exactly `parentSlide.delimiterLevel + 1`.
    - For example, if `SlideA` has `delimiterLevel: 0`, its first child `SlideB` must be created with `--->` (N=1), so `SlideB.delimiterLevel` becomes 1.
    - If `SlideB` then has a child `SlideC`, `SlideC` must be created with `-->>` (N=2), so `SlideC.delimiterLevel` becomes 2.
    - If a delimiter attempts to create a child with an N that does not meet this `parentSlide.delimiterLevel + 1` rule (e.g., `SlideA (level 0) -->> SlideB (level 2)` - skipping level 1, or `SlideB (level 1) ---> SlideC (level 1)` - not increasing), the parser will throw an error (e.g., `ErrorCode.PARSER_DELIMITER_SEQUENCE_ERROR`).

### 6.3. Fragment Reference Embedding

- **Reference Identification & Processing**:
  - A fragment reference is processed if a line in the input content **solely consists** of a Markdown-style link where the URL ends with `.pres.md` or `.pres.mdx` (e.g., `[Link Text](./some/fragment.pres.md)`).
  - If such a link pattern is found but is not the only content on the line (i.e., it's an inline reference), it is **ignored** by this embedding mechanism and will be treated as regular Markdown content within the current slide (no warning is issued for this case).
- **Lookup and Contextual Embedding**:
  - If an own-line reference is identified, the path within the Markdown link (e.g., `./some/fragment.pres.md`) is extracted. This path is resolved relative to the path of the fragment _currently being parsed_ to obtain the target fragment's full relative path (from project root). This resolved path is then used as the key to look up the corresponding `Fragment` in the `fragmentMap` (which is keyed by `fragment.metadata.relativePath`).
  - **If Not Found**: A **warning** message (e.g., "Fragment reference './path/to/missing.pres.md' not found. Skipping embedding.") will be logged to the console. Parsing of the current fragment will continue, effectively skipping the missing reference. This is not a hard error.
  - **If Found**: The content of the referenced fragment is parsed recursively. The hierarchical context for the _first slide_ of the embedded fragment is determined by the delimiter (`---` or `---` + N `>`s) present on the same line as the fragment reference itself:
    - If the reference line is just `[link](./file.pres.md)` (no preceding delimiter on the line), it's treated as if `--- [link](./file.pres.md)` was used. The first slide of the embedded fragment becomes a sibling to the slide that preceded the reference line (or a new top-level slide), and its `delimiterLevel` is 0.
    - If the reference line is `---[N>s] [link](./file.pres.md)` (e.g., `---> [link](./file.pres.md)`), the first slide of the embedded fragment becomes a child of the slide that preceded the reference line. Its `delimiterLevel` is N. This N _must_ also adhere to the strict sequential increase rule: N must equal `parentSlide.delimiterLevel + 1`. If not, an error is thrown as per the delimiter sequencing rules.
- **Circular Reference Detection**: See section 6.4.

### 6.4. Circular Fragment Reference Detection

- **Mechanism**: To detect and prevent infinite loops from circular fragment references, the parser will maintain a "parsing stack." This stack will store the `fragment.metadata.relativePath` of each fragment whose parsing has begun but not yet completed.
  1.  Before starting to parse any fragment (whether it's the main entry fragment or one being embedded), its `relativePath` is checked against the current parsing stack.
  2.  If the `relativePath` is already present in the stack, a circular reference is detected.
  3.  If no circular reference is detected, the `relativePath` is added to the stack before its content processing begins.
  4.  Once parsing of a fragment's content is complete (either successfully or due to an error within it, but not due to finding a _new_ circular reference to itself), its `relativePath` is removed from the stack.
- **Error Handling**: Upon detecting a circular reference (step 2 above), the parser will immediately stop processing the current branch of embedding that led to the circularity. It will return an `AppError` (e.g., with `ErrorCode.PARSER_CIRCULAR_REFERENCE`), which should include the path of the fragment that caused the circular dependency and ideally the sequence of fragments in the stack that led to it.
