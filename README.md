# parse-a-slide

**`parse-a-slide`** is a standalone command-line interface (CLI) tool designed to streamline the creation, processing, and management of slide-based presentations. It empowers users to author presentations using familiar Markdown (`.md`) or MDX (`.mdx`) syntax and then transforms these source files into structured, ready-to-use formats. A key aspect of this framework is to facilitate the generation of presentation Markdown by Large Language Models (LLMs), enabling users to, for example, convert voice-to-text input or existing documents into well-structured presentations. To support this, `parse-a-slide` will include a dedicated rules file that LLMs can interpret to correctly format and build out presentation content according to the framework's specifications.

The primary goal of `parse-a-slide` is to simplify the workflow for generating presentations from text-based sources—whether manually authored or AI-generated—making it easy to integrate them into various content pipelines, static site generators, or for direct viewing.

## Installation

```bash
npm install -g parse-a-slide
# or
pnpm add -g parse-a-slide
# or
yarn global add parse-a-slide
```

## Usage

```bash
parse-a-slide build --input "presentations/**/*.md" --output-dir "./dist_presentations"
```
