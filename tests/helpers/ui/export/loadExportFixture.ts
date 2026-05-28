import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  ComponentSpecV1,
  DriftReportV1,
  HandoffContextV1,
  OpsProgramV1,
  RegistryV1,
  TokensV1,
} from '@detroitlabs/figmint-contracts';

import type { ContractDocument } from '@/ui/export/types';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/ui/export',
);

function readFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')) as T;
}

export function loadDriftReportFixture(): ContractDocument {
  return {
    kind: 'drift-report',
    payload: readFixture<DriftReportV1>('drift-report.json'),
  };
}

export function loadHandoffContextFixture(): ContractDocument {
  return {
    kind: 'handoff-context',
    payload: readFixture<HandoffContextV1>('handoff-context.json'),
  };
}

export function loadOpsProgramFixture(): ContractDocument {
  return {
    kind: 'ops-program',
    payload: readFixture<OpsProgramV1>('ops-program.json'),
  };
}

export function loadComponentSpecFixture(): ContractDocument {
  return {
    kind: 'component-spec',
    payload: readFixture<ComponentSpecV1>('component-spec.json'),
  };
}

export function loadRegistryFixture(): ContractDocument {
  return {
    kind: 'registry',
    payload: readFixture<RegistryV1>('registry.json'),
  };
}

export function loadTokensFixture(): ContractDocument {
  return {
    kind: 'tokens',
    payload: readFixture<TokensV1>('tokens.json'),
  };
}

export const ALL_EXPORT_FIXTURES: ContractDocument[] = [
  loadDriftReportFixture(),
  loadHandoffContextFixture(),
  loadOpsProgramFixture(),
  loadComponentSpecFixture(),
  loadRegistryFixture(),
  loadTokensFixture(),
];
