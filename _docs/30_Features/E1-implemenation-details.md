# E1: Core Infrastructure Implementation Details

## Overview

This document outlines the implementation details for the foundational elements required for the parse-a-slide CLI application. These core infrastructure components include logging, CLI setup, file system utilities, and testing support. These elements are essential for the application's operation and will be used throughout the codebase.

## Implementation Details

### F1: Logger Implementation

The logger will be implemented as a centralized utility that provides consistent logging capabilities throughout the application. It will support different log levels and be configurable via CLI flags.

#### S1: Support for info, error, and debug log levels

1. Create a `Logger` class in `src/utils/logger.ts` with the following features:

   - Log level enum: `LogLevel.ERROR`, `LogLevel.INFO`, `LogLevel.DEBUG`
   - Methods: `error()`, `info()`, `debug()`, `log()`
   - Configuration options to set the active log level
   - Colorized output for different log levels using ANSI color codes
   - Timestamp inclusion in log messages
   - Support for object logging with proper formatting

2. The logger will use the singleton pattern to ensure a consistent logging interface throughout the application.

3. Implementation will use `neverthrow` for error handling, returning `Result` objects rather than throwing exceptions.

#### S2: CLI flags for log verbosity control

1. Add CLI flags to control log verbosity:

   - `--verbose` / `-v`: Enable debug-level logging
   - `--quiet`: Suppress info-level logging (only show errors)

2. Update the existing CLI structure in `src/cli/commands/build-command.ts` to properly handle these flags.

3. Configure the logger instance in the build handler based on these flags.

### F2: Basic CLI Structure

The CLI structure is partially implemented but needs to be enhanced to fully support the required functionality.

#### S1: Implement a `build` command in the CLI

1. The basic structure for the `build` command already exists in `src/cli/commands/build-command.ts`.

2. Enhance the command to properly integrate with the logger and other utilities.

3. Update the command handler to use the new logger for output instead of console.log.

#### S2: Parse basic options and pass to `BuildHandler`

1. The basic option parsing is already implemented in `src/cli/commands/build-command.ts`.

2. Update the `buildHandler` function in `src/cli/handlers/build-handler.ts` to:
   - Initialize and configure the logger based on verbosity options
   - Properly handle the input, output, and format options
   - Implement the basic workflow as outlined in the system design document

### F3: FSUtils Implementation

The file system utilities will provide a consistent interface for file operations throughout the application, with proper error handling using `neverthrow`.

1. Create `src/utils/fs-utils.ts` with the following functions:

   - `readFile(path: string): ResultAsync<string, AppError>`
   - `writeFile(path: string, content: string): ResultAsync<void, AppError>`
   - `ensureDir(path: string): ResultAsync<void, AppError>`
   - `findFiles(globPattern: string, cwd: string): ResultAsync<string[], AppError>`
   - `copyFile(source: string, destination: string): ResultAsync<void, AppError>`
   - `pathExists(path: string): ResultAsync<boolean, AppError>`
   - `cleanDir(path: string): ResultAsync<void, AppError>`

2. Implement proper error handling with custom `AppError` types for different file system operations.

3. Create an error utility in `src/utils/error-utils.ts` to define custom error types and helper functions.

### F4: Testing Utility Setup

The testing utility will provide a way to set up realistic file structures for testing file-based operations.

1. Create `src/utils/test-utils.ts` with the following functionality:

   - `createTestFileStructure(config: TestFileStructureConfig): ResultAsync<TestFileStructure, AppError>`
   - `cleanupTestFileStructure(structure: TestFileStructure): ResultAsync<void, AppError>`

2. Define the `TestFileStructureConfig` and `TestFileStructure` types in `src/types/test.ts`.

3. Implement helper functions for creating temporary directories, files with specific content, and cleaning up after tests.

## System / User Flow

1. **CLI Initialization**:

   - User invokes the CLI with command and options
   - `yargs` parses arguments and routes to the appropriate command handler
   - Logger is initialized with the appropriate verbosity level

2. **Command Execution**:

   - Command handler uses FSUtils to perform file operations
   - Logger provides feedback to the user about the operation progress
   - Error handling with `neverthrow` ensures proper error reporting

3. **Testing Flow**:
   - Test setup creates a temporary file structure using the test utilities
   - Test executes the functionality being tested
   - Test assertions verify the expected behavior
   - Test cleanup removes the temporary file structure

## Change Summary

### New Files:

1. **src/utils/logger.ts**

   - Purpose: Centralized logging utility with support for different log levels and configuration options
   - Exports: `Logger` class, `LogLevel` enum, `createLogger` function

2. **src/utils/fs-utils.ts**

   - Purpose: File system utilities with `neverthrow` error handling
   - Exports: Various file system functions like `readFile`, `writeFile`, `findFiles`, etc.

3. **src/utils/error-utils.ts**

   - Purpose: Error handling utilities and custom error types
   - Exports: `AppError` class, error factory functions, error codes

