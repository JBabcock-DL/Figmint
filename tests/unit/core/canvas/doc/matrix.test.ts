/// <reference types="@figma/plugin-typings" />

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildMatrix } from '@/core/canvas/doc/matrix';
import { DOC_FRAME_WIDTH, STATE_OPACITY } from '@/core/canvas/doc/constants';
import { formatVariantName } from '@/core/components/scaffold/variantMatrix';

import {
  asComponentNode,
  createMockComponent,
  createMockComponentSet,
} from '../../components/scaffold/__mocks__/figmaScaffold';
import {
  asFrameNode,
  createMockFrame,
  installMockFigmaCanvas,
  MockFrame,
} from '../__mocks__/figmaFrames';
import { DOC_PIPELINE_TEXT_STYLES, installDocPipelineVariableMocks } from './docPipelineMocks';

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../../fixtures');

type MockInstanceWithOpacity = MockFrame & {
  readonly type: 'INSTANCE';
  opacity: number;
  setProperties(props: Record<string, string | number | boolean>): void;
};

function loadButtonSpec(): ComponentSpecV1 {
  const raw = readFileSync(join(FIXTURE_DIR, 'component-spec-button-canonical.json'), 'utf8');
  return JSON.parse(raw) as ComponentSpecV1;
}

function createMockInstanceWithOpacity(): MockInstanceWithOpacity {
  const frame = createMockFrame(undefined, false);
  Object.defineProperty(frame, 'type', { value: 'INSTANCE' });
  const inst = frame as unknown as MockInstanceWithOpacity;
  inst.opacity = 1;
  inst.setProperties = function setProperties(
    _props: Record<string, string | number | boolean>,
  ): void {
    /* mock */
  };
  return inst;
}

function buildButtonVariantByKey(spec: ComponentSpecV1): Record<string, ComponentNode> {
  const variants = spec.variantMatrix.variant as string[];
  const sizes = spec.variantMatrix.size as string[];
  const map: Record<string, ComponentNode> = {};

  for (let vi = 0; vi < variants.length; vi++) {
    const variant = variants[vi];
    for (let si = 0; si < sizes.length; si++) {
      const size = sizes[si];
      const key = formatVariantName({ variant, size });
      const component = createMockComponent({ name: key });
      component.createInstance = () => createMockInstanceWithOpacity() as unknown as InstanceNode;
      map[key] = asComponentNode(component);
    }
  }
  return map;
}

function installMatrixFigmaMocks(): void {
  installMockFigmaCanvas();

  const globalRecord = globalThis as Record<string, unknown>;
  const figmaApi = globalRecord.figma as Record<string, unknown>;

  figmaApi.getLocalTextStylesAsync = async () => [...DOC_PIPELINE_TEXT_STYLES];

  installDocPipelineVariableMocks(figmaApi);
}

function findMatrixCell(
  matrixGroup: MockFrame,
  size: string,
  variant: string,
  state: string,
): MockFrame | null {
  const sizeGroups = matrixGroup.findAll(
    (node) => node.name === `matrix/size-group/${size}`,
  ) as MockFrame[];
  if (sizeGroups.length === 0) {
    return null;
  }
  const rows = sizeGroups[0].findAll((node) => node.name === `row/${variant}`) as MockFrame[];
  if (rows.length === 0) {
    return null;
  }
  const cells = rows[0].findAll((node) => node.name === `cell/${variant}/${state}`) as MockFrame[];
  return cells.length > 0 ? cells[0] : null;
}

function cellInstanceOpacity(
  matrixGroup: MockFrame,
  size: string,
  variant: string,
  state: string,
): number | null {
  const cell = findMatrixCell(matrixGroup, size, variant, state);
  if (cell === null) {
    return null;
  }
  const instance = cell.children.find((child) => child.type === 'INSTANCE') as
    | MockInstanceWithOpacity
    | undefined;
  return instance !== undefined ? instance.opacity : null;
}

