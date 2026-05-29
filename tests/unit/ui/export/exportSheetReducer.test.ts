import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';
import { describe, expect, it } from 'vitest';

import driftFixture from '@/io/formats/__fixtures__/drift-report-ac.json';
import {
  createInitialExportSheetState,
  reduceExportSheet,
} from '@/ui/export/exportSheetReducer';
import { availableSinks } from '@/ui/export/availableSinks';
import type { ContractDocument } from '@/ui/export/types';

const driftDoc: ContractDocument = {
  kind: 'drift-report',
  payload: driftFixture as DriftReportV1,
};

const registryDoc: ContractDocument = {
  kind: 'registry',
  payload: {
    v: 1,
    kind: 'registry',
    fileKey: 'demo',
    components: {},
  },
};

describe('exportSheetReducer', () => {
  it('defaults both formats except registry (json only)', () => {
    const drift = createInitialExportSheetState(driftDoc);
    expect(drift.formats).toEqual({ json: true, md: true });

    const registry = createInitialExportSheetState(registryDoc);
    expect(registry.formats).toEqual({ json: true, md: false });
  });

  it('intersects defaultSinks with available sinks', () => {
    const available = availableSinks();
    const state = createInitialExportSheetState(driftDoc, {
      defaultSinks: ['download', 'github-pr', 'not-a-sink' as 'download'],
    });
    expect(state.sinks.download).toBe(true);
    if (available.includes('github-pr')) {
      expect(state.sinks['github-pr']).toBe(true);
    }
    expect(state.sinks.clipboard).toBe(false);
  });

  it('toggles format and sink selections', () => {
    const initial = createInitialExportSheetState(driftDoc, { defaultSinks: ['download'] });
    const noMd = reduceExportSheet(initial, { type: 'toggle-format', format: 'md' });
    expect(noMd.formats.md).toBe(false);

    const withClipboard = reduceExportSheet(noMd, { type: 'toggle-sink', sink: 'clipboard' });
    expect(withClipboard.sinks.clipboard).toBe(true);
  });

  it('aggregates partial failure across three sinks', () => {
    const initial = createInitialExportSheetState(driftDoc, {
      defaultSinks: ['download', 'clipboard', 'output-page'],
    });
    const started = reduceExportSheet(initial, {
      type: 'start-export',
      requestId: 'export-test-1',
    });
    expect(started.exporting).toBe(true);
    expect(started.results?.requestId).toBe('export-test-1');

    const afterDownload = reduceExportSheet(started, {
      type: 'sink-result',
      sink: 'download',
      ok: true,
      message: 'Saved drift-report.json',
    });
    const afterClipboard = reduceExportSheet(afterDownload, {
      type: 'sink-result',
      sink: 'clipboard',
      ok: true,
      message: 'Copied to clipboard',
    });
    const afterOutputPage = reduceExportSheet(afterClipboard, {
      type: 'sink-result',
      sink: 'output-page',
      ok: false,
      error: 'Output page not found',
    });
    const done = reduceExportSheet(afterOutputPage, { type: 'complete' });

    expect(done.exporting).toBe(false);
    expect(done.results?.bySink.download?.ok).toBe(true);
    expect(done.results?.bySink.clipboard?.ok).toBe(true);
    expect(done.results?.bySink['output-page']?.ok).toBe(false);
    expect(done.results?.bySink['output-page']?.error).toBe('Output page not found');
  });

  it('resets to initial state when init context is provided', () => {
    const initial = createInitialExportSheetState(driftDoc, { defaultSinks: ['download'] });
    const exporting = reduceExportSheet(initial, {
      type: 'start-export',
      requestId: 'export-test-2',
    });
    const reset = reduceExportSheet(exporting, { type: 'reset' }, {
      document: driftDoc,
      defaultSinks: ['download'],
    });
    expect(reset.exporting).toBe(false);
    expect(reset.results).toBeNull();
    expect(reset.sinks.download).toBe(true);
  });
});
