# Feature: Basic Generator (HTML) - Technical Design

**Purpose**: This document provides the detailed technical specifications for the Basic Generator (HTML) feature. It includes a technical overview, implementation details for all affected modules and types, and comprehensive test scenarios.

## 1. Feature Overview

The HTML generator will extend the application's capabilities to produce a static, self-contained HTML version of a presentation from the parsed `SlideNode` tree. This feature introduces a new `html` output format option in the CLI.

The core of this feature is a new `HtmlGenerator` module. This module will traverse the `SlideNode` structure and transform each node into a corresponding HTML file. The entry point of the presentation, `index.pres.md` or `index.pres.mdx`, will be converted into `index.html`, which will serve as the main page. All other slides will be generated as separate HTML files (e.g., `slide-1.html`, `slide-2.html`), allowing for deep linking. Nested slides will be rendered as sections within their parent slide's HTML file, accessible via anchor links. The generator will also manage assets by copying them to a dedicated output subfolder and rewriting all links to be relative, ensuring the presentation is fully portable.

## 2. System / User Flow

```mermaid
flowchart TD
    A[CLI: User runs 'build --format html'] --> B{Core: Parser};
    B --> C[Parse Slides & Metadata];
    C --> D[Generate SlideNode[] Tree];
    D --> E{Core: Generator};
    E --> F[Select HtmlGenerator];
    F --> G[For each SlideNode in Tree];
    G --> H[Generate HTML Content];
    G --> I[Copy Assets to './dist/_assets'];
    H --> J[Write to './dist/slide-N.html'];
    I --> J;
    J --> K[Output: Static HTML Presentation];
```

## 3. Change Summary Table

| Module/File Path                     | Item Name          | Status    | Description                                                                  |
| :----------------------------------- | :----------------- | :-------- | :--------------------------------------------------------------------------- |
| `src/core/generateHtml.ts`           | `toHtml`           | `New`     | New module to generate HTML using Handlebars, Marked, and Highlight.js.      |
| `src/core/templates/slide.hbs`       | `slide.hbs`        | `New`     | New Handlebars template for the individual slide structure.                  |
| `src/core/assets/tokens.css`         | `tokens.css`       | `New`     | New CSS file for custom styling variables.                                   |
| `src/core/assets/style.css`          | `style.css`        | `New`     | New CSS for the navigation widget and context menu.                          |
| `src/core/assets/main.js`            | `main.js`          | `New`     | New JavaScript file for context menu and navigation interactivity.           |
| `src/core/generator.ts`              | `exports`          | `Updated` | Export the new `toHtml` function from the generator index.                   |
| `src/core/types.ts`                  | `Format`           | `Updated` | Add 'html' to the list of supported output formats.                          |
| `package.json`                       | `dependencies`     | `Updated` | Add `handlebars`, `marked`, and `highlight.js`.                              |

## 4. UI/UX Layout and Design

This section describes the visual layout and user experience for the generated HTML presentation.

#### 4.1. Slide Page Layout

The slide page displays the content and provides a fixed, semi-transparent navigation widget in the bottom-right corner.

```
+--------------------------------------------------+
| +-------+                                        |
| | Title |                                        |
| +-------+                                        |
|                                                  |
| +----------------------------------------------+ |
| |                                              | |
| |                Slide Content                 | |
| |                                              | |
| +----------------------------------------------+ |
|                                                  |
|                    (scroll indicator V)          |
|                                                  |
|                            +-----------------+   |
|                            |  ^              |   |
|                            | < M >           |   |
|                            |  v              |   |
|                            +-----------------+   |
+--------------------------------------------------+
```

- **Navigation Widget**: A fixed, semi-transparent gamepad-style control. The arrows navigate between slides (`<`, `>`) and nested content (`^`, `v`). The center button (`M`) opens the context menu.
- **Scroll Indicator**: An animated chevron icon will appear if the content overflows the viewport.

#### 4.2. Context Menu Layout

When the user clicks the 'Menu' button, a hierarchical list of all slides will appear as an overlay.

```
+--------------------------------------------------+
| +----------------------------------------------+ |
| | Presentation Title                           | |
| |----------------------------------------------| |
| | - Slide 1 (current)                          | |
| |   - Nested Slide 1.1                         | |
| | - Slide 2                                    | |
| | - Slide 3                                    | |
| +----------------------------------------------+ |
|                                                  |
+--------------------------------------------------+
```

## 5. Implementation Details

This section details the new and updated modules, functions, and types required to implement the HTML generator.

#### 4.1. New Dependencies (`package.json`)

- **`handlebars`**: A powerful templating engine to separate HTML structure from generation logic.
- **`marked`**: A robust markdown parser to convert slide content to HTML.
- **`highlight.js`**: A syntax highlighter for code blocks.

#### 4.2. `build-command.ts` (`src/cli/commands/build-command.ts`)

- **Status**: Existing
- **Updated Item**: `BuildCommand`
  - **Purpose**: To add a new `--out-dir` option for specifying the HTML output directory, which will default to `./dist_slides`.

