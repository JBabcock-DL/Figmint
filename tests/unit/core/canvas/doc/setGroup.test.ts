/// <reference types="@figma/plugin-typings" />

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import { DASH_PATTERN, DOC_FRAME_WIDTH } from '@/core/canvas/doc/constants';
import { extendComponentSetGroup } from '@/core/canvas/doc/setGroup';
import {
  asComponentSetNode,
  createMockComponentSet,
} from '../../components/scaffold/__mocks__/figmaScaffold';
import { ensureComponentSetGroup } from '@/core/components/scaffold/usageFrame';

import {
  asFrameNode,
  asTextNode,
  createMockFrame,
  installMockFigmaCanvas,
  MockFrame,
  MockTextNode,
} from '../__mocks__/figmaFrames';
import { DOC_PIPELINE_TEXT_STYLES, installDocPipelineVariableMocks } from './docPipelineMocks';

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../../fixtures');

function loadButtonSpec(): ComponentSpecV1 {
  const raw = readFileSync(join(FIXTURE_DIR, 'component-spec-button-canonical.json'), 'utf8');
  return JSON.parse(raw) as ComponentSpecV1;
}

function installSetGroupFigmaMocks(): void {
  installMockFigmaCanvas();

  const globalRecord = globalThis as Record<string, unknown>;
  const figmaApi = globalRecord.figma as Record<string, unknown>;

  figmaApi.getLocalTextStylesAsync = async () => [...DOC_PIPELINE_TEXT_STYLES];

  installDocPipelineVariableMocks(figmaApi);
}

describe('extendComponentSetGroup', () => {
  beforeEach(() => {
    installSetGroupFigmaMocks();
  });

  it('prepends title + caption and styles ComponentSet with WRAP + dashed stroke', async () => {
    const docRoot = createMockFrame({
      name: 'doc/component/button',
      layoutMode: 'VERTICAL',
      width: DOC_FRAME_WIDTH,
    });
    const componentSet = createMockComponentSet();
    componentSet.name = 'Button — ComponentSet';

    const setGroup = ensureComponentSetGroup(
      asFrameNode(docRoot),
      asComponentSetNode(componentSet),
      'button',
    );
    await extendComponentSetGroup(setGroup, asComponentSetNode(componentSet), loadButtonSpec());

    const setGroupMock = setGroup as unknown as MockFrame;
    expect(setGroupMock.name).toBe('doc/component/button/component-set-group');
    expect(setGroupMock.children).toHaveLength(3);

    const title = asTextNode(setGroupMock.children[0] as unknown as MockTextNode);
    const caption = asTextNode(setGroupMock.children[1] as unknown as MockTextNode);
    const setChild = setGroupMock.children[2];

    expect(title.name).toBe('title');
    expect(title.characters).toBe('Component');
    expect(caption.name).toBe('caption');
    expect(caption.characters).toBe('Live ComponentSet — edit here, matrix updates.');
    expect(setChild.type).toBe('COMPONENT_SET');

    expect(componentSet.layoutMode).toBe('HORIZONTAL');
    expect(componentSet.layoutWrap).toBe('WRAP');
    expect(componentSet.primaryAxisSizingMode).toBe('FIXED');
    expect(componentSet.counterAxisSizingMode).toBe('AUTO');
    expect(componentSet.width).toBe(DOC_FRAME_WIDTH);
    expect(componentSet.paddingLeft).toBe(32);
    expect(componentSet.paddingRight).toBe(32);
    expect(componentSet.paddingTop).toBe(32);
    expect(componentSet.paddingBottom).toBe(32);
    expect(componentSet.itemSpacing).toBe(24);
    expect(componentSet.counterAxisSpacing).toBe(24);
    expect(componentSet.cornerRadius).toBe(16);
    expect(componentSet.strokeWeight).toBe(1);
    expect(componentSet.dashPattern).toEqual([...DASH_PATTERN]);
    expect(componentSet.strokes.length).toBeGreaterThan(0);

    expect({
      childCount: setGroupMock.children.length,
      childTypes: setGroupMock.children.map((c) => c.type),
      title: title.characters,
      caption: caption.characters,
      layoutWrap: componentSet.layoutWrap,
      dashPattern: componentSet.dashPattern,
    }).toMatchInlineSnapshot(`
      {
        "caption": "Live ComponentSet — edit here, matrix updates.",
        "childCount": 3,
        "childTypes": [
          "TEXT",
          "TEXT",
          "COMPONENT_SET",
        ],
        "dashPattern": [
          6,
          4,
        ],
        "layoutWrap": "WRAP",
        "title": "Component",
      }
    `);
  });
});
