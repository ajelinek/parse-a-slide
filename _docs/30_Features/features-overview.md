# Features Overview

This document outlines the features and user stories for the CLI Slide Parser project, organized to facilitate incremental development and testing.

[x] E1: Core Infrastructure - Foundational elements required for the application, including logging, CLI setup, file system utilities, and testing support.

- [x] **F1: Logger Implementation** - Develop a centralized logger utility.

  - [x] **S1**: Support for info, error, and debug log levels.
  - [x] **S2**: CLI flags (`--verbose`, `--quiet`) to control log output verbosity.

- [x] **F2: Basic CLI Structure** - Set up the basic command-line interface using `yargs`.

  - [x] **S1**: Implement a `build` command in the CLI.
  - [x] **S2**: Parse basic options (`input`, `output`, `format`) and pass to `BuildHandler`.

- [x] **F3: FSUtils Implementation** - Create the file system utility module.

  - [x] **S1**: Provide `neverthrow`-wrapped functions for reading, writing, and finding files by glob patterns.

- [x] **F4: Testing Utility Setup** - Develop the initial testing utility for creating file/directory structures.
  - [x] **S1**: Utility to set up test-specific file structures from a configuration for realistic file-based testing.

---

[x] E2: Core Parsing Pipeline - Implementing the main workflow for discovering, parsing, and generating presentation slides.

- [x] **F5: Presentation Discovery** - Implement the `Discovery` module to find presentation and fragment files.

  - [x] **S1**: Identify `index.pres.md(x)` files as main presentations.
  - [x] **S2**: Identify all non-`index.pres.md(x)` files (e.g., `anyname.pres.md(x)`) as fragments associated with the main presentation in their directory.
  - [x] **S3**: Return `PresentationMetadata` (paths only, no content) for each presentation.
  - [x] **S4**: Validate against conflicting `index.pres` files in the same directory.

- [x] **F5.1: Global Presentation Fragments** - Implement the `Discovery` module to find presentation and fragment files which are not part of a specific presentation. (Any folder which does not have a root `index.pres` file)

  - [x] **S1**: Identify all non-`index.pres.md(x)` files (e.g., `anyname.pres.md(x)`) as fragments associated with the global presentation in their directory.
  - [x] **S2**: Return `FragmentMetadata` (paths only, no content) for each fragment.
  - [x] **S3**: Validate against conflicting `index.pres` files in the same directory.

- [x] **F6: Presentation Inflation** - Implement logic in `BuildHandler` to load content for discovered presentations.

  - [x] **S1**: `BuildHandler` reads content of presentations and fragments using `FSUtils`.
  - [x] **S2**: `BuildHandler` creates an inflated `Presentation` object with all metadata and content.

- [x] **F7: Core Parser Implementation** - Develop the `Parser` module to transform presentation content into `SlideNodes`.

  - [x] **S1**: `Parser` takes an inflated `Presentation` object and produces a list of `SlideNodes`.
  - [x] **S2**: Handle basic slide and fragment structures.
  - [x] **S3**: Support an extensible `Processor` pipeline (initially with no-op processors).

---

[ ] E3: Content Processing & Asset Management - Advanced parsing features and asset handling pipeline.

- [x] **F8: Front Matter Parsing** - Implement YAML front matter extraction and processing for fragments.

  - [x] **S1**: Create a `FrontMatterParser` utility to parse YAML front matter from raw file content.
  - [x] **S2**: Create a `PresentationInflator` module that reads all fragment files.
  - [x] **S3**: The `Inflator` should use the `FrontMatterParser` to extract front matter from the entry point and all other fragments.
  - [x] **S4**: The `Inflator` should merge the entry point's front matter with each fragment's front matter, with fragment-specific properties taking precedence.
  - [x] **S5**: The `Parser` should be simplified to accept a `Presentation` where each `Fragment` contains its final, pre-merged front matter.
  - [x] **S6**: The `SlideNodeBuilder` should apply the final front matter properties (`title`, `appearance`, `userDefinedFrontMatter`, etc.) to the `SlideNode`.