#### 5.3. `types.ts` (`src/core/types.ts`)

- **Status**: Existing
- **Updated Types**:
  - **`Format`**: Add `html` to the list of supported formats.
    ```typescript
    export type Format = 'md' | 'mdx' | 'html';
    ```

#### 5.4. `generateHtml.ts` (`src/core/generateHtml.ts`)

- **Status**: New
- **New Function**: **`toHtml(nodes: SlideNode[], options: GeneratorOptions): void`**
  - **Purpose**: Transforms `SlideNode` objects into a static HTML presentation, using Handlebars for templating, Marked for markdown conversion, and Highlight.js for syntax highlighting.
  - **Implementation Approach**:
    - Determine the output directory from `options.outDir` or default to `./dist_slides`.
    - Read the `slide.hbs` template file.
    - Compile the Handlebars template.
    - For each `SlideNode`:
      - Convert the slide's markdown content to HTML using `marked`.
      - Apply syntax highlighting to code blocks in the generated HTML using `highlight.js`.
      - Prepare the data object for Handlebars, including the HTML content, navigation links (Next/Previous), theme (from frontmatter), and page title.
      - Render the final HTML by passing the data to the compiled Handlebars template.
      - Write the HTML to the appropriate file in the output directory.
    - Copy Pico.css, `tokens.css`, and all referenced assets to the output directory, ensuring all links are relative.
  - **Accessibility**: Ensure all generated HTML is accessibility-compliant by using semantic tags (e.g., `<nav>`, `<main>`, `<section>`) and ARIA roles where appropriate in the Handlebars template.

#### 5.5. `slide.hbs` (`src/core/templates/slide.hbs`)

- **Status**: New
- **Purpose**: A Handlebars template defining the structure of each HTML slide page.
- **Structure Outline**:
  ```html
  <!DOCTYPE html>
  <html>
    <head>
      <title>{{title}}</title>
      <link rel="stylesheet" href="pico.min.css">
      <link rel="stylesheet" href="style.css">
      <link rel="stylesheet" href="tokens.css">
    </head>
    <body data-theme="{{theme}}">
      <main class="container">{{{content}}}</main>
      <div id="nav-widget">...</div>
      <div id="context-menu" class="hidden">...</div>
      <script id="slide-data" type="application/json">{{{slideHierarchyJson}}}</script>
      <script src="main.js"></script>
    </body>
  </html>
  ```

#### 5.6. `main.js` (`src/core/assets/main.js`)

- **Status**: New
- **Purpose**: To handle all client-side interactivity for the navigation widget and context menu.
- **Implementation Approach**:
  - Add event listener to the 'Menu' button to toggle the visibility of the context menu.
  - On page load, parse the JSON data from the `<script id="slide-data">` tag.
  - Dynamically generate the hierarchical list of slides and inject it into the context menu container.
  - Implement logic to show/hide the scroll indicator based on content height vs. viewport height.

#### 5.7. `style.css` (`src/core/assets/style.css`)

- **Status**: New
- **Purpose**: To contain the CSS for the gamepad navigation and scroll indicator.

#### 5.8. `tokens.css` (`src/core/assets/tokens.css`)

- **Status**: New
- **Purpose**: To hold all custom CSS variables for easy theming and customization. It can be initially empty.

## 5. Test Scenarios (Gherkin)

```gherkin
Feature: Basic Generator (HTML)

  #---------------------------------------------------------------------------
  # Module: generateHtml
  # Function: toHtml
  #---------------------------------------------------------------------------

  @happyPath @status_pending
  Scenario: Generate a basic HTML presentation
    Given a presentation with multiple slides
    When the build command is run with the 'html' format
    Then the output directory should contain an 'index.html' file
    And the output directory should contain 'slide-N.html' files for each subsequent slide

  @happyPath @status_pending
  Scenario: HTML output includes correct navigation
    Given a generated HTML presentation with multiple slides
    When viewing 'index.html'
    Then it should contain a 'Next' link pointing to 'slide-1.html'
    And it should not contain a 'Previous' link
    When viewing 'slide-1.html'
    Then it should contain a 'Next' link pointing to 'slide-2.html'
    And it should contain a 'Previous' link pointing to 'index.html'

  @happyPath @status_pending
  Scenario: Assets are copied and linked correctly
    Given a slide that contains an image reference
    When the build command is run with the 'html' format
    Then the image file should be copied to the '_assets' directory
    And the 'img' tag's 'src' attribute in the corresponding HTML file should be a relative path to the asset

  @happyPath @status_pending
  Scenario: Nested slides are rendered as sections
    Given a slide with nested slides
    When the build command is run with the 'html' format
    Then the parent slide's HTML file should contain sections for each nested slide with corresponding anchor IDs

  @errorPath @status_pending
  Scenario: Handle file system errors during generation
    Given a presentation and an output directory that is not writable
    When the build command is run with the 'html' format
    Then the process should fail with a clear error message about file system permissions
```
