import { test, expect } from 'vitest'
import { parse, merge } from '../front-matter-parser'

function setUp() {
  return { parse, merge }
}

test('parse should correctly parse content with front matter', () => {
  const { parse } = setUp()
  const rawContent = `---
title: "My Slide Title"
description: "A test slide"
theme: dark
---
# Slide Content
This is the main content.`

  const result = parse(rawContent)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value.frontMatter).toEqual({
      title: 'My Slide Title',
      description: 'A test slide',
      theme: 'dark',
    })
    expect(result.value.content.trim()).toBe(`# Slide Content
This is the main content.`)
  }
})

test('parse should handle content without front matter', () => {
  const { parse } = setUp()
  const rawContent = `# Regular Slide
No front matter here.`

  const result = parse(rawContent)

  expect(result.isOk()).toBe(true)
  if (result.isOk()) {
    expect(result.value.frontMatter).toEqual({})
    expect(result.value.content).toBe(rawContent)
  }
})

test('merge should merge two front matter objects with override winning conflicts', () => {
  const { merge } = setUp()
  const baseObject = {
    title: 'Base Title',
    author: 'Base Author',
    theme: 'light',
  }
  const overrideObject = {
    title: 'Override Title',
    description: 'Override Description',
  }

  const result = merge(baseObject, overrideObject)

  expect(result).toEqual({
    title: 'Override Title',
    author: 'Base Author',
    theme: 'light',
    description: 'Override Description',
  })
})
