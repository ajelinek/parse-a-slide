import { SlideNode } from './slide'

export type Generator = (slideNode: SlideNode) => string;

export interface GeneratorOptions {
  sourceDir: string;
  outputDir: string;
}
