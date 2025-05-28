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
 * Base directory for all test files
 */
const TEST_BASE_DIR = path.join(os.tmpdir(), 'pas-test');

/**
 * Get the test directory path for a module
 * 
 * @param moduleName The name of the test module
 * @returns The absolute path to the test directory
 */
export function getTestDir(moduleName: string): string {
  const sanitizedName = moduleName.replace(/\W+/g, '-').toLowerCase();
  return path.join(TEST_BASE_DIR, sanitizedName);
}

/**
 * Setup a test file system structure
 * 
 * @param moduleName The name of the test module
 * @param structure The file system structure to create
 * @returns The absolute path to the test directory
 */
export async function setup(
  moduleName: string,
  structure?: FileSystemStructure
): Promise<string> {
  const testDir = getTestDir(moduleName);
  
  // Clean up any existing test directory
  await cleanup(moduleName);
  
  // Create the test directory
  await fs.promises.mkdir(testDir, { recursive: true });
  
  if (structure) {
    // Process the structure recursively
    await processStructure(testDir, structure, '');
  }
  
  return testDir;
}

/**
 * Clean up a test directory
 * 
 * @param moduleName The name of the test module
 */
export async function cleanup(moduleName: string): Promise<void> {
  const testDir = getTestDir(moduleName);
  
  try {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors if directory doesn't exist
  }
}

/**
 * Check if a file or directory exists in the test directory
 * 
 * @param moduleName The name of the test module
 * @param relativePath Path relative to the test directory
 * @returns True if the path exists
 */
export async function exists(
  moduleName: string,
  relativePath: string
): Promise<boolean> {
  const fullPath = getPath(moduleName, relativePath);
  
  try {
    await fs.promises.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a file from the test directory
 * 
 * @param moduleName The name of the test module
 * @param relativePath Path relative to the test directory
 * @returns The file content as a string
 */
export async function readFile(
  moduleName: string,
  relativePath: string
): Promise<string> {
  const fullPath = getPath(moduleName, relativePath);
  return fs.promises.readFile(fullPath, 'utf-8');
}

/**
 * Get the absolute path for a file in the test directory
 * 
 * @param moduleName The name of the test module
 * @param relativePath Path relative to the test directory
 * @returns The absolute path
 */
export function getPath(
  moduleName: string,
  relativePath: string
): string {
  const testDir = getTestDir(moduleName);
  return path.join(testDir, relativePath);
}

/**
 * Process a file system structure recursively
 * 
 * @param testDir The test directory
 * @param structure The file system structure to process
 * @param prefix Current path prefix for nested structures
 */
async function processStructure(
  testDir: string,
  structure: FileSystemStructure,
  prefix: string
): Promise<void> {
  for (const [key, value] of Object.entries(structure)) {
    const relativePath = prefix ? `${prefix}/${key}` : key;
    const fullPath = path.join(testDir, relativePath);
    
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
      await processStructure(testDir, value, relativePath);
    }
  }
}