- [x] **F9: Asset Copier - Source Assets** - Implement the `AssetCopier` to handle existing assets.

  - [x] **S1**: Copy existing images and other non-presentation files from source to output for relative linking.
  - [x] **S2**: `AssetCopier` copies all files (excluding `.pres.*` and `.frag.*`) from source to target.
  - [x] **S3**: Update asset references in SlideNode content to maintain correct relative paths.
  - [x] **S4**: Handle asset deduplication when the same asset is referenced by multiple slides.


---

[ ] E4: Output Generation - Multiple output format support for presentations.

- [x] **F11: Basic Generator (MDX)** - Implement the `Generator` to output `SlideNodes` as MDX.

  - [x] **S1**: Generate MDX output from parsed slides based on `mdx` format option.
  - [x] **S2**: Include navigation metadata in MDX output for slide transitions.
  - [x] **S3**: Preserve front matter in generated MDX files.
  - [x] **S4**: Handle embedded assets and maintain proper references.

- [x] **F12: Basic Generator (HTML)** - Extend the `Generator` to output `SlideNodes` as HTML.

  - [x] **S1**: Generate HTML output from parsed slides based on `html` format option.
  - [x] **S2**: Apply appearance settings from front matter to HTML output.
  - [x] **S3**: Generate navigation controls and slide structure in HTML.
  - [x] **S4**: Embed assets directly or via references in HTML output.

- [ ] **F13: Mermaid Diagram Support** - Implement a `Processor` and related logic for handling Mermaid diagrams.

  - [ ] **S1**: Implement a `Processor` to identify Mermaid code blocks in slide content.
  - [ ] **S2**: Render Mermaid code blocks to SVG files for HTML output format.
  - [ ] **S3**: Preserve raw Mermaid code blocks for MDX and MD output formats.
  - [ ] **S4**: Embed generated SVGs (e.g., via `<img>` tags) into HTML slide outputs.
  - [ ] **S5**: Provide the generated svg as output in the SlideNode.

- [ ] **F14: Asset Copier - Generated Assets** - Extend `AssetCopier` to handle assets created by processors.
  - [ ] **S1**: `AssetCopier` writes new assets generated by processors (e.g., diagrams from code, including Mermaid SVGs) to the output directory.
  - [ ] **S2**: Update SlideNode content to reference generated assets with correct paths.
  - [ ] **S3**: Manage asset lifecycle and cleanup for regenerated content.

---

[ ] E5: CLI Integration & Completion - Complete the CLI implementation to make parse-a-slide fully functional.

- [ ] **F15: CLI Integration & Build Pipeline** - Complete the CLI build handler to integrate all core components into a working application.

  - [ ] **S1**: Implement the complete `buildHandler` function to orchestrate the full build pipeline.
  - [ ] **S2**: Integrate logger configuration based on CLI options (`verbose`, `quiet`).
  - [ ] **S3**: Implement output directory cleaning when `clean` option is specified.
  - [ ] **S4**: Integrate `Discovery` module to find presentations from input patterns/paths.
  - [ ] **S5**: Integrate `PresentationInflator` to load and inflate discovered presentations.
  - [ ] **S6**: Integrate `Parser` to convert presentations into `SlideNodes`.
  - [ ] **S7**: Integrate `AssetCopier` to handle source assets during build process.
  - [ ] **S8**: Integrate `Generator` modules to output files in specified format (MDX/HTML).
  - [ ] **S9**: Implement error handling and user-friendly error messages throughout the pipeline.
  - [ ] **S10**: Add progress reporting for multi-presentation builds.
  - [ ] **S11**: Add validation for input paths and output directory permissions.
  - [ ] **S12**: Implement proper exit codes and error reporting for CI/CD integration.