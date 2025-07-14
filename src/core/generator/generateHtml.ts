import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { marked } from 'marked';
import { SlideNode } from '../../types/slide';
import { GeneratorOptions } from '../../types/generator';
import { SlideHierarchy } from '../../types/html';
import { copySourceAssets } from '../asset-copier';

/**
 * Generates an HTML presentation from a slide node tree.
 * 
 * @param {SlideNode[]} nodes - The array of slide nodes to generate.
 * @param {GeneratorOptions} options - The generator options.
 */
export async function toHtml(nodes: SlideNode[], options: GeneratorOptions): Promise<void> {
  const { sourceDir, outputDir } = options;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create assets directory
  const assetsDir = path.join(outputDir, '_assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Copy generator assets and user assets
  await copyGeneratorAssets(assetsDir);
  await copySourceAssets(sourceDir, assetsDir);

  const templatePath = path.join(__dirname, 'templates', 'slide.hbs');
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateSource);

  const nodeMap = new Map(nodes.map(node => [node.id, node]));

  // Generate file names for each slide URL for consistent linking
  const urlToFileName = new Map<string, string>();
  nodes.forEach((node, index) => {
    const isRoot = index === 0;
    const fileName = isRoot ? 'index.html' : `slide-${index}.html`;
    urlToFileName.set(node.url, fileName);
  });

  const slideHierarchy = buildSlideHierarchy(nodes, urlToFileName);
  const slideHierarchyJson = JSON.stringify(slideHierarchy);

  nodes.forEach(node => {
    const fileName = urlToFileName.get(node.url)!;
    const filePath = path.join(outputDir, fileName);

    const nextSlide = node.navigation.nextSlideId ? nodeMap.get(node.navigation.nextSlideId) : null;
    const prevSlide = node.navigation.previousSlideId ? nodeMap.get(node.navigation.previousSlideId) : null;

    const data = {
      title: node.frontMatter?.title || 'Slide',
      content: marked.parse(node.content),
      slideHierarchyJson,
      assetsPath: '_assets',
      nav: {
        nextUrl: nextSlide ? urlToFileName.get(nextSlide.url) : null,
        prevUrl: prevSlide ? urlToFileName.get(prevSlide.url) : null,
      },
    };

    const html = template(data);
    fs.writeFileSync(filePath, html);
  });

  console.log(`Successfully generated ${nodes.length} HTML slides in ${outputDir}`);
}

function buildSlideHierarchy(nodes: SlideNode[], urlToFileName: Map<string, string>): SlideHierarchy[] {
  const hierarchyMap = new Map<string, SlideHierarchy>();
  const roots: SlideHierarchy[] = [];

  // Initialize map with all nodes
  nodes.forEach(node => {
    hierarchyMap.set(node.id, {
      title: node.frontMatter?.title || 'Untitled Slide',
      url: urlToFileName.get(node.url)!,
      children: [],
    });
  });

  // Populate children
  nodes.forEach(node => {
    if (node.navigation.parentSlideId) {
      const parent = hierarchyMap.get(node.navigation.parentSlideId);
      if (parent) {
        parent.children.push(hierarchyMap.get(node.id)!);
      }
    } else {
      roots.push(hierarchyMap.get(node.id)!);
    }
  });

  return roots;
}

/**
 * Copies the generator's asset files to the output assets directory.
 * 
 * @param {string} assetsDir - The target assets directory.
 * @returns {Promise<void>}
 */
async function copyGeneratorAssets(assetsDir: string): Promise<void> {
  const assetFiles = [
    { name: 'style.css', source: path.join(__dirname, '..', 'assets', 'style.css') },
    { name: 'tokens.css', source: path.join(__dirname, '..', 'assets', 'tokens.css') },
    { name: 'main.js', source: path.join(__dirname, '..', 'assets', 'main.js') },
  ];

  for (const asset of assetFiles) {
    const target = path.join(assetsDir, asset.name);
    try {
      fs.copyFileSync(asset.source, target);
      console.log(`Copied ${asset.name} to ${target}`);
    } catch (error) {
      console.error(`Failed to copy ${asset.name}: ${error}`);
    }
  }
}
