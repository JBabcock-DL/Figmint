import { describe, expect, it } from 'vitest';

import { captureSelection } from '@/core/handoff/capture';

import capturedFrameMin from '../../../fixtures/handoff/captured-frame-min.json';
import {
  createMockExportableNode,
  installHandoffFigmaMock,
  restoreHandoffFigmaMock,
} from '../../../mocks/handoffFigma';

describe('captureSelection golden snapshot', () => {
  it('matches redacted captured frame shape', async function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode({ id: '1:2', name: 'Checkout' })],
      fileKey: 'abc123',
      fileName: 'My Design File',
    });

    try {
      const result = await captureSelection();
      const frame = result.frames[0];
      expect({
        nodeId: frame.nodeId,
        name: frame.name,
        deepLink: frame.deepLink,
        screenshot: {
          format: frame.screenshot.format,
          dataUrl: '[PNG]',
        },
      }).toEqual(capturedFrameMin);
    } finally {
      restoreHandoffFigmaMock();
    }
  });
});