4. **src/utils/test-utils.ts**

   - Purpose: Testing utilities for setting up file structures for tests
   - Exports: Functions for creating and cleaning up test file structures

5. **src/types/error.ts**

   - Purpose: Type definitions for error handling
   - Exports: `AppError` interface, `ErrorCode` enum

6. **src/types/test.ts**
   - Purpose: Type definitions for testing utilities
   - Exports: `TestFileStructureConfig` and `TestFileStructure` interfaces

### Updated Files:

1. **src/cli/commands/build-command.ts**

   - Updates: Enhanced to properly handle logger configuration options

2. **src/cli/handlers/build-handler.ts**

   - Updates: Implement proper logger initialization and integration with FSUtils

3. **src/types/cli.ts**
   - Updates: Add any missing type definitions for CLI options

### New Functions:

1. **Logger Class**:

   - `error(message: string | Error, ...args: any[]): void`
   - `info(message: string, ...args: any[]): void`
   - `debug(message: string, ...args: any[]): void`
   - `log(level: LogLevel, message: string, ...args: any[]): void`
   - `setLevel(level: LogLevel): void`
   - `getLevel(): LogLevel`

2. **FSUtils Module**:

   - `readFile(path: string): ResultAsync<string, AppError>`
   - `writeFile(path: string, content: string): ResultAsync<void, AppError>`
   - `ensureDir(path: string): ResultAsync<void, AppError>`
   - `findFiles(globPattern: string, cwd: string): ResultAsync<string[], AppError>`
   - `copyFile(source: string, destination: string): ResultAsync<void, AppError>`
   - `pathExists(path: string): ResultAsync<boolean, AppError>`
   - `cleanDir(path: string): ResultAsync<void, AppError>`

3. **Test Utils Module**:
   - `createTestFileStructure(config: TestFileStructureConfig): ResultAsync<TestFileStructure, AppError>`
   - `cleanupTestFileStructure(structure: TestFileStructure): ResultAsync<void, AppError>`

### New Types:

1. **Logger Types**:

   - `LogLevel` enum: `ERROR`, `INFO`, `DEBUG`
   - `LoggerOptions` interface

2. **Error Types**:

   - `AppError` interface
   - `ErrorCode` enum
   - `FSError`, `ParseError`, `ConfigError` interfaces extending `AppError`

3. **Test Types**:
   - `TestFileStructureConfig` interface
   - `TestFileStructure` interface
   - `TestFile` interface

## Test Scenarios

The following test scenarios are organized by module and divided into happy path and error path cases. These scenarios will guide the implementation and testing of the E1 Core Infrastructure features.

### Logger Module Test Scenarios

#### Happy Path

```gherkin
Feature: Logger Functionality

  - [x] Scenario: Logger outputs error messages
    Given a logger instance with default log level
    When the error method is called with a message
    Then the message should be output with error formatting
    And the message should include a timestamp

  - [x] Scenario: Logger outputs info messages when level is INFO or DEBUG
    Given a logger instance with INFO log level
    When the info method is called with a message
    Then the message should be output with info formatting
    And the message should include a timestamp

  - [x] Scenario: Logger outputs debug messages only when level is DEBUG
    Given a logger instance with DEBUG log level
    When the debug method is called with a message
    Then the message should be output with debug formatting
    And the message should include a timestamp

  - [x] Scenario: Logger suppresses info messages when level is ERROR
    Given a logger instance with ERROR log level
    When the info method is called with a message
    Then no message should be output

  - [x] Scenario: Logger suppresses debug messages when level is INFO
    Given a logger instance with INFO log level
    When the debug method is called with a message
    Then no message should be output

  - [x] Scenario: Logger level can be changed dynamically
    Given a logger instance with ERROR log level
    When the log level is changed to DEBUG
    And the debug method is called with a message
    Then the message should be output with debug formatting

  - [x] Scenario: Logger formats object arguments
    Given a logger instance with default log level
    When the info method is called with a message and an object
    Then the message should be output with the object formatted as JSON
```

#### Error Path

```gherkin
Feature: Logger Error Handling

  - [x] Scenario: Logger handles Error objects
    Given a logger instance with default log level
    When the error method is called with an Error object
    Then the error message and stack trace should be output
    And the output should have error formatting

  - [x] Scenario: Logger handles invalid log levels
    Given an attempt to create a logger with an invalid log level
    Then a Result.err should be returned with an appropriate error message
```

### FSUtils Module Test Scenarios

#### Happy Path

