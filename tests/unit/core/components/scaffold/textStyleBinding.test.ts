import { beforeEach, describe, expect, it } from 'vitest';

import { applyTextStyleByName } from '@/core/components/scaffold/textStyleBinding';

import { MockTextNode } from '../../canvas/__mocks__/figmaFrames';

describe('applyTextStyleByName', () => {
  beforeEach(() => {
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      loadFontAsync: async () => undefined,
      getLocalTextStylesAsync: async () => [
        {
          id: 'style-label-md',
          name: 'Label/MD',
          fontName: { family: 'Inter', style: 'Regular' },
        },
      ],
    };
  });

  it('applies matching text style id', async () => {
    const text = new MockTextNode() as unknown as TextNode & { textStyleId: string };
    await applyTextStyleByName(text, 'Label/MD');
    expect(text.textStyleId).toBe('style-label-md');
  });

  it('rejects when style name is missing', async () => {
    const text = new MockTextNode() as unknown as TextNode;
    await expect(applyTextStyleByName(text, 'Missing/Style')).rejects.toThrow(
      'Missing text style: Missing/Style',
    );
  });
});
