# Implementation Structure Diagram (Main System, No Test Code)

This diagram shows the code structure and functional interactions for the CLI Application Core and all main runtime modules, including generators. Test code is excluded. Each module/folder is a node, with key files as sub-nodes. Arrows represent function calls or data flow. The design emphasizes functional programming and clear module boundaries.

```mermaid
flowchart TD
    Commands[CLI/Commands - definitions]
    Handlers[CLI/Handlers - orchestration]
    Discover[discoverPresentations]
    Parser[parsePresentation]
    Assets[handleAssets]
    Generator[generateOutputFiles]
    Watcher[startWatcher - side effect]
    MDGen[MD Generator]
    HTMLGen[HTML Generator]

    Commands -->|passes args to| Handlers
    Handlers -->|input patterns| Discover
    Handlers -->|presentation file info| Parser
    Parser -->|calls| Assets
    Handlers -->|slide nodes + asset info| Generator
    Handlers -->|options| Watcher
    Generator -->|mdx/md| MDGen
    Generator -->|html| HTMLGen

    subgraph CLI_Module[CLI Layer]
      Commands
      Handlers
    end
    subgraph Core_Module[Core Layer]
      Discover
      Parser
      Assets
      Generator
      Watcher
    end
    subgraph Generators_Module[Generators Layer]
      MDGen
      HTMLGen
    end
```

- **CLI Layer**: Split into commands (argument parsing, option definitions) and handlers (orchestration logic).
- **Core Layer**: Pure functions for discovery, parsing, asset handling, generation, and file watching.
- **Generators Layer**: Specialized output generators for MD/MDX and HTML.
