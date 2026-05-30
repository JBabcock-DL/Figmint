import { describe, expect, it } from 'vitest';

import handoffFixture from '@/io/formats/__fixtures__/handoff-context-min.json';
import {
  HANDOFF_CAPTURE,
  HANDOFF_CAPTURE_RESULT,
  HANDOFF_SELECTION,
  isHandoffCaptureMessage,
  isHandoffCaptureResultMessage,
  isHandoffSelectionMessage,
} from '@/io/messages/handoff';

describe('handoff message guards', () => {
  describe('isHandoffCaptureMessage', () => {
    it('accepts valid handoff/capture payloads', function () {
      expect(
        isHandoffCaptureMessage({
          type: HANDOFF_CAPTURE,
          requestId: 'handoff-1',
        }),
      ).toBe(true);
    });

    it('rejects invalid handoff/capture payloads', function () {
      expect(isHandoffCaptureMessage(null)).toBe(false);
      expect(isHandoffCaptureMessage({ type: HANDOFF_CAPTURE })).toBe(false);
      expect(
        isHandoffCaptureMessage({
          type: HANDOFF_CAPTURE_RESULT,
          requestId: 'handoff-1',
        }),
      ).toBe(false);
    });
  });

  describe('isHandoffCaptureResultMessage', () => {
    it('accepts success and failure payloads', function () {
      expect(
        isHandoffCaptureResultMessage({
          type: HANDOFF_CAPTURE_RESULT,
          requestId: 'handoff-1',
          ok: true,
          markdown: '# handoff-context v1',
          document: handoffFixture,
          warnings: [],
          durationMs: 42,
        }),
      ).toBe(true);
      expect(
        isHandoffCaptureResultMessage({
          type: HANDOFF_CAPTURE_RESULT,
          requestId: 'handoff-1',
          ok: false,
          error: 'No selection',
          durationMs: 5,
        }),
      ).toBe(true);
    });

    it('rejects malformed result payloads', function () {
      expect(isHandoffCaptureResultMessage({ type: HANDOFF_CAPTURE_RESULT })).toBe(false);
      expect(
        isHandoffCaptureResultMessage({
          type: HANDOFF_CAPTURE_RESULT,
          requestId: 'handoff-1',
          ok: true,
          warnings: ['ok', 1],
        }),
      ).toBe(false);
    });
  });

  describe('isHandoffSelectionMessage', () => {
    it('accepts valid handoff/selection payloads', function () {
      expect(
        isHandoffSelectionMessage({
          type: HANDOFF_SELECTION,
          count: 2,
          names: ['Checkout', 'Details'],
        }),
      ).toBe(true);
    });

    it('rejects invalid handoff/selection payloads', function () {
      expect(isHandoffSelectionMessage(null)).toBe(false);
      expect(
        isHandoffSelectionMessage({
          type: HANDOFF_SELECTION,
          count: 1,
          names: [123],
        }),
      ).toBe(false);
    });
  });
});
