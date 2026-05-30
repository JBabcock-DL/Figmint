import { describe, expect, it } from 'vitest';

import type { HandoffFrame } from '@detroitlabs/fighub-contracts';

import { captureSelection } from '@/core/handoff/capture';

import {
  createMockExportableNode,
  installHandoffFigmaMock,
  restoreHandoffFigmaMock,
} from '../../../mocks/handoffFigma';

const HANDOFF_FRAME_KEYS: (keyof HandoffFrame)[] = [
  'nodeId',
  'name',
  'deepLink',
  'screenshot',
];

describe('CapturedFrame contract shape', () => {
  it('matches HandoffFrame keys only', async function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode({ id: '10:20', name: 'Screen' })],
    });

    try {
      const result = await captureSelection();
      const frame = result.frames[0];
      expect(Object.keys(frame).sort()).toEqual([...HANDOFF_FRAME_KEYS].sort());
      expect(frame.screenshot.format).toBe('png');
      expect(frame.screenshot.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    } finally {
      restoreHandoffFigmaMock();
    }
  });
});
