import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { applyBindings } from '@/core/components/scaffold/applyBindings';
import type { VariablePathMap } from '@/core/canvas/lib/variables';

import chipSpec from '../../../../fixtures/components/button-chip-bindings.v1.json';
import variableMapFixture from '../../../../fixtures/components/variable-map-minimal.json';
import { buildMockVariantTree } from '../../../../helpers/scaffold/mockVariantTree';
import { installMockFigmaCanvas } from '../../canvas/__mocks__/figmaFrames';

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

describe('applyBindings', () => {
  beforeEach(() => {
    installMockFigmaCanvas();
    const globalRecord = globalThis as Record<string, unknown>;
    const figmaApi = globalRecord.figma as {
      loadFontAsync: (font: FontName) => Promise<void>;
      getLocalTextStylesAsync: () => Promise<TextStyle[]>;
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
  });

  it('applies all bindings across every variant', async () => {
    const spec = chipSpec as ComponentSpecV1;
    const { componentSet } = buildMockVariantTree(2);
    const variableMap = buildVariableMap();

    const result = await applyBindings(spec, componentSet as unknown as ComponentSetNode, {
      variableMap: variableMap,
    });

    expect(result.failed).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.applied).toBe(spec.bindings.length * 2);
  });

  it('records missing-variable when map entry is absent', async () => {
    const spec = chipSpec as ComponentSpecV1;
    const { componentSet } = buildMockVariantTree(1);
    const variableMap = buildVariableMap();
    delete variableMap['color/primary/default'];

    const result = await applyBindings(spec, componentSet as unknown as ComponentSetNode, {
      variableMap: variableMap,
    });

    expect(result.passed).toBe(false);
    const missing = result.failed.filter((entry) => entry.reason === 'missing-variable');
    expect(missing.length).toBeGreaterThan(0);
    expect(missing[0].diagnostic).toContain('root.fill');
    expect(missing[0].diagnostic).toContain('color/primary/default');
  });

  it('records missing-node when layer name drifts', async () => {
    const spec = chipSpec as ComponentSpecV1;
    const { componentSet, variants } = buildMockVariantTree(1);
    const labelChild = variants[0].children.find((child) => child.name === 'text/label');
    if (labelChild !== undefined) {
      labelChild.name = 'text/missing';
    }
    const variableMap = buildVariableMap();

    const result = await applyBindings(spec, componentSet as unknown as ComponentSetNode, {
      variableMap: variableMap,
    });

    expect(result.passed).toBe(false);
    const missingNode = result.failed.find((entry) => entry.reason === 'missing-node');
    expect(missingNode).toBeDefined();
    expect(missingNode?.selector).toContain('text/label');
  });
});
