# parse-a-slide: Presentation Processing Framework Overview

## 1. Introduction

**`parse-a-slide`** is a standalone command-line interface (CLI) tool designed to streamline the creation, processing, and management of slide-based presentations. It empowers users to author presentations using familiar Markdown (`.md`) or MDX (`.mdx`) syntax and then transforms these source files into structured, ready-to-use formats. A key aspect of this framework is to facilitate the generation of presentation Markdown by Large Language Models (LLMs), enabling users to, for example, convert voice-to-text input or existing documents into well-structured presentations. To support this, `parse-a-slide` will include a dedicated rules file that LLMs can interpret to correctly format and build out presentation content according to the framework's specifications.

The primary goal of `parse-a-slide` is to simplify the workflow for generating presentations from text-based sources—whether manually authored or AI-generated—making it easy to integrate them into various content pipelines, static site generators, or for direct viewing.

## 2. How It Works (User Perspective)

The process is designed to be straightforward:

### a. Authoring Presentations

Users create their presentation content in standard Markdown or MDX files. The framework supports a rich authoring experience:

- **File-based Presentations**: Each `.md` or `.mdx` file can represent an entire presentation.
- **Slide Definition**: Slides within a presentation are clearly demarcated using simple HTML comment blocks, typically `<!-- slide-start -->` and `<!-- slide-end -->`.
- **Presentation Metadata**: Top-level frontmatter in the Markdown/MDX file allows for defining metadata for the entire presentation (e.g., title, author, description, date).
- **Slide-Specific Metadata**: Optional metadata can be added directly within the `<!-- slide-start -->` comment for individual slides (e.g., slide title, transition effects, visibility).
- **Reusable Slides**: Content from external Markdown files can be easily included as reusable slides, promoting modularity.
- **Image Handling**: Standard Markdown image syntax (`![alt text](./images/image.png)`) is used. Images are typically co-located with presentation files in a subdirectory (e.g., `images/`).
- **Diagrams as Code**: Mermaid.js diagrams can be embedded directly in Markdown code blocks. The framework will automatically pre-render these into static images during processing.

### b. Processing with the CLI

Once authored, presentations are processed using the `parse-a-slide` CLI tool. The tool:

1.  **Discovers** presentation source files based on user-provided paths or patterns.
2.  **Parses** each presentation, identifying individual slides, extracting metadata, and processing content.
3.  **Handles Assets** by, for example, copying images to appropriate output locations and converting Mermaid diagrams.
4.  **Generates Output** files in the specified format.

## 3. Key Features

`parse-a-slide` offers a range of features designed for flexibility and ease of use:

- **Command-Line Interface (CLI)**:

  - `parse-a-slide build [options]`: Processes the specified presentation source files once, generating the defined output. This is the core command for transforming your raw presentation files into their final form.
  - `parse-a-slide watch [options]`: Actively monitors the specified presentation source files and directories for any changes. Upon detecting a change, it automatically rebuilds the affected presentations, providing a seamless development experience.

- **Flexible Input Specification**:

  - **Glob Patterns**: Users can specify input files or directories using powerful glob patterns (e.g., `presentations/**/*.mdx`, `slides/intro.md`). This allows for precise control over which files are processed.
  - **Directory Processing**: The CLI can be pointed at an entire directory. It will then discover and process all valid presentation files within that directory (and its subdirectories, if configured), generating a corresponding output for each.

- **Versatile Output Formats**:

  - **Initial Support**:
    - **Markdown (`.md`)**: Processed Markdown files, potentially with structured slide content.
    - **MDX (`.mdx`)**: Processed MDX files, suitable for advanced JavaScript and component embedding.
      The output will be structured to be easily consumable by other tools, such as static site generators (e.g., Astro, Next.js, Hugo) or content management systems.
  - **Future Enhancements**:
    - **Standalone Web Pages (HTML)**: Direct generation of interactive HTML presentations that can be viewed in any web browser.

- **Automated Content Management**:
  - **Image Asset Handling**: Automatically copies referenced image assets to the correct locations within the output structure, ensuring links remain valid.
  - **Mermaid Diagram Pre-rendering**: Converts Mermaid diagram code blocks into static images (SVG or PNG) during the build process. This means no client-side JavaScript is needed to render diagrams in the final output, improving performance and compatibility.

## 4. Target Audience

`parse-a-slide` is designed for:

- **Developers**: Who want to integrate presentation generation into their development workflows or build custom presentation solutions.
- **Technical Writers & Documentarians**: Who prefer authoring content in Markdown and need a way to produce slide decks.
- **Educators & Speakers**: Who need an efficient way to create and maintain presentation materials using text-based formats.
- **Content Creators**: Looking for a scriptable and automated method to manage and build presentations for static websites or other platforms.
- Anyone who values the simplicity and power of Markdown for creating slide-based content.

## 5. Vision

The vision for `parse-a-slide` is to be a robust, flexible, and user-friendly CLI tool that empowers individuals and teams to transform their Markdown-based presentation ideas into polished, distributable, and easily maintainable formats. It aims to bridge the gap between simple text-based authoring and rich presentation experiences.
