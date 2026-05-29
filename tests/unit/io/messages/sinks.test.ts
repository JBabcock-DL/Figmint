import { describe, expect, it } from 'vitest';

import { loadDriftSampleDoc } from '../../../helpers/sinks/loadDriftSampleDoc';
import {
  isSinkErrorMessage,
  isSinkOutputPageMessage,
  isSinkPluginDataMessage,
  isSinkResultMessage,
} from '@/io/messages/sinks';

describe('sink message guards', () => {
  const doc = loadDriftSampleDoc();
  const serializable = { kind: doc.kind, payload: doc.payload };
  const options = { format: 'json' as const };

  describe('isSinkOutputPageMessage', () => {
    it('accepts valid sink/output-page payloads', () => {
      expect(
        isSinkOutputPageMessage({
          type: 'sink/output-page',
          requestId: 'req-1',
          doc: serializable,
          options: options,
        }),
      ).toBe(true);
      expect(
        isSinkOutputPageMessage({
          type: 'sink/output-page',
          requestId: 'req-2',
          doc: serializable,
          options: { format: 'both', primaryFormat: 'md' },
        }),
      ).toBe(true);
      expect(
        isSinkOutputPageMessage({
          type: 'sink/output-page',
          requestId: 'req-3',
          doc: serializable,
          options: { format: 'md', baseName: 'x', label: 'y' },
        }),
      ).toBe(true);
      expect(
        isSinkOutputPageMessage({
          type: 'sink/output-page',
          requestId: 'req-4',
          doc: { kind: 'handoff-context', payload: {} },
          options: { format: 'json' },
        }),
      ).toBe(true);
    });

    it('rejects invalid sink/output-page payloads', () => {
      expect(isSinkOutputPageMessage(null)).toBe(false);
      expect(isSinkOutputPageMessage({ type: 'sink/output-page' })).toBe(false);
      expect(
        isSinkOutputPageMessage({
          type: 'sink/output-page',
          requestId: 1,
          doc: serializable,
          options: options,
        }),
      ).toBe(false);
      expect(
        isSinkOutputPageMessage({
          type: 'sink/output-page',
          requestId: 'req',
          doc: { kind: 'unknown', payload: {} },
          options: options,
        }),
      ).toBe(false);
      expect(
        isSinkOutputPageMessage({
          type: 'sink/output-page',
          requestId: 'req',
          doc: serializable,
          options: { format: 'xml' },
        }),
      ).toBe(false);
    });
  });

  describe('isSinkPluginDataMessage', () => {
    it('accepts valid sink/plugin-data payloads', () => {
      expect(
        isSinkPluginDataMessage({
          type: 'sink/plugin-data',
          requestId: 'req-1',
          doc: serializable,
          options: options,
        }),
      ).toBe(true);
      expect(
        isSinkPluginDataMessage({
          type: 'sink/plugin-data',
          requestId: 'req-2',
          doc: serializable,
          options: { format: 'both' },
        }),
      ).toBe(true);
      expect(
        isSinkPluginDataMessage({
          type: 'sink/plugin-data',
          requestId: 'req-3',
          doc: { kind: 'registry', payload: {} },
          options: { format: 'json' },
        }),
      ).toBe(true);
      expect(
        isSinkPluginDataMessage({
          type: 'sink/plugin-data',
          requestId: 'req-4',
          doc: serializable,
          options: { format: 'md', label: 'fighub/x/y' },
        }),
      ).toBe(true);
    });

    it('rejects invalid sink/plugin-data payloads', () => {
      expect(isSinkPluginDataMessage(undefined)).toBe(false);
      expect(isSinkPluginDataMessage({ type: 'sink/plugin-data' })).toBe(false);
      expect(
        isSinkPluginDataMessage({
          type: 'sink/plugin-data',
          requestId: 'req',
          options: options,
        }),
      ).toBe(false);
      expect(
        isSinkPluginDataMessage({
          type: 'sink/plugin-data',
          requestId: 'req',
          doc: serializable,
          options: { primaryFormat: 'xml' },
        }),
      ).toBe(false);
    });
  });

  describe('isSinkResultMessage', () => {
    it('accepts valid sink/result payloads', () => {
      expect(
        isSinkResultMessage({
          type: 'sink/result',
          requestId: 'req-1',
          result: { ok: true, sink: 'download', message: 'done' },
        }),
      ).toBe(true);
      expect(
        isSinkResultMessage({
          type: 'sink/result',
          requestId: 'req-2',
          result: {
            ok: false,
            sink: 'clipboard',
            message: 'failed',
            error: 'blocked',
          },
        }),
      ).toBe(true);
      expect(
        isSinkResultMessage({
          type: 'sink/result',
          requestId: 'req-3',
          result: { ok: true, sink: 'output-page', message: 'wrote' },
        }),
      ).toBe(true);
      expect(
        isSinkResultMessage({
          type: 'sink/result',
          requestId: 'req-4',
          result: { ok: true, sink: 'plugin-data', message: 'stored' },
        }),
      ).toBe(true);
    });

    it('rejects invalid sink/result payloads', () => {
      expect(isSinkResultMessage('sink/result')).toBe(false);
      expect(isSinkResultMessage({ type: 'sink/result', requestId: 'x' })).toBe(false);
      expect(
        isSinkResultMessage({
          type: 'sink/result',
          requestId: 'x',
          result: { ok: true, sink: 'github', message: 'nope' },
        }),
      ).toBe(false);
      expect(
        isSinkResultMessage({
          type: 'sink/result',
          requestId: 'x',
          result: { ok: 'yes', sink: 'download', message: 'nope' },
        }),
      ).toBe(false);
    });
  });

  describe('isSinkErrorMessage', () => {
    it('accepts valid sink/error payloads', () => {
      expect(
        isSinkErrorMessage({
          type: 'sink/error',
          requestId: 'req-1',
          message: 'failed',
        }),
      ).toBe(true);
      expect(
        isSinkErrorMessage({
          type: 'sink/error',
          requestId: 'req-2',
          message: 'selection error',
        }),
      ).toBe(true);
      expect(
        isSinkErrorMessage({
          type: 'sink/error',
          requestId: 'req-3',
          message: 'timeout',
        }),
      ).toBe(true);
      expect(
        isSinkErrorMessage({
          type: 'sink/error',
          requestId: 'req-4',
          message: 'unexpected',
        }),
      ).toBe(true);
    });

    it('rejects invalid sink/error payloads', () => {
      expect(isSinkErrorMessage({})).toBe(false);
      expect(isSinkErrorMessage({ type: 'sink/error' })).toBe(false);
      expect(isSinkErrorMessage({ type: 'sink/error', requestId: 'x', message: 1 })).toBe(false);
      expect(
        isSinkErrorMessage({ type: 'sink/result', requestId: 'x', message: 'wrong type' }),
      ).toBe(false);
    });
  });
});
