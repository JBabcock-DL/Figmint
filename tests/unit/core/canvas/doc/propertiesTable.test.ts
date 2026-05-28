/// <reference types="@figma/plugin-typings" />

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildPropertiesTable,
  orderPropsForDocTable,
  PROPERTIES_TABLE_COLUMNS,
} from '@/core/canvas/doc/propertiesTable';
import { DOC_FRAME_WIDTH } from '@/core/canvas/doc/constants';

import {
  asFrameNode,
  createMockFrame,
  installMockFigmaCanvas,
  MockFrame,
} from '../__mocks__/figmaFrames';
import { DOC_PIPELINE_TEXT_STYLES, installDocPipelineVariableMocks } from './docPipelineMocks';

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../../fixtures');

function loadButtonSpec(): ComponentSpecV1 {
  const raw = readFileSync(join(FIXTURE_DIR, 'component-spec-button-canonical.json'), 'utf8');
  return JSON.parse(raw) as ComponentSpecV1;
}

function findChildByName(root: MockFrame, name: string): MockFrame | undefined {
  const queue: MockFrame[] = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) {
      break;
    }
    if (node.name === name) {
      return node;
    }
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.type === 'FRAME') {
        queue.push(child as unknown as MockFrame);
      }
    }
  }
  return undefined;
}

function installPropertiesTableFigmaMocks(): void {
  installMockFigmaCanvas();

  const globalRecord = globalThis as Record<string, unknown>;
  const figmaApi = globalRecord.figma as Record<string, unknown>;

  figmaApi.getLocalTextStylesAsync = async () => [...DOC_PIPELINE_TEXT_STYLES];

  installDocPipelineVariableMocks(figmaApi);
}

describe('orderPropsForDocTable', () => {
  it('orders Button props per §4 and excludes loading', () => {
    const ordered = orderPropsForDocTable(loadButtonSpec());
    expect(ordered.map((p) => p.name)).toEqual([
      'variant',
      'size',
      'disabled',
      'asChild',
      'type',
      'className',
    ]);
  });
});

describe('buildPropertiesTable', () => {
  beforeEach(() => {
    installPropertiesTableFigmaMocks();
  });

  it('emits doc/table-group/button/properties with 5 column widths and 7 table rows', async () => {
    const docRoot = createMockFrame({
      name: 'doc/component/button',
      layoutMode: 'VERTICAL',
      width: DOC_FRAME_WIDTH,
    });
    const spec = loadButtonSpec();

    const group = await buildPropertiesTable(asFrameNode(docRoot), spec);
    const groupMock = group as unknown as MockFrame;

    expect(groupMock.name).toBe('doc/table-group/button/properties');

    const table = findChildByName(groupMock, 'doc/table/button/properties');
    expect(table).toBeDefined();
    expect(table?.width).toBe(DOC_FRAME_WIDTH);

    const columnSum = PROPERTIES_TABLE_COLUMNS.reduce((sum, col) => sum + col.width, 0);
    expect(columnSum).toBe(1640);
    expect(PROPERTIES_TABLE_COLUMNS.map((c) => c.width)).toEqual([240, 380, 160, 120, 740]);

    const tableRows = table?.children.filter((c) => c.type === 'FRAME') ?? [];
    expect(tableRows).toHaveLength(7);

    const header = tableRows[0] as unknown as MockFrame;
    expect(header.name).toBe('header');
    expect(header.layoutMode).toBe('HORIZONTAL');
    const headerCells = header.children.filter((c) => c.type === 'FRAME');
    expect(headerCells).toHaveLength(5);
    expect((headerCells[0] as unknown as MockFrame).width).toBe(240);
    expect((headerCells[1] as unknown as MockFrame).width).toBe(380);
    expect((headerCells[2] as unknown as MockFrame).width).toBe(160);
    expect((headerCells[3] as unknown as MockFrame).width).toBe(120);
    expect((headerCells[4] as unknown as MockFrame).width).toBe(740);

    const bodyRowNames = tableRows.slice(1).map((r) => (r as unknown as MockFrame).name);
    expect(bodyRowNames).toEqual([
      'row/prop/variant',
      'row/prop/size',
      'row/prop/disabled',
      'row/prop/asChild',
      'row/prop/type',
      'row/prop/className',
    ]);

    const variantRow = tableRows[1] as unknown as MockFrame;
    expect(variantRow.minHeight).toBe(64);
    expect(variantRow.paddingTop).toBe(16);
    expect(variantRow.paddingBottom).toBe(16);
    expect(variantRow.counterAxisAlignItems).toBe('CENTER');
  });
});
