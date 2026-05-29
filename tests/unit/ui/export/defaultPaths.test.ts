import type {
  ComponentSpecV1,
  DriftReportV1,
  HandoffContextV1,
  OpsProgramV1,
  RegistryV1,
  TokensV1,
} from '@detroitlabs/fighub-contracts';
import { describe, expect, it } from 'vitest';

import componentSpecFixture from '@/io/formats/__fixtures__/component-spec-button.json';
import driftFixture from '@/io/formats/__fixtures__/drift-report-ac.json';
import handoffFixture from '@/io/formats/__fixtures__/handoff-context-min.json';
import opsFixture from '@/io/formats/__fixtures__/ops-program-bootstrap.json';
import registryFixture from '../../../fixtures/io/sources/registry.json';
import { defaultExportBasename, kebabCase } from '@/ui/export/defaultPaths';
import type { ContractDocument } from '@/ui/export/types';

const fixedNow = new Date(2026, 4, 27, 15, 30, 0);

const componentSpecPayload = Object.assign({}, componentSpecFixture, {
  name: 'Primary Button',
}) as ComponentSpecV1;

const minimalDocs: ContractDocument[] = [
  { kind: 'drift-report', payload: driftFixture as DriftReportV1 },
  { kind: 'handoff-context', payload: handoffFixture as HandoffContextV1 },
  { kind: 'ops-program', payload: opsFixture as OpsProgramV1 },
  { kind: 'component-spec', payload: componentSpecPayload },
  { kind: 'registry', payload: registryFixture as RegistryV1 },
  {
    kind: 'tokens',
    payload: {
      v: 1,
      kind: 'tokens',
      collections: [],
      tokens: [],
    } satisfies TokensV1,
  },
];

describe('defaultExportBasename', () => {
  it.each([
    ['drift-report', 'docs/fighub/drift-2026-05-27'],
    ['handoff-context', 'docs/fighub/handoff-2026-05-27'],
    ['ops-program', 'docs/fighub/ops-2026-05-27'],
    ['component-spec', 'docs/fighub/components/primary-button'],
    ['registry', 'docs/fighub/registry-export'],
    ['tokens', 'docs/fighub/tokens-2026-05-27'],
  ] as const)('returns default basename for %s', function (kind, expected) {
    const doc = minimalDocs.find(function (entry) {
      return entry.kind === kind;
    });
    expect(doc).toBeDefined();
    expect(defaultExportBasename(doc!, fixedNow)).toBe(expected);
  });

  it('kebab-cases component-spec payload name', () => {
    expect(kebabCase('Primary Button')).toBe('primary-button');
    expect(kebabCase('IconButton')).toBe('icon-button');
  });
});
