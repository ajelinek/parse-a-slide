import { promises as fs } from 'fs';
import path from 'path';
import { Result } from 'neverthrow';
import { AppError, ErrorCode, createError, PasResult, ok, err, pasOk, pasErr } from './error';
import { globSync } from 'glob';

/**
 * Reads a file and returns its content as a string.
 * 
 * @param filePath Path to the file to read
 * @returns A PasResult containing the file content or an error
 */
export async function readFile(filePath: string): PasResult<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return ok(content);
  } catch (error) {
    return err(handleFsError(error, 'reading file', filePath));
  }
}

/**
 * Writes content to a file, creating the file if it doesn't exist.
 * 
 * @param filePath Path to the file to write
 * @param content Content to write to the file
 * @returns A PasResult containing the path of the written file or an error
 */
export async function writeFile(filePath: string, content: string): PasResult<string> {
  try {
    const dirResult = await ensureDir(path.dirname(filePath));
    if (dirResult.isErr()) {
      return err(dirResult.error);
    }
    
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return ok(filePath);
    } catch (error) {
      return err(handleFsError(error, 'writing to file', filePath));
    }
  } catch (error) {
    const errorObj = error as { message?: string };
    return err(createError(`Unexpected error writing file: ${filePath} - ${errorObj.message || 'Unknown error'}`, ErrorCode.IO_ERROR));
  }
}

/**
 * Ensures a directory exists, creating it and any parent directories if necessary.
 * 
 * @param dirPath Path to the directory to ensure exists
 * @returns A PasResult containing the path of the created/existing directory or an error
 */
export async function ensureDir(dirPath: string): PasResult<string> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return ok(dirPath);
  } catch (error) {
    return err(handleFsError(error, 'creating directory', dirPath));
  }
}

/**
 * Finds files matching a glob pattern.
 * 
 * @param globPattern Glob pattern to match files
 * @param cwd Current working directory for the glob pattern
 * @returns A PasResult containing an array of matching file paths or an error
 */
export async function findFiles(globPattern: string, cwd: string): PasResult<string[]> {
  try {
    const options = { cwd, absolute: true };
    
    try {
      const files = globSync(globPattern, options);
      return ok(files);
    } catch (error) {
      const errorObj = error as { message?: string };
      return err(createError(`Error finding files with pattern ${globPattern}: ${errorObj.message || 'Unknown error'}`, ErrorCode.IO_ERROR));
    }
  } catch (error: any) {
    return err(createError(`Error finding files with pattern ${globPattern}: ${error.message || 'Unknown error'}`, ErrorCode.IO_ERROR));
  }
}

/**
 * Copies a file from source to destination.
 * 
 * @param source Path to the source file
 * @param destination Path to the destination file
 * @returns A PasResult containing the destination path or an error
 */
export async function copyFile(source: string, destination: string): PasResult<string> {
  try {
    const existsResult = await pathExists(source);
    if (existsResult.isErr()) {
      return err(existsResult.error);
    }
    
    if (!existsResult.value) {
      return err(createError(`Source file not found: ${source}`, ErrorCode.FILE_NOT_FOUND));
    }
    
    const dirResult = await ensureDir(path.dirname(destination));
    if (dirResult.isErr()) {
      return err(dirResult.error);
    }
    
    try {
      await fs.copyFile(source, destination);
      return ok(destination);
    } catch (error) {
      return err(handleFsError(error, `copying file from ${source} to`, destination));
    }
  } catch (error) {
    const errorObj = error as { message?: string };
    return err(createError(`Unexpected error copying file: ${source} to ${destination} - ${errorObj.message || 'Unknown error'}`, ErrorCode.IO_ERROR));
  }
}

/**
 * Checks if a path exists.
 * 
 * @param pathToCheck Path to check for existence
 * @returns A PasResult containing a boolean indicating if the path exists or an error
 */
export async function pathExists(pathToCheck: string): PasResult<boolean> {
  try {
    try {
      await fs.access(pathToCheck);
      return ok(true);
    } catch {
      return ok(false);
    }
  } catch (error) {
    const errorObj = error as { message?: string };
    return err(createError(`Error checking if path exists: ${pathToCheck} - ${errorObj.message || 'Unknown error'}`, ErrorCode.IO_ERROR));
  }
}

/**
 * Cleans a directory by removing all files and subdirectories within it.
 * 
 * @param dirPath Path to the directory to clean
 * @returns A PasResult containing the list of deleted entries or an error
 */
export async function cleanDir(dirPath: string): PasResult<string[]> {
  try {
    try {
      await fs.access(dirPath);
    } catch (error) {
      return err(handleDirError(error, dirPath));
    }
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const entryPaths = entries.map(entry => path.join(dirPath, entry.name));
      
      const deletePromises = entryPaths.map(entryPath => {
        return fs.rm(entryPath, { recursive: true, force: true });
      });
      
      await Promise.all(deletePromises);
      return ok(entryPaths);
    } catch (error) {
      const errorObj = error as { code?: string; message?: string };
      if (errorObj.code === 'EACCES') {
        return err(createError(`Permission denied: ${dirPath}`, ErrorCode.PERMISSION_ERROR));
      }
      return err(createError(`Error cleaning directory: ${dirPath} - ${errorObj.message || 'Unknown error'}`, ErrorCode.IO_ERROR));
    }
  } catch (error) {
    const errorObj = error as { message?: string };
    return err(createError(`Unexpected error cleaning directory: ${dirPath} - ${errorObj.message || 'Unknown error'}`, ErrorCode.IO_ERROR));
  }
}

// Helper functions

/**
 * Helper function to handle file system errors
 * 
 * @param error The error object
 * @param operation The operation being performed (for error message)
 * @param path The file or directory path
 * @returns An AppError with the appropriate error code
 */
function handleFsError(error: unknown, operation: string, path: string): AppError {
  const err = error as { code?: string; message?: string };
  if (err.code === 'ENOENT') {
    return createError(`File not found: ${path}`, ErrorCode.FILE_NOT_FOUND);
  } else if (err.code === 'EACCES') {
    return createError(`Permission denied: ${path}`, ErrorCode.PERMISSION_ERROR);
  }
  return createError(`Error ${operation}: ${path} - ${err.message || 'Unknown error'}`, ErrorCode.IO_ERROR);
}

/**
 * Helper function to handle directory not found errors
 * 
 * @param error The error object
 * @param path The directory path
 * @returns An AppError with the appropriate error code
 */
function handleDirError(error: unknown, path: string): AppError {
  const err = error as { code?: string; message?: string };
  if (err.code === 'ENOENT') {
    return createError(`Directory not found: ${path}`, ErrorCode.DIRECTORY_NOT_FOUND);
  } else if (err.code === 'EACCES') {
    return createError(`Permission denied: ${path}`, ErrorCode.PERMISSION_ERROR);
  }
  return createError(`Error with directory: ${path} - ${err.message || 'Unknown error'}`, ErrorCode.IO_ERROR);
}