```gherkin
Feature: File System Utilities

  - [x] Scenario: Reading a file that exists
    Given a file with known content exists at a specific path
    When the readFile function is called with that path
    Then a Result.ok should be returned with the file content

  - [x] Scenario: Writing content to a file
    Given a valid path for a new file
    When the writeFile function is called with that path and content
    Then a Result.ok should be returned
    And the file should exist with the specified content

  - [x] Scenario: Ensuring a directory exists
    Given a path for a directory that does not exist
    When the ensureDir function is called with that path
    Then a Result.ok should be returned
    And the directory should exist

  - [x] Scenario: Finding files with a glob pattern
    Given a directory with multiple files of different types
    When the findFiles function is called with a glob pattern
    Then a Result.ok should be returned with an array of matching file paths

  - [x] Scenario: Copying a file
    Given a source file exists
    And a valid destination path
    When the copyFile function is called with source and destination
    Then a Result.ok should be returned
    And the destination file should exist with the same content as the source

  - [x] Scenario: Checking if a path exists
    Given a file exists at a specific path
    When the pathExists function is called with that path
    Then a Result.ok should be returned with true

  - [x] Scenario: Cleaning a directory
    Given a directory with multiple files and subdirectories
    When the cleanDir function is called with that directory path
    Then a Result.ok should be returned
    And the directory should be empty
```

#### Error Path

```gherkin
Feature: File System Utilities Error Handling

  - [x] Scenario: Reading a file that does not exist
    Given a path to a file that does not exist
    When the readFile function is called with that path
    Then a Result.err should be returned with a FileNotFoundError

  - [x] Scenario: Writing to a path with insufficient permissions
    Given a path with insufficient write permissions
    When the writeFile function is called with that path and content
    Then a Result.err should be returned with a PermissionError

  - [x] Scenario: Creating a directory with insufficient permissions
    Given a path with insufficient permissions for directory creation
    When the ensureDir function is called with that path
    Then a Result.err should be returned with a PermissionError

  - [x] Scenario: Finding files with an invalid glob pattern
    Given an invalid glob pattern
    When the findFiles function is called with that pattern
    Then a Result.err should be returned with an InvalidGlobError

  - [x] Scenario: Copying a file that does not exist
    Given a source path to a file that does not exist
    When the copyFile function is called with that source and a destination
    Then a Result.err should be returned with a FileNotFoundError

  - [x] Scenario: Copying to a destination with insufficient permissions
    Given a source file exists
    And a destination path with insufficient permissions
    When the copyFile function is called with source and destination
    Then a Result.err should be returned with a PermissionError

  - [x] Scenario: Cleaning a directory that does not exist
    Given a path to a directory that does not exist
    When the cleanDir function is called with that path
    Then a Result.err should be returned with a DirectoryNotFoundError
```

### CLI Module Test Scenarios

#### Happy Path

```gherkin
Feature: CLI Functionality

  - [x] Scenario: CLI parses build command options correctly
    Given the CLI is invoked with the build command
    And valid input, output, and format options
    When the command is processed
    Then the buildHandler should be called with the correct options

  - [x] Scenario: CLI sets verbose mode correctly
    Given the CLI is invoked with the build command
    And the --verbose flag
    When the command is processed
    Then the buildHandler should be called with verbose set to true

  - [x] Scenario: CLI sets quiet mode correctly
    Given the CLI is invoked with the build command
    And the --quiet flag
    When the command is processed
    Then the buildHandler should be called with quiet set to true

  - [x] Scenario: CLI displays help information
    Given the CLI is invoked with the --help flag
    When the command is processed
    Then help information should be displayed

  - [x] Scenario: CLI displays version information
    Given the CLI is invoked with the --version flag
    When the command is processed
    Then version information should be displayed
```

#### Error Path

```gherkin
Feature: CLI Error Handling

  - [x] Scenario: CLI requires a command
    Given the CLI is invoked without a command
    When the command is processed
    Then an error should be displayed indicating a command is required

  - [x] Scenario: CLI rejects unknown commands
    Given the CLI is invoked with an unknown command
    When the command is processed
    Then an error should be displayed indicating the command is unknown

  - [x] Scenario: CLI requires input option for build command
    Given the CLI is invoked with the build command
    And no input option
    When the command is processed
    Then an error should be displayed indicating input is required

  - [x] Scenario: CLI rejects invalid format options
    Given the CLI is invoked with the build command
    And an invalid format option
    When the command is processed
    Then an error should be displayed indicating the format is invalid
```

### Test Utilities Module Test Scenarios

#### Happy Path

```gherkin
Feature: Test Utilities

  - [x] Scenario: Creating a test file structure
    Given a valid test file structure configuration
    When the createTestFileStructure function is called
    Then a Result.ok should be returned with the created structure
    And the specified files and directories should exist

  - [x] Scenario: Cleaning up a test file structure
    Given an existing test file structure
    When the cleanupTestFileStructure function is called
    Then a Result.ok should be returned
    And all temporary files and directories should be removed
```

#### Error Path

```gherkin
Feature: Test Utilities Error Handling

  - [x] Scenario: Creating a test file structure with invalid configuration
    Given an invalid test file structure configuration
    When the createTestFileStructure function is called
    Then a Result.err should be returned with an InvalidConfigError

  - [x] Scenario: Cleaning up a non-existent test file structure
    Given a reference to a non-existent test file structure
    When the cleanupTestFileStructure function is called
    Then a Result.err should be returned with a StructureNotFoundError
```
