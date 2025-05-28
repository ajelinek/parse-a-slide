import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * File system structure where:
 * - Keys are file/directory paths
 * - String values represent file content
 * - Object values represent nested directories
 * - null values represent empty directories
 */
export interface FileSystemStructure {
  [path: string]: string | FileSystemStructure | null;
}

/**
 * Test file system utility for creating and managing test files and directories
 */
export class FileTestUtil {
  private readonly basePath: string;
  private readonly moduleName: string;
  
  /**
   * Creates a new FileTestUtil instance
   * 
   * @param moduleName Unique name for the test module (used in temp directory path)
   */
  constructor(moduleName: string) {
    this.moduleName = moduleName.replace(/\W+/g, '-').toLowerCase();
    this.basePath = path.join(os.tmpdir(), `pas-test-${this.moduleName}`);
  }
  
  /**
   * Gets the base path for this test module
   */
  public getBasePath(): string {
    return this.basePath;
  }
  
  /**
   * Creates a test file system structure
   * 
   * @param structure The file system structure to create
   * @returns The base path where the structure was created
   */
  public async setup(structure?: FileSystemStructure): Promise<string> {
    // Clean up any existing test directory
    await this.cleanup();
    
    // Create the base directory
    await fs.promises.mkdir(this.basePath, { recursive: true });
    
    if (structure) {
      // Process the structure recursively
      await this.processStructure(structure, '');
    }
    
    return this.basePath;
  }
  
  /**
   * Cleans up the test file system
   */
  public async cleanup(): Promise<void> {
    try {
      await fs.promises.rm(this.basePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  }
  
  /**
   * Creates a file path relative to the base path
   * 
   * @param relativePath Path relative to the base path
   * @returns Absolute path
   */
  public getPath(relativePath: string): string {
    return path.join(this.basePath, relativePath);
  }
  

  
  /**
   * Checks if a file or directory exists
   * 
   * @param relativePath Path relative to the base path
   * @returns True if the path exists
   */
  public async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.promises.access(this.getPath(relativePath));
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Reads a file's content
   * 
   * @param relativePath Path relative to the base path
   * @returns File content as string
   */
  public async readFile(relativePath: string): Promise<string> {
    return fs.promises.readFile(this.getPath(relativePath), 'utf-8');
  }
  
  /**
   * Process a file system structure recursively
   * 
   * @param structure The file system structure to process
   * @param prefix Current path prefix for nested structures
   */
  private async processStructure(
    structure: FileSystemStructure,
    prefix: string
  ): Promise<void> {
    for (const [key, value] of Object.entries(structure)) {
      const relativePath = prefix ? `${prefix}/${key}` : key;
      const fullPath = this.getPath(relativePath);
      
      if (typeof value === 'string') {
        // This is a file
        // Ensure parent directory exists
        const dirPath = path.dirname(fullPath);
        await fs.promises.mkdir(dirPath, { recursive: true });
        // Write file content
        await fs.promises.writeFile(fullPath, value, 'utf-8');
      } else if (value === null) {
        // This is an empty directory
        await fs.promises.mkdir(fullPath, { recursive: true });
      } else if (typeof value === 'object') {
        // This is a directory with contents
        await fs.promises.mkdir(fullPath, { recursive: true });
        await this.processStructure(value, relativePath);
      }
    }
  }
}
