import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { runAudit } from '@/core/audit/runAudit';
import { applyBindings } from '@/core/components/scaffold/applyBindings';
import type { ApplyBindingsResult } from '@/core/components/scaffold/types';
import type { VariablePathMap } from '@/core/canvas/lib/variables';

import chipSpec from '../../../../fixtures/components/button-chip-bindings.v1.json';
import variableMapFixture from '../../../../fixtures/components/variable-map-minimal.json';
import { buildMockVariantTree } from '../../../../helpers/scaffold/mockVariantTree';
import { installMockFigmaCanvas } from '../../../../unit/core/canvas/__mocks__/figmaFrames';

function buildVariableMap(): VariablePathMap {
  const map: VariablePathMap = {};
  const entries = variableMapFixture as Record<
    string,
    { name: string; resolvedType: 'COLOR' | 'FLOAT' }
  >;
  const keys = Object.keys(entries);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const meta = entries[key];
    map[key] = {
      id: 'var-' + key.replace(/\//g, '-'),
      name: meta.name,
      resolvedType: meta.resolvedType,
    } as Variable;
  }
  return map;
}

describe('applyBindings integration', () => {
  beforeEach(() => {
    installMockFigmaCanvas();
    const globalRecord = globalThis as Record<string, unknown>;
    const figmaApi = globalRecord.figma as {
      loadFontAsync: (font: FontName) => Promise<void>;
      getLocalTextStylesAsync: () => Promise<TextStyle[]>;
      mixed: symbol;
      variables: { setBoundVariableForPaint: (paint: SolidPaint) => SolidPaint };
    };
    figmaApi.loadFontAsync = async () => undefined;
    figmaApi.getLocalTextStylesAsync = async () => [
      {
        id: 'style-label-md',
        name: 'Label/MD',
        fontName: { family: 'Inter', style: 'Regular' },
      } as TextStyle,
    ];
    figmaApi.mixed = Symbol('mixed');
  });

  it('binds chip fixture across variants with zero failures', async () => {
    const spec = chipSpec as ComponentSpecV1;
    const { componentSet } = buildMockVariantTree(2);
    const variableMap = buildVariableMap();

    const result = await applyBindings(spec, componentSet as unknown as ComponentSetNode, {
      variableMap: variableMap,
    });

    expect(result.passed).toBe(true);
    expect(result.failed.length).toBe(0);
    expect(result.applied).toBeGreaterThanOrEqual(20);
  });

  it('audit fails comp/binding-variable-resolved when variable is missing', async () => {
    const spec = chipSpec as ComponentSpecV1;
    const { componentSet } = buildMockVariantTree(1);
    const failedResult: ApplyBindingsResult = {
      applied: 0,
      passed: false,
      failed: [
        {
          selector: 'root.fill',
          variable: 'color/primary/default',
          reason: 'missing-variable',
          diagnostic: 'Missing variable: color/primary/default (selector root.fill)',
        },
      ],
    };

    const audit = await runAudit('component', {
      spec: spec,
      componentSet: componentSet as unknown as ComponentSetNode,
      bindingsResult: failedResult,
    });

    expect(audit.passed).toBe(false);
    const rule = audit.results.find((entry) => entry.ruleId === 'comp/binding-variable-resolved');
    expect(rule?.pass).toBe(false);
    expect(rule?.diagnostic).toContain('root.fill');
    expect(rule?.diagnostic).toContain('color/primary/default');
  });
});
