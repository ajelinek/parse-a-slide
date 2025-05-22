# Technical Implementation: parse-a-slide

This document outlines the technical implementation details for the `parse-a-slide` CLI tool, a framework for processing Markdown-based presentations.

## 1. High-Level Architecture

The system is designed as a CLI application that processes source presentation files (Markdown/MDX) and outputs them into desired formats. The architecture follows a functional programming paradigm: all core modules (discovery, parsing, generation, etc.) are pure functions that do not know about or call each other. The CLI/build command is the sole orchestrator, sequencing the calls, passing outputs as inputs, and managing side effects (watching, logging, etc.).

- **All core modules are pure functions:** They take input and return output, and do not know about or call other modules.
- **The CLI/build command is the orchestrator:** It sequences the calls, passes outputs as inputs, and manages all side effects.
- **No core function triggers or depends on another core function internally.**

## 2. Proposed Folder Structure

```
parse-a-slide/
├── _doc/
│   ├── overview.md
│   └── technical_implementation.md
├── src/
│   ├── cli/
│   │   ├── index.ts # Main CLI entry point, command parsing (e.g., using yargs)
│   │   └── commands/
│   │       └── build.ts # Orchestration logic for build command
│   ├── core/
│   │   ├── discover.ts # Pure: discovers presentation files
│   │   ├── parser.ts # Pure: parses presentation source into metadata and slides
│   │   ├── generator.ts # Pure: generates output files (MD/MDX/HTML)
│   │   ├── processor.ts # (Optional: pure helpers for processing)
│   │   ├── watcher.ts # Side effect: file watching
│   │   └── asset-handler.ts # Pure: manages image copying and Mermaid rendering
│   ├── generators/
│   │   ├── index.ts
│   │   ├── md-generator.ts
│   │   └── html-generator.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── presentation.ts
│   └── utils/
│       ├── file-system.ts
│       └── logger.ts
├── templates/
│   └── rules/
│       └── llm-authoring-rules.md
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

All tests should be next to the files they are testing using the filename.test.ts pattern.

## 3. CLI Design

The CLI is the primary interface for users and the only orchestrator. It uses `yargs` for command and option parsing. The build command:

- Parses and validates options (including `--watch`).
- Calls `discoverPresentations()` (pure) to get presentation file info.
- Passes results to `parsePresentation()` (pure) to get slide nodes.
- Passes slide nodes to `generateOutputFiles()` (pure) and `handleAssets()` (pure) as needed.
- If `--watch` is enabled, starts the watcher (side effect).
- Handles all logging and error reporting.

## 4. Core Modules and Responsibilities

- **discoverPresentations**: Pure function. Takes input patterns, returns presentation file info.
- **parsePresentation**: Pure function. Takes file info, returns slide nodes and metadata.
- **generateOutputFiles**: Pure function. Takes slide nodes and metadata, returns output file data or writes files.
- **handleAssets**: Pure function. Takes slide nodes and paths, returns asset copy/rendering info.
- **startWatcher**: Side effect. Watches files and triggers orchestration in CLI/build command.

## 5. Data Flow Example

1. CLI/build command receives user input and options.
2. Calls `discoverPresentations(inputPatterns)` → returns list of files and contents.
3. Calls `parsePresentation(fileInfo)` → returns slide nodes and metadata.
4. Calls `handleAssets(slideNodes, ...)` and `generateOutputFiles(slideNodes, ...)` as needed.
5. If `--watch`, calls `startWatcher(...)` to re-trigger orchestration on changes.

## 6. Key Data Models/Types

See `src/types/presentation.ts` for data models. All data is passed explicitly between pure functions and the orchestrator.
