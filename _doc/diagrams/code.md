# Implementation Structure Diagram (Main System, No Test Code)

This diagram shows the code structure and functional interactions for the CLI Application Core and all main runtime modules, including generators. Test code is excluded. Each module/folder is a node, with key files as sub-nodes. Arrows represent function calls or data flow. The design emphasizes functional programming and clear module boundaries.

```mermaid
flowchart TD
    CLI[CLI/build command - orchestrator]
    Discover[discoverPresentations]
    Parser[parsePresentation]
    Assets[handleAssets]
    Generator[generateOutputFiles]
    Watcher[startWatcher - side effect]
    MDGen[MD Generator]
    HTMLGen[HTML Generator]

    CLI -->|input patterns| Discover
    CLI -->|presentation file info| Parser
    Parser -->|calls| Assets
    CLI -->|slide nodes + asset info| Generator
    CLI -->|options| Watcher
    Generator -->|mdx/md| MDGen
    Generator -->|html| HTMLGen

    subgraph CLI_Module[CLI Layer]
      CLI
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

- **CLI Layer**: Handles argument parsing, command registration, and orchestration.
- **Core Layer**: Pure functions for discovery, parsing, asset handling, generation, and file watching.
- **Generators Layer**: Specialized output generators for MD/MDX and HTML.
