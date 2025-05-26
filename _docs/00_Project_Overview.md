# Project Title: parse-a-slide

## 1. Application Purpose

A command-line interface (CLI) tool that processes presentation files in a directory structure, where each presentation is a folder with an `index.pres.md` or `index.pres.mdx` entry point. The tool processes these files to create structured slide decks with support for:

- **Hierarchical Slides**: Create nested slides using simple markdown delimiters (`---` for slides, `--->` for nested slides)
- **Slide Fragments**: Reusable slide components as separate `.pres.md` files
- **Slide Metadata**: YAML frontmatter for slide-specific configurations (title, transitions, backgrounds)
- **Mermaid Integration**: Automatic preprocessing of Mermaid diagrams
- **Multiple Outputs**: Generate MD/MDX with navigation metadata or static HTML

Example Structure:

```
---
title: Slide 1
---
Content for slide 1
--->
Nested slide 1.1
--->
Nested slide 1.2
--->>
Deeper nested slide 1.2.1
---
Slide 2
```

## 2. Target Users

- **Developers** integrating presentation generation into workflows
- **Technical Writers & Documentarians** creating slide content in Markdown
- **Educators & Speakers** maintaining presentation materials
- **Content Creators** managing presentations for static websites
- **AI/LLM Systems** generating structured presentation content

## 3. Technology Stack

- `Backend`: TypeScript/Node.js
- `Build Tool`: TypeScript Compiler
- `Testing`: Vitest (using .test.ts pattern) in a `__tests__` directory next to the code.
- `Documentation`: Markdown

## 4. Key Non-Functional Requirements (NFRs)

- `Performance`: General use, will work for large presentations, but not optimized
- `Reliability`: Consistent output generation
- `Extensibility`: Support for multiple output formats
- `Developer Experience`: Clear error messages and logging
- `Maintainability`: Well-typed and tested codebase

## 5. Architectural Style

Modular CLI application following functional programming principles with pure functions for core operations and clear separation of concerns.

## 6. High-Level Feature List

- **CLI Interface** with build and watch commands
- **Markdown/MDX Processing** with slide detection
- **Asset Management** for images and diagrams
- **Mermaid.js Integration** for diagram generation
- **Metadata Support** for presentations and slides
- **Modular Architecture** with clear separation of concerns
- **Watch Mode** for development
- **Multiple Output Formats** (MD, MDX, with HTML planned)

## 7. Technical Decisions

- **Functional Architecture:** Pure functional core with imperative shell for improved testability and maintainability
- **TypeScript:** Chosen for type safety, better developer experience, and compile-time error checking
- **File-based Configuration:** Enables version control, easy sharing, and automated build processes
- **Testing with Vitest:** Selected for its simple setup, fast execution, and clear test organization
