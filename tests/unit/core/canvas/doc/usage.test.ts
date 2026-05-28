/// <reference types="@figma/plugin-typings" />

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildUsageNotes } from '@/core/canvas/doc/usage';
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

function installUsageFigmaMocks(): void {
  installMockFigmaCanvas();

  const globalRecord = globalThis as Record<string, unknown>;
  const figmaApi = globalRecord.figma as Record<string, unknown>;

  figmaApi.getLocalTextStylesAsync = async () => [...DOC_PIPELINE_TEXT_STYLES];

  installDocPipelineVariableMocks(figmaApi);
}

function findChildFrame(parent: MockFrame, name: string): MockFrame | null {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child.type === 'FRAME' && child.name === name) {
      return child as MockFrame;
    }
  }
  return null;
}

function countBullets(card: MockFrame): number {
  const bullets = findChildFrame(card, 'bullets');
  if (bullets === null) {
    return 0;
  }
  return bullets.children.filter((child) => child.type === 'TEXT').length;
}

describe('buildUsageNotes', () => {
  beforeEach(() => {
    installUsageFigmaMocks();
  });

  it('emits doc/component/button/usage with two Do/Don\'t cards (snapshot)', async () => {
    const docRoot = createMockFrame({
      name: 'doc/component/button',
      layoutMode: 'VERTICAL',
      width: DOC_FRAME_WIDTH,
    });
    const spec = loadButtonSpec();
    const specWithUsage = {
      ...spec,
      usage: {
        do: [
          'Use `default` variant for primary actions.',
          'Use `outline` or `ghost` for secondary actions.',
          'Combine with leading icons for clarity.',
        ],
        dont: [
          "Don't use `link` variant for destructive actions.",
          "Don't stack more than 3 buttons in a row.",
          "Don't override the focus ring.",
        ],
      },
    } satisfies ComponentSpecV1 & {
      usage: { do: string[]; dont: string[] };
    };

    const usage = await buildUsageNotes(asFrameNode(docRoot), specWithUsage);
    const usageMock = usage as unknown as MockFrame;

    expect(usageMock.name).toBe('doc/component/button/usage');
    expect(usageMock.layoutMode).toBe('HORIZONTAL');
    expect(usageMock.layoutAlign).toBe('STRETCH');
    expect(usageMock.itemSpacing).toBe(30);
    expect(usageMock.width).toBe(DOC_FRAME_WIDTH);
    expect(usageMock.children).toHaveLength(2);

    const doCard = findChildFrame(usageMock, 'usage/do');
    const dontCard = findChildFrame(usageMock, 'usage/dont');
    expect(doCard).not.toBeNull();
    expect(dontCard).not.toBeNull();

    expect(doCard!.layoutMode).toBe('VERTICAL');
    expect(doCard!.width).toBe(805);
    expect(doCard!.paddingLeft).toBe(28);
    expect(doCard!.paddingRight).toBe(28);
    expect(doCard!.paddingTop).toBe(28);
    expect(doCard!.paddingBottom).toBe(28);
    expect(doCard!.itemSpacing).toBe(16);
    expect(doCard!.cornerRadius).toBe(16);
    expect(usageMock.height).toBeGreaterThan(2);
    expect(doCard!.height).toBeGreaterThan(2);
    expect(dontCard!.height).toBeGreaterThan(2);

    const doTitle = asTextNode(doCard!.children[0] as unknown as MockTextNode);
    const dontTitle = asTextNode(dontCard!.children[0] as unknown as MockTextNode);
    expect(doTitle.characters).toBe('✓ Do');
    expect(dontTitle.characters).toBe("✕ Don't");
    expect(doTitle.textStyleId).toBe('style-token-name');
    expect(dontTitle.textStyleId).toBe('style-token-name');
    expect(doTitle.layoutSizingVertical).toBe('HUG');
    expect(doTitle.height).toBeGreaterThan(1);

    expect(countBullets(doCard!)).toBeGreaterThanOrEqual(3);
    expect(countBullets(dontCard!)).toBeGreaterThanOrEqual(3);

    expect({
      name: usageMock.name,
      width: usageMock.width,
      childNames: usageMock.children.map((child) => child.name),
      doTitle: doTitle.characters,
      dontTitle: dontTitle.characters,
      doBulletCount: countBullets(doCard!),
      dontBulletCount: countBullets(dontCard!),
    }).toMatchInlineSnapshot(`
      {
        "childNames": [
          "usage/do",
          "usage/dont",
        ],
        "doBulletCount": 3,
        "doTitle": "✓ Do",
        "dontBulletCount": 3,
        "dontTitle": "✕ Don't",
        "name": "doc/component/button/usage",
        "width": 1640,
      }
    `);
  });

  it('renders three TODO placeholders per card when spec.usage is absent', async () => {
    const docRoot = createMockFrame({ name: 'doc/component/button', layoutMode: 'VERTICAL' });
    const usage = await buildUsageNotes(asFrameNode(docRoot), loadButtonSpec());
    const usageMock = usage as unknown as MockFrame;

    const doCard = findChildFrame(usageMock, 'usage/do');
    const dontCard = findChildFrame(usageMock, 'usage/dont');
    expect(doCard).not.toBeNull();
    expect(dontCard).not.toBeNull();
    expect(countBullets(doCard!)).toBe(3);
    expect(countBullets(dontCard!)).toBe(3);

    const bullets = findChildFrame(doCard!, 'bullets');
    expect(bullets).not.toBeNull();
    const firstBullet = asTextNode(bullets!.children[0] as unknown as MockTextNode);
    expect(firstBullet.characters).toBe('· TODO');
    expect(firstBullet.textStyleId).toBe('style-caption');
  });

  it('BUG-S5-001 regression — usage section width is 1640 not 1', async () => {
    const docRoot = createMockFrame({
      name: 'doc/component/button',
      layoutMode: 'VERTICAL',
      width: DOC_FRAME_WIDTH,
    });
    const usage = await buildUsageNotes(asFrameNode(docRoot), loadButtonSpec());
    const usageMock = usage as unknown as MockFrame;
    expect(usageMock.width).toBeGreaterThan(2);
    expect(usageMock.width).toBe(DOC_FRAME_WIDTH);
  });
});
