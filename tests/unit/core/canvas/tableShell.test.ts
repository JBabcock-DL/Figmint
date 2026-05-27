import { beforeEach, describe, expect, it } from 'vitest';

import { getColumnSpec } from '@/core/canvas/helpers/columnSpec';
import {
  createEmptyBody,
  createHeaderRow,
  createTableGroup,
  createTableRoot,
} from '@/core/canvas/helpers/tableShell';
import { TABLE_WIDTH } from '@/core/canvas/constants';

import { installMockFigmaCanvas, MockFrame } from './__mocks__/figmaFrames';

describe('tableShell', () => {
  beforeEach(() => {
    installMockFigmaCanvas();
  });

  it('builds shell hierarchy names per 08-hierarchy', () => {
    const slug = 'primitives/color/primary';
    const group = createTableGroup(slug);
    expect(group.name).toBe(`doc/table-group/${slug}`);

    const table = createTableRoot(slug);
    expect(table.name).toBe(`doc/table/${slug}`);
    expect((table as unknown as MockFrame).width).toBe(TABLE_WIDTH);

    const columns = getColumnSpec('primitives/color-ramp');
    const header = createHeaderRow(table, columns);
    expect(header.name).toBe('header');
    expect(header.children.length).toBe(columns.length);
    expect(header.children[0].name).toBe('header/cell/TOKEN');

    const body = createEmptyBody(table);
    expect(body.name).toBe('body');
    expect((body as unknown as MockFrame).fills).toEqual([]);

    group.appendChild(table);
    expect(table.children.map((child) => child.name)).toEqual(['header', 'body']);
  });
});
