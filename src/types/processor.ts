import { Result } from 'neverthrow';
import { AppError } from '../utils/error';
import { SlideNode } from './slide';

/**
 * Interface for processors that can be applied to SlideNodes.
 * Processors can modify SlideNodes before they're returned by the Parser.
 */
export interface Processor {
  process(slideNode: SlideNode): Result<SlideNode, AppError>;
}
