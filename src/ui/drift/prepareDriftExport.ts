import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

import { flags } from '@/config/flags';
import { buildDriftReportPrTitle } from '@/io/github/prBody';
import type { SinkId } from '@/io/sinks/types';
import type { ContractDocument } from '@/ui/export/types';

export function defaultDriftExportSinks(githubConnected?: boolean): SinkId[] {
   
  if (githubConnected === true && flags.githubOAuth && flags.githubPRSink) {
    return ['download', 'github-pr'];
  }
  return ['download'];
}

export function prepareDriftExport(
  report: DriftReportV1,
  options?: { title?: string; defaultSinks?: SinkId[] },
): {
  document: ContractDocument;
  defaultSinks: SinkId[];
  title: string;
} {
  const document: ContractDocument = {
    kind: 'drift-report',
    payload: report,
  };
  return {
    document: document,
    defaultSinks: options?.defaultSinks ?? defaultDriftExportSinks(),
    title: options?.title ?? buildDriftReportPrTitle(report.summary),
  };
}
