import { it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FileTestUtil } from './file-test-util';

// Create a test utility instance for this test module
const fileTestUtil = new FileTestUtil('json-example');

// Clean up before and after tests
beforeEach(async () => {
  await fileTestUtil.cleanup();
});

afterEach(async () => {
  await fileTestUtil.cleanup();
});

it('should create files and directories using the JSON structure', async () => {
  // Setup test file structure using the simple JSON notation
  const testDir = await fileTestUtil.setup({
    'file.txt': 'content',
    'empty-dir': null,
    'nested': {
      'nested-file.txt': 'nested content',
      'deep': {
        'deep-file.txt': 'deep content'
      }
    }
  });
  
  // Verify files and directories were created
  expect(await fileTestUtil.exists('file.txt')).toBe(true);
  expect(await fileTestUtil.exists('empty-dir')).toBe(true);
  expect(await fileTestUtil.exists('nested')).toBe(true);
  expect(await fileTestUtil.exists('nested/nested-file.txt')).toBe(true);
  expect(await fileTestUtil.exists('nested/deep')).toBe(true);
  expect(await fileTestUtil.exists('nested/deep/deep-file.txt')).toBe(true);
  
  // Verify file content
  expect(await fileTestUtil.readFile('file.txt')).toBe('content');
  expect(await fileTestUtil.readFile('nested/nested-file.txt')).toBe('nested content');
  expect(await fileTestUtil.readFile('nested/deep/deep-file.txt')).toBe('deep content');
});

it('should create files and directories using the setup method with JSON structure', async () => {
  // Setup test file structure using the setup method with JSON structure
  const testDir = await fileTestUtil.setup({
    'root-file.txt': 'root content',
    'dir': {
      'file.txt': 'dir content'
    }
  });
  
  // Verify files and directories were created
  expect(await fileTestUtil.exists('root-file.txt')).toBe(true);
  expect(await fileTestUtil.exists('dir')).toBe(true);
  expect(await fileTestUtil.exists('dir/file.txt')).toBe(true);
  
  // Verify file content
  expect(await fileTestUtil.readFile('root-file.txt')).toBe('root content');
  expect(await fileTestUtil.readFile('dir/file.txt')).toBe('dir content');
});

it('should handle complex nested structures', async () => {
  // Create a more complex structure
  const testDir = await fileTestUtil.setup({
    'config.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
    'src': {
      'index.js': 'console.log("Hello world");',
      'components': {
        'Button.js': 'export const Button = () => <button>Click me</button>;',
        'Input.js': 'export const Input = () => <input />;'
      },
      'utils': {
        'helpers.js': 'export const sum = (a, b) => a + b;',
        'constants.js': 'export const API_URL = "https://api.example.com";'
      }
    },
    'public': {
      'index.html': '<!DOCTYPE html><html><body>Hello</body></html>',
      'assets': {
        'style.css': 'body { margin: 0; }',
        'images': null
      }
    }
  });
  
  // Verify the structure was created correctly
  expect(await fileTestUtil.exists('config.json')).toBe(true);
  expect(await fileTestUtil.exists('src/index.js')).toBe(true);
  expect(await fileTestUtil.exists('src/components/Button.js')).toBe(true);
  expect(await fileTestUtil.exists('src/components/Input.js')).toBe(true);
  expect(await fileTestUtil.exists('src/utils/helpers.js')).toBe(true);
  expect(await fileTestUtil.exists('src/utils/constants.js')).toBe(true);
  expect(await fileTestUtil.exists('public/index.html')).toBe(true);
  expect(await fileTestUtil.exists('public/assets/style.css')).toBe(true);
  expect(await fileTestUtil.exists('public/assets/images')).toBe(true);
  
  // Verify some file content
  expect(JSON.parse(await fileTestUtil.readFile('config.json'))).toEqual({ name: 'test', version: '1.0.0' });
  expect(await fileTestUtil.readFile('src/index.js')).toBe('console.log("Hello world");');
  expect(await fileTestUtil.readFile('src/components/Button.js')).toBe('export const Button = () => <button>Click me</button>;');
});
