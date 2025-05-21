# Project Features and User Stories

This document outlines the planned features and user stories for the `parse-a-slide` CLI tool.

- [x] F0: Project Initialization & NPM Setup - Establish the foundational project structure, build tooling, and NPM publishing configurations.

  - [x] S1: Create Core Directory Structure - Set up `src/`, `test/`, `_doc/`, `templates/` folders as per `technical_implementation.md`.
  - [x] S2: Initialize `package.json` - Configure with basic project info, scripts (`build`, `test`, `dev`), and dependencies (TypeScript, pnpm, Vitest, yargs, glob, gray-matter, chokidar, fast-glob).
  - [x] S3: Configure TypeScript (`tsconfig.json`) - Set up for compilation to `dist/`, including module settings and type checking.
  - [x] S4: Configure Vitest - Set up test environment and necessary configurations for unit testing.
  - [x] S5: Create `README.md` - Initial project description and usage instructions.
  - [x] S6: Create `LICENSE` file - Add an appropriate open-source license (e.g., MIT).
  - [x] S7: Set up NPM Publishing Configuration - Define `files` in `package.json`, `.npmignore` if needed, and ensure `main` and `types` fields point to `dist/`.
  - [x] S8: Create Basic `src/index.ts` - Placeholder main export for the library.
  - [x] S9: Add `.gitignore` - Standard Node.js/TypeScript ignores.

- [ ] F1: CLI Application Core - Establish the CLI for user interaction, command/option parsing.

  - [ ] S1: Initialize CLI Framework - Set up `yargs` for command structure and help messages.
  - [ ] S2: Implement `build` Command - Define the primary command to process presentations.
  - [ ] S3: Parse Input Source Option - Enable users to specify presentation source files/patterns (`--input`, `-i`).
  - [ ] S4: Parse Output Directory Option - Allow users to define where processed files are saved (`--output-dir`, `-o`).
  - [ ] S5: Parse Output Format Option - Support `mdx` and `md` output formats (`--format`, `-f`).
  - [ ] S6: Parse Watch Mode Option - Allow enabling/disabling file watching for auto-rebuild (`--watch`, `-w`).
  - [ ] S7: Parse Clean Option - Enable cleaning of the output directory before a build (`--clean`).
  - [ ] S8: Parse Verbosity Option - Provide an option for detailed logging output (`--verbose`, `-v`).
  - [ ] S9: Implement `run` Command Handler - Create main logic in `src/cli/commands/run.ts` for task orchestration.

- [ ] F2: Presentation Source Discovery - Automatically find and identify presentation source files.

  - [ ] S1: Implement `discoverPresentations` Function - Use glob patterns to find all potential presentation files.
  - [ ] S2: Identify Main Presentation Entry Points - Distinguish `index.pres.md(x)` as main presentation files.
  - [ ] S3: Handle Presentation Fragments - Recognize other `.pres.md(x)` files as parts of the main presentation.
  - [ ] S4: Integrate Discovery into Build - Use `discoverPresentations` in the `run` command.

- [ ] F3: Presentation Content Parsing - Analyze source files for metadata, slide structures, and content.

  - [ ] S1: Parse Presentation Frontmatter - Extract `PresentationMetadata` from `index.pres.md(x)` using `gray-matter`.
  - [ ] S2: Implement Basic Slide Parsing - Identify slides using `<!-- slide-start -->` and `<!-- slide-end -->` delimiters.
  - [ ] S3: Extract Slide Content - Capture raw Markdown/MDX content within each slide.
  - [ ] S4: Extract Slide-Specific Metadata - Parse metadata from `<!-- slide-start [metadata] -->` comments.
  - [ ] S5: Generate Hierarchical Slide IDs - Create unique, structured IDs (e.g., `S1`, `S1.1`) for slides.
  - [ ] S6: Establish Slide Navigation Links - Populate `parentId`, `childrenIds`, `nextSlideId`, `prevSlideId` in `SlideNode`.
  - [ ] S7: Parse and Inline Reusable Slides - Support `[](./reusable.pres.md)` syntax for embedding slides.
  - [ ] S8: Implement `parsePresentationSource` - Consolidate file reading, frontmatter, and slide parsing.

- [ ] F4: Asset Management - Handle static assets (images) and process dynamic content (Mermaid diagrams).

  - [ ] S1: Copy Static Asset Directory - Replicate the `assets/` folder from source to output.
  - [ ] S2: Implement `handleAssets` Function - Centralize asset processing logic.
  - [ ] S3: Render Mermaid to SVG (HTML Output) - Convert ` ```mermaid ``` ` to SVG images for HTML format.
  - [ ] S4: Store Mermaid SVG Paths - Track generated SVG paths for HTML output.

- [ ] F5: Output File Generation - Create processed presentation files in MDX, MD, or HTML format.

  - [ ] S1: Implement `generateOutputFiles` Function - Orchestrate creation of output files.
  - [ ] S2: Create Output Directory Structure - Set up folders like `outputDir/presentationSlug/` and `mermaid_images/`.
  - [ ] S3: Generate Slide Files (MDX/MD) - Create an output file per slide with frontmatter and content.
  - [ ] S4: Preserve Raw Mermaid (MDX/MD) - Retain Mermaid code blocks as-is for MD/MDX.
  - [ ] S5: Generate Slide Files (HTML) - Create `.html` files per slide for HTML format.
  - [ ] S6: Embed Mermaid SVGs (HTML) - Replace Mermaid blocks with `<img>` tags linking to SVGs.
  - [ ] S7: Ensure Correct Asset Paths - Verify relative links to assets work in generated output.

- [ ] F6: Watch Mode for Live Reloading - Monitor source files and assets for changes, automatically reprocessing.

  - [ ] S1: Initialize File Watcher - Use `chokidar` to monitor input patterns.
  - [ ] S2: Trigger Reprocessing on Change/Add - Re-run processing for modified/new files.
  - [ ] S3: Handle Source Deletion - Remove corresponding output if a source presentation is deleted.
  - [ ] S4: Integrate Watcher with `run` Command - Activate watcher via `--watch` flag.

- [ ] F7: Core Data Structures & Utilities - Define essential TypeScript types and utility functions.

  - [ ] S1: Define `PresentationMetadata` Type - For presentation-level frontmatter.
  - [ ] S2: Define `SlideMetadata` Type - For slide-level metadata.
  - [ ] S3: Define `SlideNode` Type - Model parsed slides (content, metadata, navigation).
  - [ ] S4: Define `ProcessedAssets` Type - For info on processed assets (e.g., Mermaid paths).
  - [ ] S5: Implement File System Utilities - Create helpers for FS operations in `src/utils/file-system.ts`.
  - [ ] S6: Implement Logging Utility - Create a simple logger in `src/utils/logger.ts`.

- [ ] F8: Presentation Processing Orchestration - Manage the end-to-end workflow for a single presentation.
  - [ ] S1: Implement `processPresentation` Function - Central function for parsing, asset handling, generation.
  - [ ] S2: Derive `presentationSlug` - Determine a unique slug from the source file path.
  - [ ] S3: Implement `deleteGeneratedPresentation` - Logic to clean up output for a presentation.
  - [ ] S4: Integrate `processPresentation` - Call from `run` command for each presentation.
