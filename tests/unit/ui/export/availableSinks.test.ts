import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';
import { describe, expect, it } from 'vitest';

import driftFixture from '@/io/formats/__fixtures__/drift-report-ac.json';
import {
  availableSinks,
  canExport,
  isPathInputVisible,
} from '@/ui/export/availableSinks';
import { createInitialExportSheetState } from '@/ui/export/exportSheetReducer';
import type { ContractDocument } from '@/ui/export/types';

const driftDoc: ContractDocument = {
  kind: 'drift-report',
  payload: driftFixture as DriftReportV1,
};

describe('availableSinks', () => {
  it('includes github-pr when oauth and PR sink flags are enabled', () => {
    const sinks = availableSinks();
    expect(sinks).toContain('download');
    expect(sinks).toContain('clipboard');
    expect(sinks).toContain('output-page');
    expect(sinks).toContain('plugin-data');
    expect(sinks).toContain('github-pr');
  });

  it('shows path input only for download or github-pr', () => {
    expect(isPathInputVisible({ download: true } as never)).toBe(true);
    expect(isPathInputVisible({ 'github-pr': true } as never)).toBe(true);
    expect(isPathInputVisible({ clipboard: true, 'output-page': true } as never)).toBe(false);
  });

  it('allows export when formats and sinks are selected and not exporting', () => {
    const state = createInitialExportSheetState(driftDoc, { defaultSinks: ['download'] });
    expect(canExport(state)).toBe(true);

    const noFormat = {
      ...state,
      formats: { json: false, md: false },
    };
    expect(canExport(noFormat)).toBe(false);

    const noSink = {
      ...state,
      sinks: { ...state.sinks, download: false },
    };
    expect(canExport(noSink)).toBe(false);

    const exporting = {
      ...state,
      exporting: true,
    };
    expect(canExport(exporting)).toBe(false);
  });
});