describe('buildMatrix', () => {
  beforeEach(() => {
    installMatrixFigmaMocks();
  });

  it('emits matrix-group with 96 instances (snapshot)', async () => {
    const spec = loadButtonSpec();
    const docRoot = createMockFrame({
      name: 'doc/component/button',
      layoutMode: 'VERTICAL',
      width: DOC_FRAME_WIDTH,
    });
    const componentSet = createMockComponentSet();
    const variantByKey = buildButtonVariantByKey(spec);

    const matrixGroup = await buildMatrix(asFrameNode(docRoot), spec, componentSet, variantByKey);
    const matrixGroupMock = matrixGroup as unknown as MockFrame;

    expect(matrixGroupMock.name).toBe('doc/component/button/matrix-group');
    expect(matrixGroupMock.fills[0]).toMatchObject({
      boundVariables: { color: { id: 'mock-var' } },
    });
    expect(matrixGroupMock.children.length).toBeGreaterThanOrEqual(2);

    const title = matrixGroupMock.children[0] as { characters?: string; height?: number };
    expect(title.characters).toBe('Variants × States');
    expect(title.height ?? 0).toBeGreaterThan(1);

    const matrix = matrixGroupMock.children[1] as unknown as MockFrame;
    expect(matrix.name).toBe('doc/component/button/matrix');
    expect(matrix.fills).toEqual([]);
    expect(matrix.cornerRadius).toBe(16);
    expect(matrix.dashPattern).toEqual([6, 4]);

    const instances = matrixGroupMock.findAll((node) => node.type === 'INSTANCE');
    expect(instances).toHaveLength(96);

    expect({
      name: matrixGroupMock.name,
      innerMatrix: matrix.name,
      instanceCount: instances.length,
      sizeGroups: matrix.findAll((node) => node.name.startsWith('matrix/size-group/')).length,
    }).toMatchInlineSnapshot(`
      {
        "innerMatrix": "doc/component/button/matrix",
        "instanceCount": 96,
        "name": "doc/component/button/matrix-group",
        "sizeGroups": 4,
      }
    `);
  });

  it('SPK-S5-DOC-1.F — applies per-cell opacity overrides', async () => {
    const spec = loadButtonSpec();
    const docRoot = createMockFrame({ name: 'doc/component/button', layoutMode: 'VERTICAL' });
    const componentSet = createMockComponentSet();
    const variantByKey = buildButtonVariantByKey(spec);

    const matrixGroup = await buildMatrix(asFrameNode(docRoot), spec, componentSet, variantByKey);
    const matrixGroupMock = matrixGroup as unknown as MockFrame;

    expect(cellInstanceOpacity(matrixGroupMock, 'default', 'default', 'default')).toBe(1);
    expect(cellInstanceOpacity(matrixGroupMock, 'default', 'default', 'hover')).toBe(
      STATE_OPACITY.hover,
    );
    expect(cellInstanceOpacity(matrixGroupMock, 'lg', 'destructive', 'pressed')).toBe(
      STATE_OPACITY.pressed,
    );
    expect(cellInstanceOpacity(matrixGroupMock, 'sm', 'ghost', 'disabled')).toBe(
      STATE_OPACITY.disabled,
    );
  });

  it('omits bottom stroke on the last variant row of the last size group', async () => {
    const spec = loadButtonSpec();
    const docRoot = createMockFrame({ name: 'doc/component/button', layoutMode: 'VERTICAL' });
    const componentSet = createMockComponentSet();
    const variantByKey = buildButtonVariantByKey(spec);

    const matrixGroup = await buildMatrix(asFrameNode(docRoot), spec, componentSet, variantByKey);
    const matrixGroupMock = matrixGroup as unknown as MockFrame;

    const lastSize = 'icon';
    const lastVariant = 'link';
    const lastRow = findMatrixCell(matrixGroupMock, lastSize, lastVariant, 'default')?.parent as
      | MockFrame
      | undefined;
    expect(lastRow).toBeDefined();
    expect(lastRow?.strokeBottomWeight ?? 0).toBe(0);

    const priorRow = findMatrixCell(matrixGroupMock, lastSize, 'ghost', 'default')?.parent as
      | MockFrame
      | undefined;
    expect(priorRow).toBeDefined();
    expect(priorRow?.strokeBottomWeight ?? 0).toBe(1);
  });
});
