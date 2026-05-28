import { describe, expect, it } from 'vitest';

import { loadDriftSampleDoc } from '../../../helpers/sinks/loadDriftSampleDoc';
import {
  isExportCompleteMessage,
  isExportRunMessage,
  isExportSinkResultMessage,
} from '@/io/messages/export';

describe('export message guards', () => {
  const doc = loadDriftSampleDoc();
  const serializable = { kind: doc.kind, payload: doc.payload };
  const formatOptions = { format: 'json' as const };
  const files = [
    {
      path: 'docs/figmint/drift-2026-05-27.v1.json',
      content: '{"kind":"drift-report"}',
      format: 'json' as const,
    },
  ];

  describe('isExportRunMessage', () => {
    it('accepts valid export/run payloads', () => {
      expect(
        isExportRunMessage({
          type: 'export/run',
          requestId: 'export-1',
          sinks: ['output-page', 'plugin-data'],
          doc: serializable,
          formatOptions: formatOptions,
          files: files,
        }),
      ).toBe(true);
      expect(
        isExportRunMessage({
          type: 'export/run',
          requestId: 'export-2',
          sinks: ['github-pr'],
          doc: serializable,
          formatOptions: { format: 'both', primaryFormat: 'md' },
          files: files,
          githubPR: {
            repoUrl: 'https://github.com/acme/widgets',
            contractKind: 'drift-report',
            githubPROptions: {
              owner: 'acme',
              repo: 'widgets',
              baseBranch: 'main',
              commitMessage: 'chore: export drift report',
            },
            files: [{ path: 'docs/figmint/drift.v1.json', content: '{}' }],
          },
        }),
      ).toBe(true);
      expect(
        isExportRunMessage({
          type: 'export/run',
          requestId: 'export-3',
          sinks: ['output-page'],
          doc: { kind: 'registry', payload: { v: 1, kind: 'registry' } },
          formatOptions: { format: 'json', baseName: 'docs/figmint/registry-export', label: 'figmint/registry' },
          files: [{ path: 'docs/figmint/registry-export.json', content: '{}', format: 'json' }],
        }),
      ).toBe(true);
    });

    it('rejects invalid export/run payloads', () => {
      expect(isExportRunMessage(null)).toBe(false);
      expect(isExportRunMessage({ type: 'export/run' })).toBe(false);
      expect(
        isExportRunMessage({
          type: 'export/run',
          requestId: 'export-1',
          sinks: ['download'],
          doc: serializable,
          formatOptions: formatOptions,
          files: files,
        }),
      ).toBe(false);
      expect(
        isExportRunMessage({
          type: 'export/run',
          requestId: 'export-1',
          sinks: ['output-page'],
          doc: { kind: 'unknown', payload: {} },
          formatOptions: formatOptions,
          files: files,
        }),
      ).toBe(false);
      expect(
        isExportRunMessage({
          type: 'export/run',
          requestId: 'export-1',
          sinks: ['output-page'],
          doc: serializable,
          formatOptions: { format: 'xml' },
          files: files,
        }),
      ).toBe(false);
      expect(
        isExportRunMessage({
          type: 'export/run',
          requestId: 'export-1',
          sinks: ['output-page'],
          doc: serializable,
          formatOptions: formatOptions,
          files: [{ path: 'x.json', content: '{}', format: 'xml' }],
        }),
      ).toBe(false);
    });
  });

  describe('isExportSinkResultMessage', () => {
    it('accepts valid export/sink-result payloads', () => {
      expect(
        isExportSinkResultMessage({
          type: 'export/sink-result',
          requestId: 'export-1',
          sink: 'download',
          ok: true,
          message: 'Saved file',
        }),
      ).toBe(true);
      expect(
        isExportSinkResultMessage({
          type: 'export/sink-result',
          requestId: 'export-2',
          sink: 'github-pr',
          ok: false,
          error: 'Auth required',
          code: 'auth-required',
        }),
      ).toBe(true);
      expect(
        isExportSinkResultMessage({
          type: 'export/sink-result',
          requestId: 'export-3',
          sink: 'output-page',
          ok: true,
          message: 'Wrote output page',
        }),
      ).toBe(true);
    });

    it('rejects invalid export/sink-result payloads', () => {
      expect(isExportSinkResultMessage(undefined)).toBe(false);
      expect(isExportSinkResultMessage({ type: 'export/sink-result' })).toBe(false);
      expect(
        isExportSinkResultMessage({
          type: 'export/sink-result',
          requestId: 'export-1',
          sink: 'download',
          ok: 'yes',
        }),
      ).toBe(false);
      expect(
        isExportSinkResultMessage({
          type: 'export/sink-result',
          requestId: 'export-1',
          sink: 'download',
          ok: false,
          code: 'invalid-code',
        }),
      ).toBe(false);
    });
  });

  describe('isExportCompleteMessage', () => {
    it('accepts valid export/complete payloads', () => {
      expect(
        isExportCompleteMessage({
          type: 'export/complete',
          requestId: 'export-1',
          bySink: {
            download: { ok: true, message: 'Saved' },
            clipboard: { ok: false, error: 'Denied' },
          },
        }),
      ).toBe(true);
      expect(
        isExportCompleteMessage({
          type: 'export/complete',
          requestId: 'export-2',
          bySink: {
            'github-pr': { ok: false, error: 'Forbidden', code: 'forbidden' },
          },
        }),
      ).toBe(true);
    });

    it('rejects invalid export/complete payloads', () => {
      expect(isExportCompleteMessage({})).toBe(false);
      expect(
        isExportCompleteMessage({
          type: 'export/complete',
          requestId: 'export-1',
          bySink: { download: { ok: 'yes' } },
        }),
      ).toBe(false);
      expect(
        isExportCompleteMessage({
          type: 'export/sink-result',
          requestId: 'export-1',
          sink: 'download',
          ok: true,
        }),
      ).toBe(false);
    });
  });
});
