import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

import { buildDriftReport } from '@/core/drift/report';

import acReport from '../../../../src/io/formats/__fixtures__/drift-report-ac.json';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

describe('drift report schema', () => {
  const schemaPath = join(process.cwd(), 'packages/contracts/dist/drift-report.v1.schema.json');
  const schemaRaw = JSON.parse(readFileSync(schemaPath, 'utf8')) as Record<string, unknown>;
  const schema = Object.assign({}, schemaRaw);
  delete schema.$schema;
  const ajv = new Ajv({ validateSchema: false });
  const validate = ajv.compile(schema);

  it('validates buildDriftReport output against driftReport.v1 schema', () => {
    const sample = acReport as DriftReportV1;
    const variableDrifts = sample.drifts.filter(function (entry) {
      return entry.kind === 'variable';
    });
    const componentDrifts = sample.drifts.filter(function (entry) {
      return entry.kind === 'component';
    });
    const report = buildDriftReport({
      variableDrifts: variableDrifts,
      componentDrifts: componentDrifts,
      meta: sample.meta,
      syncedCount: sample.summary.synced,
    });
    expect(validate(report)).toBe(true);
  });
});
