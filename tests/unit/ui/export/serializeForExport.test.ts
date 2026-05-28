import type { DriftReportV1 } from '@detroitlabs/figmint-contracts';
import { describe, expect, it } from 'vitest';

import driftFixture from '@/io/formats/__fixtures__/drift-report-ac.json';
import { buildExportFiles } from '@/ui/export/serializeForExport';
import type { ContractDocument } from '@/ui/export/types';

const driftDoc: ContractDocument = {
  kind: 'drift-report',
  payload: driftFixture as DriftReportV1,
};

describe('buildExportFiles', () => {
  it('produces json and markdown files for drift-report when both formats selected', () => {
    const basename = 'docs/figmint/drift-2026-05-27';
    const files = buildExportFiles(driftDoc, { json: true, md: true }, basename);

    expect(files).toHaveLength(2);
    expect(files[0]).toEqual({
      path: basename + '.v1.json',
      content: expect.stringContaining('"kind": "drift-report"'),
      format: 'json',
    });
    expect(files[1]).toEqual({
      path: basename + '.v1.md',
      content: expect.stringContaining('# drift-report v1'),
      format: 'md',
    });
  });

  it('uses .json extension only for registry and skips markdown', () => {
    const registryDoc: ContractDocument = {
      kind: 'registry',
      payload: {
        v: 1,
        kind: 'registry',
        fileKey: 'demo',
        components: {},
      },
    };
    const files = buildExportFiles(
      registryDoc,
      { json: true, md: true },
      'docs/figmint/registry-export',
    );

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('docs/figmint/registry-export.json');
    expect(files[0].format).toBe('json');
    expect(files[0].content).toContain('"kind": "registry"');
  });
});
