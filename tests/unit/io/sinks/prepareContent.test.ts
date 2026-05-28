import { describe, expect, it } from 'vitest';

import { prepareSinkContent } from '@/io/sinks/prepareContent';

import { loadDriftSampleDoc } from '../../../helpers/sinks/loadDriftSampleDoc';

describe('prepareSinkContent', () => {
  it('derives baseName and label from drift meta.generatedAt', () => {
    const doc = loadDriftSampleDoc();
    const prepared = prepareSinkContent(doc, { format: 'json' });

    expect(prepared.baseName).toBe('drift-report-2026-05-27');
    expect(prepared.label).toBe('figmint/drift-report/2026-05-27T12:00:00.000Z');
  });

  it('respects explicit baseName and label overrides', () => {
    const doc = loadDriftSampleDoc();
    const prepared = prepareSinkContent(doc, {
      format: 'md',
      baseName: 'custom-export',
      label: 'figmint/custom/label',
    });

    expect(prepared.baseName).toBe('custom-export');
    expect(prepared.label).toBe('figmint/custom/label');
  });

  it('serializes drift-report via WO-019 format()', () => {
    const doc = loadDriftSampleDoc();
    const prepared = prepareSinkContent(doc, { format: 'both' });

    expect(prepared.json).toContain('"kind": "drift-report"');
    expect(prepared.markdown).toContain('# drift-report v1');
    expect(prepared.markdown).toContain('## ↑ Push');
  });

  it('uses JSON.stringify only for registry kind', () => {
    const doc = {
      kind: 'registry' as const,
      payload: { v: 1, kind: 'registry', entries: [] },
      sourceMeta: { port: 'paste' as const, receivedAt: '2026-01-01', charLength: 0 },
      rawSnippet: '{}',
    };
    const prepared = prepareSinkContent(doc, { format: 'both' });

    expect(prepared.json).toContain('"kind": "registry"');
    expect(prepared.markdown).toContain('markdown not available for registry');
  });
});
