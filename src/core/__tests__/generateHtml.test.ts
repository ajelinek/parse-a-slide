import { getByLabelText, getByRole, queryByLabelText, queryByRole } from '@testing-library/dom'
import '@testing-library/jest-dom'
import * as fs from 'fs'
import { JSDOM } from 'jsdom'
import * as path from 'path'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { FrontMatter } from '../../types/frontmatter'
import { GeneratorOptions } from '../../types/generator'
import { SlideNavigation, SlideNode } from '../../types/slide'
import { toHtml } from '../generator/generateHtml'

// Global DOM setup for testing
let dom: JSDOM
let document: Document

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  document = dom.window.document
  global.document = document
  global.window = dom.window as any
})

afterEach(() => {
  // Clean up test output directories
  const testOutputDirs = [
    '/tmp/test-html-output',
    '/tmp/test-html-assets',
    '/tmp/test-html-nested',
    '/tmp/test-html-error',
    '/tmp/test-source',
  ]

  testOutputDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

function setUp() {
  return { toHtml }
}

function createTestSlideNode(options: {
  id?: string
  title?: string
  description?: string
  content?: string
  navigation?: Partial<SlideNavigation>
  frontMatter?: Partial<FrontMatter>
  fragmentPath?: string
  url?: string
}): SlideNode {
  const {
    id = 'test-slide-1',
    title = 'Test Slide',
    description,
    content = '# Test Content\nThis is test content.',
    navigation = {},
    frontMatter = {},
    fragmentPath = 'test.pres.md',
    url = '/test-slide-1',
  } = options

  const defaultNavigation: SlideNavigation = {
    parentSlideId: null,
    childSlideId: null,
    previousSlideId: null,
    nextSlideId: null,
    ...navigation,
  }

  const defaultFrontMatter: FrontMatter = {
    title,
    description,
    ...frontMatter,
  }

  return {
    id,
    url,
    navigation: defaultNavigation,
    content,
    fragmentPath,
    frontMatter: defaultFrontMatter,
  }
}

function createTestGeneratorOptions(outputDir: string, sourceDir: string = '/tmp/test-source'): GeneratorOptions {
  return {
    sourceDir,
    outputDir,
  }
}

function loadHtmlFile(filePath: string): Document {
  const htmlContent = fs.readFileSync(filePath, 'utf-8')
  const dom = new JSDOM(htmlContent)
  return dom.window.document
}

// Helper functions for querying generated HTML pages
function getSlideContent(document: Document) {
  return getByRole(document.body, 'main', { name: /slide content/i })
}

function getNavigationWidget(document: Document) {
  return getByRole(document.body, 'navigation', { name: /slide navigation/i })
}

function getPreviousSlideLink(document: Document) {
  return queryByLabelText(document.body, /previous slide/i)
}

function getNextSlideLink(document: Document) {
  return queryByLabelText(document.body, /next slide/i)
}

function getMenuButton(document: Document) {
  return getByLabelText(document.body, /open slide menu/i)
}

function getContextMenu(document: Document) {
  // Use querySelector for hidden elements since Testing Library ignores aria-hidden="true" elements
  return document.querySelector('#context-menu')
}

function getContextMenuByRole(document: Document) {
  // This version can be used when the context menu is visible (aria-hidden="false")
  return queryByRole(document.body, 'dialog', { name: /slide navigation menu/i, hidden: true })
}

function getSlideDataScript(document: Document) {
  return document.querySelector('#slide-data')
}

function getStylesheetLinks(document: Document) {
  return document.querySelectorAll('link[rel="stylesheet"]')
}

function getScriptTags(document: Document) {
  return document.querySelectorAll('script[src]')
}

test('toHtml should generate a basic HTML presentation with index and slide files', async () => {
  const { toHtml } = setUp()
  const outputDir = '/tmp/test-html-output'
  const sourceDir = '/tmp/test-source'

  // Create temporary source directory
  fs.mkdirSync(sourceDir, { recursive: true })

  const slides = [
    createTestSlideNode({
      id: 'slide-0',
      title: 'Welcome Slide',
      content: '# Welcome\nThis is the first slide.',
      url: '/welcome',
    }),
    createTestSlideNode({
      id: 'slide-1',
      title: 'Second Slide',
      content: '# Second\nThis is the second slide.',
      url: '/second',
      navigation: {
        previousSlideId: 'slide-0',
      },
    }),
  ]

  const options = createTestGeneratorOptions(outputDir, sourceDir)

  await toHtml(slides, options)

  // Verify files are created
  expect(fs.existsSync(path.join(outputDir, 'index.html'))).toBe(true)
  expect(fs.existsSync(path.join(outputDir, 'slide-1.html'))).toBe(true)

  // Verify assets directory is created
  expect(fs.existsSync(path.join(outputDir, '_assets'))).toBe(true)
  expect(fs.existsSync(path.join(outputDir, '_assets', 'style.css'))).toBe(true)
  expect(fs.existsSync(path.join(outputDir, '_assets', 'main.js'))).toBe(true)
})

test('toHtml should generate HTML with correct navigation links', async () => {
  const { toHtml } = setUp()
  const outputDir = '/tmp/test-html-output'
  const sourceDir = '/tmp/test-source'

  // Create temporary source directory
  fs.mkdirSync(sourceDir, { recursive: true })

  const slides = [
    createTestSlideNode({
      id: 'slide-0',
      title: 'First Slide',
      content: '# First\nThis is the first slide.',
      url: '/first',
      navigation: {
        nextSlideId: 'slide-1',
      },
    }),
    createTestSlideNode({
      id: 'slide-1',
      title: 'Second Slide',
      content: '# Second\nThis is the second slide.',
      url: '/second',
      navigation: {
        previousSlideId: 'slide-0',
        nextSlideId: 'slide-2',
      },
    }),
    createTestSlideNode({
      id: 'slide-2',
      title: 'Third Slide',
      content: '# Third\nThis is the third slide.',
      url: '/third',
      navigation: {
        previousSlideId: 'slide-1',
      },
    }),
  ]

  const options = createTestGeneratorOptions(outputDir, sourceDir)

  await toHtml(slides, options)

  // Test index.html (first slide) - should have Next but no Previous
  const indexDoc = loadHtmlFile(path.join(outputDir, 'index.html'))
  expect(indexDoc.title).toBe('First Slide')

  const indexNavWidget = getNavigationWidget(indexDoc)
  expect(indexNavWidget).toBeInTheDocument()

  const indexNextLink = getNextSlideLink(indexDoc)
  const indexPrevLink = getPreviousSlideLink(indexDoc)
  expect(indexNextLink).toBeInTheDocument()
  expect(indexNextLink).toHaveAttribute('href', 'slide-1.html')
  expect(indexPrevLink).not.toBeInTheDocument()

  // Test middle slide - should have both Next and Previous
  const slide1Doc = loadHtmlFile(path.join(outputDir, 'slide-1.html'))
  expect(slide1Doc.title).toBe('Second Slide')

  const slide1NavWidget = getNavigationWidget(slide1Doc)
  expect(slide1NavWidget).toBeInTheDocument()

  const slide1NextLink = getNextSlideLink(slide1Doc)
  const slide1PrevLink = getPreviousSlideLink(slide1Doc)
  expect(slide1NextLink).toBeInTheDocument()
  expect(slide1NextLink).toHaveAttribute('href', 'slide-2.html')
  expect(slide1PrevLink).toBeInTheDocument()
  expect(slide1PrevLink).toHaveAttribute('href', 'index.html')

  // Test last slide - should have Previous but no Next
  const slide2Doc = loadHtmlFile(path.join(outputDir, 'slide-2.html'))
  expect(slide2Doc.title).toBe('Third Slide')

  const slide2NavWidget = getNavigationWidget(slide2Doc)
  expect(slide2NavWidget).toBeInTheDocument()

  const slide2NextLink = getNextSlideLink(slide2Doc)
  const slide2PrevLink = getPreviousSlideLink(slide2Doc)
  expect(slide2NextLink).not.toBeInTheDocument()
  expect(slide2PrevLink).toBeInTheDocument()
  expect(slide2PrevLink).toHaveAttribute('href', 'slide-1.html')
})

test('toHtml should copy assets and create correct relative paths', async () => {
  const { toHtml } = setUp()
  const outputDir = '/tmp/test-html-assets'

  // Create a test source directory with an asset
  const sourceDir = '/tmp/test-source'
  fs.mkdirSync(sourceDir, { recursive: true })
  fs.writeFileSync(path.join(sourceDir, 'test-image.png'), 'fake image content')

  const slides = [
    createTestSlideNode({
      id: 'slide-0',
      title: 'Slide with Asset',
      content: '# Slide with Image\n![Test Image](test-image.png)',
      url: '/slide-with-asset',
    }),
  ]

  const options: GeneratorOptions = {
    sourceDir,
    outputDir,
  }

  await toHtml(slides, options)

  // Verify generator assets are copied
  expect(fs.existsSync(path.join(outputDir, '_assets'))).toBe(true)
  expect(fs.existsSync(path.join(outputDir, '_assets', 'style.css'))).toBe(true)
  expect(fs.existsSync(path.join(outputDir, '_assets', 'main.js'))).toBe(true)
  expect(fs.existsSync(path.join(outputDir, '_assets', 'tokens.css'))).toBe(true)

  // Verify user assets are copied
  expect(fs.existsSync(path.join(outputDir, '_assets', 'test-image.png'))).toBe(true)

  // Verify HTML contains correct asset references
  const indexDoc = loadHtmlFile(path.join(outputDir, 'index.html'))
  const stylesheetLinks = getStylesheetLinks(indexDoc)
  expect(stylesheetLinks.length).toBeGreaterThan(0)
  expect(stylesheetLinks[0]?.getAttribute('href')).toBe('_assets/style.css')

  const scriptTags = getScriptTags(indexDoc)
  expect(scriptTags.length).toBeGreaterThan(0)
  expect(scriptTags[0]?.getAttribute('src')).toBe('_assets/main.js')

  // Verify content contains the image reference
  const slideContent = getSlideContent(indexDoc)
  expect(slideContent).toBeInTheDocument()
  expect(slideContent.innerHTML).toContain('test-image.png')

  // Clean up test source directory
  fs.rmSync(sourceDir, { recursive: true, force: true })
})

test('toHtml should render nested slides as sections with anchor links', async () => {
  const { toHtml } = setUp()
  const outputDir = '/tmp/test-html-nested'
  const sourceDir = '/tmp/test-source'

  // Create temporary source directory
  fs.mkdirSync(sourceDir, { recursive: true })

  const slides = [
    createTestSlideNode({
      id: 'parent-slide',
      title: 'Parent Slide',
      content: '# Parent\nThis is the parent slide.',
      url: '/parent',
      navigation: {
        childSlideId: 'child-slide-1',
      },
    }),
    createTestSlideNode({
      id: 'child-slide-1',
      title: 'Child Slide 1',
      content: '# Child 1\nThis is the first child slide.',
      url: '/parent/child-1',
      navigation: {
        parentSlideId: 'parent-slide',
        nextSlideId: 'child-slide-2',
      },
    }),
    createTestSlideNode({
      id: 'child-slide-2',
      title: 'Child Slide 2',
      content: '# Child 2\nThis is the second child slide.',
      url: '/parent/child-2',
      navigation: {
        parentSlideId: 'parent-slide',
        previousSlideId: 'child-slide-1',
      },
    }),
  ]

  const options = createTestGeneratorOptions(outputDir, sourceDir)

  await toHtml(slides, options)

  // Verify files are created
  expect(fs.existsSync(path.join(outputDir, 'index.html'))).toBe(true)
  expect(fs.existsSync(path.join(outputDir, 'slide-1.html'))).toBe(true)
  expect(fs.existsSync(path.join(outputDir, 'slide-2.html'))).toBe(true)

  // Verify slide hierarchy is built correctly
  const indexDoc = loadHtmlFile(path.join(outputDir, 'index.html'))
  const slideDataScript = getSlideDataScript(indexDoc)
  expect(slideDataScript).toBeTruthy()

  const slideHierarchy = JSON.parse(slideDataScript?.textContent || '[]')
  expect(slideHierarchy).toHaveLength(1)
  expect(slideHierarchy[0].title).toBe('Parent Slide')
  expect(slideHierarchy[0].children).toHaveLength(2)
  expect(slideHierarchy[0].children[0].title).toBe('Child Slide 1')
  expect(slideHierarchy[0].children[1].title).toBe('Child Slide 2')

  // Verify navigation widget and context menu are present
  const navWidget = getNavigationWidget(indexDoc)
  expect(navWidget).toBeInTheDocument()

  const menuButton = getMenuButton(indexDoc)
  expect(menuButton).toBeInTheDocument()
  expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  expect(menuButton).toHaveAttribute('aria-controls', 'context-menu')

  const contextMenu = getContextMenu(indexDoc)
  expect(contextMenu).toBeTruthy()
  expect(contextMenu).toHaveAttribute('role', 'dialog')
  expect(contextMenu).toHaveAttribute('aria-label', 'Slide navigation menu')
  expect(contextMenu).toHaveAttribute('aria-hidden', 'true')
})

test('toHtml should handle file system errors gracefully', async () => {
  const { toHtml } = setUp()
  const outputDir = '/root/non-writable-directory' // This should fail on most systems
  const sourceDir = '/tmp/test-source'

  // Create temporary source directory
  fs.mkdirSync(sourceDir, { recursive: true })

  const slides = [
    createTestSlideNode({
      id: 'slide-0',
      title: 'Test Slide',
      content: '# Test\nThis is a test slide.',
      url: '/test',
    }),
  ]

  const options = createTestGeneratorOptions(outputDir, sourceDir)

  // This should throw an error due to permissions
  await expect(toHtml(slides, options)).rejects.toThrow()
})

test('toHtml should generate HTML with proper template structure', async () => {
  const { toHtml } = setUp()
  const outputDir = '/tmp/test-html-output'
  const sourceDir = '/tmp/test-source'

  // Create temporary source directory
  fs.mkdirSync(sourceDir, { recursive: true })

  const slides = [
    createTestSlideNode({
      id: 'slide-0',
      title: 'Template Test Slide',
      content: '# Template Test\nThis tests the template structure.',
      url: '/template-test',
    }),
  ]

  const options = createTestGeneratorOptions(outputDir, sourceDir)

  await toHtml(slides, options)

  const indexDoc = loadHtmlFile(path.join(outputDir, 'index.html'))

  // Verify basic HTML structure
  expect(indexDoc.doctype?.name).toBe('html')
  expect(indexDoc.querySelector('html')).toBeTruthy()
  expect(indexDoc.querySelector('head')).toBeTruthy()
  expect(indexDoc.querySelector('body')).toBeTruthy()

  // Verify required elements with accessibility
  const slideContent = getSlideContent(indexDoc)
  expect(slideContent).toBeInTheDocument()
  expect(slideContent).toHaveAttribute('role', 'main')
  expect(slideContent).toHaveAttribute('aria-label', 'Slide content')

  const navWidget = getNavigationWidget(indexDoc)
  expect(navWidget).toBeInTheDocument()
  expect(navWidget).toHaveAttribute('role', 'navigation')
  expect(navWidget).toHaveAttribute('aria-label', 'Slide navigation')

  const contextMenu = getContextMenu(indexDoc)
  expect(contextMenu).toBeTruthy()
  expect(contextMenu).toHaveAttribute('role', 'dialog')
  expect(contextMenu).toHaveAttribute('aria-label', 'Slide navigation menu')

  const slideDataScript = getSlideDataScript(indexDoc)
  expect(slideDataScript).toBeTruthy()

  // Verify content is rendered
  expect(slideContent.innerHTML).toContain('<h1>Template Test</h1>')
  expect(slideContent.innerHTML).toContain('This tests the template structure.')

  // Verify menu button accessibility
  const menuButton = getMenuButton(indexDoc)
  expect(menuButton).toBeInTheDocument()
  expect(menuButton).toHaveAttribute('aria-label', 'Open slide menu')
  expect(menuButton).toHaveAttribute('title', 'Open slide menu')
})

test('toHtml should handle slides with no content', async () => {
  const { toHtml } = setUp()
  const outputDir = '/tmp/test-html-output'
  const sourceDir = '/tmp/test-source'

  // Create temporary source directory
  fs.mkdirSync(sourceDir, { recursive: true })

  const slides = [
    createTestSlideNode({
      id: 'empty-slide',
      title: 'Empty Slide',
      content: '',
      url: '/empty',
    }),
  ]

  const options = createTestGeneratorOptions(outputDir, sourceDir)

  await toHtml(slides, options)

  expect(fs.existsSync(path.join(outputDir, 'index.html'))).toBe(true)

  const indexDoc = loadHtmlFile(path.join(outputDir, 'index.html'))
  expect(indexDoc.title).toBe('Empty Slide')

  const slideContent = getSlideContent(indexDoc)
  expect(slideContent).toBeInTheDocument()
  expect(slideContent.innerHTML.trim()).toBe('')

  // Verify navigation widget is still present
  const navWidget = getNavigationWidget(indexDoc)
  expect(navWidget).toBeInTheDocument()
})

test('toHtml should handle slides with custom front matter', async () => {
  const { toHtml } = setUp()
  const outputDir = '/tmp/test-html-output'
  const sourceDir = '/tmp/test-source'

  // Create temporary source directory
  fs.mkdirSync(sourceDir, { recursive: true })

  const slides = [
    createTestSlideNode({
      id: 'custom-slide',
      title: 'Custom Slide',
      content: '# Custom Content\nThis slide has custom properties.',
      url: '/custom',
      frontMatter: {
        title: 'Custom Slide',
        description: 'A slide with custom properties',
        author: 'Test Author',
        theme: 'dark',
      },
    }),
  ]

  const options = createTestGeneratorOptions(outputDir, sourceDir)

  await toHtml(slides, options)

  const indexDoc = loadHtmlFile(path.join(outputDir, 'index.html'))
  expect(indexDoc.title).toBe('Custom Slide')

  const slideContent = getSlideContent(indexDoc)
  expect(slideContent).toBeInTheDocument()
  expect(slideContent.innerHTML).toContain('<h1>Custom Content</h1>')
  expect(slideContent.innerHTML).toContain('This slide has custom properties.')

  // Verify all accessibility elements are present
  const navWidget = getNavigationWidget(indexDoc)
  expect(navWidget).toBeInTheDocument()

  const menuButton = getMenuButton(indexDoc)
  expect(menuButton).toBeInTheDocument()

  const contextMenu = getContextMenu(indexDoc)
  expect(contextMenu).toBeTruthy()
  expect(contextMenu).toHaveAttribute('role', 'dialog')
})
