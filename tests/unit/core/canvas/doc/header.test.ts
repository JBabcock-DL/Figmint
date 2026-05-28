/// <reference types="@figma/plugin-typings" />

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildSectionHeader } from '@/core/canvas/doc/header';
import { DOC_FRAME_WIDTH } from '@/core/canvas/doc/constants';

import {
  asFrameNode,
  asTextNode,
  createMockFrame,
  installMockFigmaCanvas,
  MockFrame,
  MockTextNode,
} from '../__mocks__/figmaFrames';
import {
  DOC_PIPELINE_TEXT_STYLES,
  installDocPipelineVariableMocks,
} from './docPipelineMocks';

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../../fixtures');

function loadButtonSpec(): ComponentSpecV1 {
  const raw = readFileSync(join(FIXTURE_DIR, 'component-spec-button-canonical.json'), 'utf8');
  return JSON.parse(raw) as ComponentSpecV1;
}

function installDocHeaderFigmaMocks(): void {
  installMockFigmaCanvas();

  const globalRecord = globalThis as Record<string, unknown>;
  const figmaApi = globalRecord.figma as Record<string, unknown>;

  figmaApi.getLocalTextStylesAsync = async () => [...DOC_PIPELINE_TEXT_STYLES];

  installDocPipelineVariableMocks(figmaApi);
}

describe('buildSectionHeader', () => {
  beforeEach(() => {
    installDocHeaderFigmaMocks();
  });

  it('emits doc/component/button/header with two text children (snapshot)', async () => {
    const docRoot = createMockFrame({
      name: 'doc/component/button',
      layoutMode: 'VERTICAL',
      width: DOC_FRAME_WIDTH,
    });
    const spec = loadButtonSpec();
    const specWithDoc = {
      ...spec,
      displayTitle: 'Button',
      summary: 'Trigger an action or navigate. Follows shadcn/ui defaults.',
    } satisfies ComponentSpecV1 & { displayTitle: string; summary: string };

    const header = await buildSectionHeader(asFrameNode(docRoot), specWithDoc);
    const headerMock = header as unknown as MockFrame;

    expect(headerMock.name).toBe('doc/component/button/header');
    expect(headerMock.layoutMode).toBe('VERTICAL');
    expect(headerMock.layoutAlign).toBe('STRETCH');
    expect(headerMock.itemSpacing).toBe(12);
    expect(headerMock.fills).toEqual([]);
    expect(headerMock.children).toHaveLength(2);

    const textChildren = headerMock.children.filter((child) => child.type === 'TEXT');
    expect(textChildren).toHaveLength(2);

    const title = textChildren[0] as unknown as MockTextNode;
    const summary = textChildren[1] as unknown as MockTextNode;
    expect(title.characters).toBe('Button');
    expect(summary.characters).toBe('Trigger an action or navigate. Follows shadcn/ui defaults.');

    expect({
      name: headerMock.name,
      childCount: headerMock.children.length,
      childTypes: headerMock.children.map((c) => c.type),
      title: title.characters,
      summary: summary.characters,
    }).toMatchInlineSnapshot(`
      {
        "childCount": 2,
        "childTypes": [
          "TEXT",
          "TEXT",
        ],
        "name": "doc/component/button/header",
        "summary": "Trigger an action or navigate. Follows shadcn/ui defaults.",
        "title": "Button",
      }
    `);
  });

  it('falls back to spec.name and empty summary when doc fields omitted', async () => {
    const docRoot = createMockFrame({ name: 'doc/component/button', layoutMode: 'VERTICAL' });
    const header = await buildSectionHeader(asFrameNode(docRoot), loadButtonSpec());
    const headerMock = header as unknown as MockFrame;
    const title = asTextNode(headerMock.children[0] as unknown as MockTextNode);
    const summary = asTextNode(headerMock.children[1] as unknown as MockTextNode);
    expect(title.characters).toBe('Button');
    expect(summary.characters).toBe('');
  });
});
