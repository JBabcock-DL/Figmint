import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

import type { LoadedDocument } from '@/io/sources/types';

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/io/sinks/drift-report-sample.v1.json',
);

export function loadDriftSampleDoc(): LoadedDocument<DriftReportV1> {
  const payload = JSON.parse(readFileSync(fixturePath, 'utf8')) as DriftReportV1;
  return {
    kind: 'drift-report',
    payload: payload,
    sourceMeta: {
      port: 'paste',
      receivedAt: '2026-05-27T12:00:00.000Z',
      charLength: 0,
    },
    rawSnippet: '{}',
  };
}
