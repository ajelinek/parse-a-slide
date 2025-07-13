import * as yaml from 'js-yaml'
import { SlideNode } from '../types/slide'

export function toMdx(slideNode: SlideNode): string {
  const frontMatter: Record<string, any> = {}

  if (slideNode.frontMatter) {
    Object.keys(slideNode.frontMatter).forEach(key => {
      const value = slideNode.frontMatter![key]
      if (value !== undefined) {
        frontMatter[key] = value
      }
    })
  }

  frontMatter.navigation = slideNode.navigation

  const yamlString = yaml.dump(frontMatter, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  })

  const mdxContent = `---
${yamlString}---

${slideNode.content}`

  return mdxContent
}
