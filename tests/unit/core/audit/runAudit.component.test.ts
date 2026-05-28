import { beforeEach, describe, expect, it } from 'vitest';

import { runAudit } from '@/core/audit/runAudit';

import chipSpec from '../../../fixtures/components/button-chip-bindings.v1.json';
import { buildMockVariantTree } from '../../../helpers/scaffold/mockVariantTree';
import { installMockFigmaCanvas } from '../canvas/__mocks__/figmaFrames';

describe('runAudit component scope', () => {
  beforeEach(() => {
    installMockFigmaCanvas();
    const globalRecord = globalThis as Record<string, unknown>;
    (globalRecord.figma as { mixed: symbol }).mixed = Symbol('mixed');
  });
  it('returns apply-bindings report shape', async () => {
    const { componentSet } = buildMockVariantTree(1);
    const audit = await runAudit('component', {
      spec: chipSpec as import('@detroitlabs/fighub-contracts').ComponentSpecV1,
      componentSet: componentSet as unknown as ComponentSetNode,
      bindingsResult: { applied: 11, failed: [], passed: true },
    });

    expect(audit.meta.scope).toBe('component');
    expect(audit.meta.operation).toBe('apply-bindings');
    expect(audit.results.length).toBe(4);
    expect(audit.results.map((entry) => entry.ruleId)).toEqual([
      'comp/bindings-all-applied',
      'comp/binding-variable-resolved',
      'comp/binding-node-resolved',
      'comp/binding-verified',
    ]);
  });
});
