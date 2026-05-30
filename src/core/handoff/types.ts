import type { HandoffFrame } from '@detroitlabs/fighub-contracts';

import type { FigmaFileKeySource } from '@/core/figma/resolveFileKey';

export type CapturedFrame = HandoffFrame;

export interface CaptureSelectionResult {
  frames: CapturedFrame[];
  warnings: string[];
  fileKey: string;
  fileKeySource: FigmaFileKeySource;
}

export const MAX_SELECTION_COUNT = 10;

export const EXPORTABLE_NODE_TYPES = new Set<string>([
  'FRAME',
  'COMPONENT',
  'INSTANCE',
  'SECTION',
  'GROUP',
]);
