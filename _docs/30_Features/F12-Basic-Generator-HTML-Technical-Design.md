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

| Module/File Path                      | Item Name          | Status    | Description                                                                  |
| :------------------------------------ | :----------------- | :-------- | :--------------------------------------------------------------------------- |
| `package.json`                        | `dependencies`     | `Updated` | Add `handlebars`, `marked`, and `highlight.js`.                              |
| `src/core/generator/generateHtml.ts`  | `toHtml`           | `New`     | New module to generate HTML from a `SlideNode` tree.                         |
| `src/core/generator/templates/slide.hbs` | `slide.hbs`        | `New`     | New Handlebars template for the individual slide structure.                  |
| `src/core/assets/tokens.css`          | `tokens.css`       | `New`     | New CSS file for custom styling variables.                                   |
| `src/core/assets/style.css`           | `style.css`        | `New`     | New CSS for the navigation widget and context menu.                          |
| `src/core/assets/main.js`             | `main.js`          | `New`     | New JavaScript file for context menu and navigation interactivity.           |
| `src/core/generator/index.ts`         | `exports`          | `Updated` | Export the new `toHtml` function from the generator index.                   |

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

This section details the new and updated modules required to implement the HTML generator.

#### 5.1. Dependency Updates (`package.json`)

- **Status**: Existing
- **Description**: Add the following `dependencies` to support HTML generation, templating, and syntax highlighting.
  - `handlebars`: For processing Handlebars templates.
  - `marked`: For converting Markdown content to HTML.
  - `highlight.js`: For code syntax highlighting.

#### 5.2. Core HTML Generator (`src/core/generator/generateHtml.ts`)

- **Status**: New
- **New Function**: `toHtml(nodes: SlideNode[], options: GeneratorOptions): void`
  - **Purpose**: To orchestrate the HTML generation process. It will traverse the `SlideNode` tree, render each slide using a Handlebars template, and write the output to the specified directory.
  - **Implementation Approach**:
    - Iterate through each `SlideNode` in the provided tree.
    - For each node, determine the correct output filename (e.g., `index.html` for the first slide, `slide-1.html`, etc.).
    - Convert the slide's Markdown content to HTML using `marked`.
    - Use `highlight.js` to apply syntax highlighting to any code blocks within the converted HTML.
    - Prepare a data object for the template that includes the slide content, navigation links (`next` and `prev` URLs), and a hierarchical list of all slides for the context menu.
    - Render the final HTML by passing this data to a compiled Handlebars template (`slide.hbs`).
    - Write the rendered HTML to the corresponding file in the output directory.
  - **Error Handling**: The function will include robust error handling to catch and report file system errors, such as a lack of write permissions.

#### 5.3. Handlebars Template (`src/core/generator/templates/slide.hbs`)

- **Status**: New
- **Purpose**: To define the reusable HTML structure for every slide page.
- **Structure Outline**:
  ```html
  <!DOCTYPE html>
  <html>
    <head>
      <title>{{title}}</title>
      <link rel="stylesheet" href="_assets/style.css">
      <link rel="stylesheet" href="_assets/tokens.css">
    </head>
    <body>
      <main>{{{content}}}</main>
      <nav id="nav-widget">...</nav>
      <div id="context-menu" class="hidden">...</div>
      <script id="slide-data" type="application/json">{{{slideHierarchyJson}}}</script>
      <script src="_assets/main.js"></script>
    </body>
  </html>
  ```

#### 5.4. Frontend Assets (`src/core/assets/`)

- **Status**: New
- **Purpose**: To provide styling and interactivity for the generated HTML presentation.
- **Files**:
  - `main.js`: Handles interactivity for the navigation widget and context menu. It will read from the `slide-data` script tag to build the menu.
  - `style.css`: Contains all styles for the presentation, including the navigation controls and context menu.
  - `tokens.css`: Holds CSS variables for theming.
- **Asset Handling**: The existing `asset-copier.ts` utility will be used to copy these files, along with any user assets (e.g., images), to an `_assets` subfolder in the output directory. All paths in the HTML will be updated to be relative to this folder.

#### 5.5. Generator Index (`src/core/generator/index.ts`)

- **Status**: Existing
- **Description**: The `index.ts` file will be updated to export the new `toHtml` function, making it available to the CLI and other parts of the application.

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
