import type { ComponentSpecLayout } from '@detroitlabs/fighub-contracts';

export interface InferLayoutFromSourceOptions {
  sourceText: string;
  /** Optional className / style hints from WO-041 */
  hints?: Record<string, string>;
}

const DEFAULT_LAYOUT: ComponentSpecLayout = {
  direction: 'horizontal',
  gap: '8',
  padding: '16',
  sizing: { horizontal: 'hug', vertical: 'hug' },
};

/** Stub for WO-041 — returns deterministic default layout */
export function inferLayoutFromSource(_options: InferLayoutFromSourceOptions): ComponentSpecLayout {
  return {
    direction: DEFAULT_LAYOUT.direction,
    gap: DEFAULT_LAYOUT.gap,
    padding: DEFAULT_LAYOUT.padding,
    sizing: {
      horizontal: DEFAULT_LAYOUT.sizing.horizontal,
      vertical: DEFAULT_LAYOUT.sizing.vertical,
    },
  };
}
