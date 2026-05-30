import { describe, expect, it } from 'vitest';

import {
  HANDOFF_CAPTURE,
  HANDOFF_CAPTURE_RESULT,
  HANDOFF_SELECTION,
  isHandoffCaptureMessage,
  isHandoffCaptureResultMessage,
  isHandoffSelectionMessage,
  type HandoffCaptureMessage,
  type HandoffCaptureResultMessage,
  type HandoffSelectionMessage,
} from '@/io/messages/handoff';

describe('handoff UI message contract', () => {
  it('accepts UI handoff/capture postMessage shape', function () {
    const message: HandoffCaptureMessage = {
      type: HANDOFF_CAPTURE,
      requestId: 'handoff-capture-1',
    };

    expect(isHandoffCaptureMessage(message)).toBe(true);
    expect(message.type).toBe('handoff/capture');
  });

  it('accepts handoff/capture-result fields consumed by UI hooks', function () {
    const message: HandoffCaptureResultMessage = {
      type: HANDOFF_CAPTURE_RESULT,
      requestId: 'handoff-capture-1',
      ok: true,
      markdown: '# handoff-context v1',
      warnings: ['warn'],
      durationMs: 42,
    };

    expect(isHandoffCaptureResultMessage(message)).toBe(true);
    expect(message.markdown).toBe('# handoff-context v1');
    expect(message.warnings).toEqual(['warn']);
  });

  it('accepts handoff/selection fields consumed by selection hook', function () {
    const message: HandoffSelectionMessage = {
      type: HANDOFF_SELECTION,
      count: 2,
      names: ['Checkout', 'Details'],
    };

    expect(isHandoffSelectionMessage(message)).toBe(true);
    expect(message.count).toBe(2);
    expect(message.names).toEqual(['Checkout', 'Details']);
  });
});
