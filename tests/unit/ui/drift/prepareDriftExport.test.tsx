import { describe, expect, it, vi } from 'vitest';

import * as flagsModule from '@/config/flags';
import { prepareDriftExport, defaultDriftExportSinks } from '@/ui/drift/prepareDriftExport';

import driftPayload from '../../../fixtures/ui/export/drift-report.json';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

const report = driftPayload as DriftReportV1;

describe('prepareDriftExport', () => {
  it('builds drift-report ContractDocument with summary title', () => {
    const props = prepareDriftExport(report);
    expect(props.document.kind).toBe('drift-report');
    expect(props.title).toContain('push');
    expect(props.title).toContain('pull');
    expect(props.defaultSinks).toEqual(['download']);
  });

  it('includes github-pr sink when GitHub connected', () => {
    vi.spyOn(flagsModule, 'flags', 'get').mockReturnValue({
      githubOAuth: true,
      githubPRSink: true,
      componentImport: true,
      codeConnectPR: true,
      evcProjector: true,
    });
    expect(defaultDriftExportSinks(true)).toEqual(['download', 'github-pr']);
  });
});
