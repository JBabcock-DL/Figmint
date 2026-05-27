import { beforeEach, describe, expect, it } from 'vitest';

import { TEXT_INSET_HORIZONTAL } from '@/core/canvas/constants';
import { configureTableText } from '@/core/canvas/helpers/textCell';

import { asTextNode, installMockFigmaCanvas, MockTextNode } from './__mocks__/figmaFrames';

describe('textCell', () => {
  beforeEach(() => {
    installMockFigmaCanvas();
  });

  it('configureTableText resizes to colWidth - TEXT_INSET_HORIZONTAL (40)', () => {
    const text = new MockTextNode();
    text.characters = 'Sample';
    configureTableText(asTextNode(text), 320);
    expect(text.width).toBe(320 - TEXT_INSET_HORIZONTAL);
    expect(text.textAutoResize).toBe('HEIGHT');
  });

  it('bandStrip uses WIDTH_AND_HEIGHT auto-resize', () => {
    const text = new MockTextNode();
    configureTableText(asTextNode(text), 120, { bandStrip: true });
    expect(text.textAutoResize).toBe('WIDTH_AND_HEIGHT');
  });
});
