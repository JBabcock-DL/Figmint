import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

import driftPayload from '../../../tests/fixtures/ui/export/drift-report.json';

import type { ContractDocument } from './types';

/** Sample drift report for Export tab sandbox (WO-020 Step 13). */
export const sampleDriftReportDocument: ContractDocument = {
  kind: 'drift-report',
  payload: driftPayload as DriftReportV1,
};
