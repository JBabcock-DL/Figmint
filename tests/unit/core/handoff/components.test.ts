/**
 * WO-035 component enumeration tests
 *
 * Wrong vs correct:
 * - MCP get_code_connect_map from plugin → getDevResourcesAsync on main component
 * - Aggregate by instance node name → aggregate by component set name
 * - Emit codeConnectUrl: null → omit property
 * - Walk only direct children → full subtree DFS
 */
/// <reference types="@figma/plugin-typings" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { enumerateComponents } from '@/core/handoff/components';

import {
  createMockComponent,
  createMockComponentSet,
  createMockContainer,
  createMockInstance,
  stubDevResources,
} from '../../../mocks/handoffFigma';

const BUTTON_SPEC = JSON.parse(
  readFileSync(resolve(__dirname, '../../../fixtures/component-spec-button-canonical.json'), 'utf8'),
) as { name: string };

function buildButtonVariant(name: string, componentSet: ComponentSetNode): ComponentNode {
  return createMockComponent({
    id: 'component-' + name,
    name: name,
    parent: componentSet,
  });
}

describe('enumerateComponents', () => {
  it('returns an empty list for a frame with no instances', async () => {
    const frame = createMockContainer({ id: '1:1', name: 'Empty', type: 'FRAME' });
    await expect(enumerateComponents(frame)).resolves.toEqual([]);
  });

  it('aggregates 4 Button + 2 Card instances sorted by name', async () => {
    const buttonSet = createMockComponentSet('Button', []);
    const buttonMain = buildButtonVariant('Default', buttonSet);
    buttonSet.children = [buttonMain];

    const cardMain = createMockComponent({ id: 'component-card', name: 'Card' });

    const instances: InstanceNode[] = [];
    for (let i = 0; i < 4; i++) {
      instances.push(
        createMockInstance({ id: 'button-' + String(i), mainComponent: buttonMain }),
      );
    }
    for (let i = 0; i < 2; i++) {
      instances.push(createMockInstance({ id: 'card-' + String(i), mainComponent: cardMain }));
    }

    const frame = createMockContainer({
      id: '1:1',
      name: 'Screen',
      type: 'FRAME',
      children: instances as unknown as SceneNode[],
    });

    const usages = await enumerateComponents(frame);
    expect(usages).toEqual([
      { name: 'Button', instances: 4 },
      { name: 'Card', instances: 2 },
    ]);
  });

  it('aggregates by component set name instead of variant component name', async () => {
    const componentSet = createMockComponentSet('Button', []);
    const defaultVariant = buildButtonVariant('Default', componentSet);
    const destructiveVariant = buildButtonVariant('Destructive', componentSet);
    componentSet.children = [defaultVariant, destructiveVariant];

    const frame = createMockContainer({
      id: '1:1',
      name: 'Variants',
      type: 'FRAME',
      children: [
        createMockInstance({ id: '1:2', mainComponent: defaultVariant }),
        createMockInstance({ id: '1:3', mainComponent: destructiveVariant }),
      ] as unknown as SceneNode[],
    });

    const usages = await enumerateComponents(frame);
    expect(usages).toEqual([{ name: 'Button', instances: 2 }]);
  });

  it('counts nested instances anywhere in the subtree', async () => {
    const buttonSet = createMockComponentSet('Button', []);
    const buttonMain = buildButtonVariant('Default', buttonSet);
    buttonSet.children = [buttonMain];

    const cardSet = createMockComponentSet('Card', []);
    const cardMain = buildButtonVariant('Card Body', cardSet);
    cardSet.children = [cardMain];

    const nestedButton = createMockInstance({ id: '3:1', mainComponent: buttonMain });
    const cardInstance = createMockInstance({
      id: '2:1',
      mainComponent: cardMain,
      name: 'Card',
    });
    const cardFrame = createMockContainer({
      id: '2:0',
      name: 'Card Frame',
      type: 'FRAME',
      children: [nestedButton as unknown as SceneNode],
    });

    const frame = createMockContainer({
      id: '1:1',
      name: 'Screen',
      type: 'FRAME',
      children: [cardInstance as unknown as SceneNode, cardFrame],
    });

    const usages = await enumerateComponents(frame);
    expect(usages).toEqual([
      { name: 'Button', instances: 1 },
      { name: 'Card', instances: 1 },
    ]);
  });

  it('excludes detached instances from counts', async () => {
    const main = createMockComponent({ id: 'component-1', name: 'Button' });
    const frame = createMockContainer({
      id: '1:1',
      name: 'Screen',
      type: 'FRAME',
      children: [
        createMockInstance({ id: '1:2', mainComponent: main }),
        createMockInstance({ id: '1:3', mainComponent: main, detached: true }),
      ] as unknown as SceneNode[],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(function () {
      return undefined;
    });
    const usages = await enumerateComponents(frame);
    logSpy.mockRestore();

    expect(usages).toEqual([{ name: 'Button', instances: 1 }]);
  });

  it('resolves remote mains via getMainComponentAsync', async () => {
    const remoteMain = createMockComponent({ id: 'remote:1', name: 'Remote Button' });
    const frame = createMockContainer({
      id: '1:1',
      name: 'Screen',
      type: 'FRAME',
      children: [
        createMockInstance({
          id: '1:2',
          mainComponent: null,
          getMainComponentAsync: vi.fn(function () {
            return Promise.resolve(remoteMain);
          }),
        }),
      ] as unknown as SceneNode[],
    });

    const usages = await enumerateComponents(frame);
    expect(usages).toEqual([{ name: 'Remote Button', instances: 1 }]);
  });

  it('includes codeConnectUrl from GitHub dev resources', async () => {
    const main = createMockComponent({ id: 'component-1', name: 'Button' });
    stubDevResources(main, [
      'http://example.com/not-preferred',
      'https://github.com/org/repo/blob/main/button.tsx',
    ]);

    const frame = createMockContainer({
      id: '1:1',
      name: 'Screen',
      type: 'FRAME',
      children: [createMockInstance({ id: '1:2', mainComponent: main })] as unknown as SceneNode[],
    });

    const usages = await enumerateComponents(frame);
    expect(usages[0].codeConnectUrl).toBe('https://github.com/org/repo/blob/main/button.tsx');
  });

  it('omits codeConnectUrl when no dev resources are mapped', async () => {
    const main = createMockComponent({ id: 'component-1', name: 'Button' });
    const frame = createMockContainer({
      id: '1:1',
      name: 'Screen',
      type: 'FRAME',
      children: [createMockInstance({ id: '1:2', mainComponent: main })] as unknown as SceneNode[],
    });

    const usages = await enumerateComponents(frame);
    expect(Object.prototype.hasOwnProperty.call(usages[0], 'codeConnectUrl')).toBe(false);
    expect(JSON.stringify(usages[0])).not.toContain('codeConnectUrl');
  });

  it('matches fixture component name for canonical Button spec hierarchy', async () => {
    const buttonSet = createMockComponentSet(BUTTON_SPEC.name, []);
    const buttonMain = buildButtonVariant('Default', buttonSet);
    buttonSet.children = [buttonMain];

    const frame = createMockContainer({
      id: '1:1',
      name: 'Button Usage Frame',
      type: 'FRAME',
      children: [
        createMockInstance({ id: '1:2', mainComponent: buttonMain, name: 'Button / Default' }),
        createMockInstance({ id: '1:3', mainComponent: buttonMain, name: 'Button / Outline' }),
      ] as unknown as SceneNode[],
    });

    const usages = await enumerateComponents(frame);
    expect(usages.some(function (row) {
      return row.name === BUTTON_SPEC.name && row.instances >= 1;
    })).toBe(true);
  });

  it('completes 200-instance trees under 200ms with cached dev resources', async () => {
    const buttonSet = createMockComponentSet('Button', []);
    const buttonMain = buildButtonVariant('Default', buttonSet);
    buttonSet.children = [buttonMain];
    stubDevResources(buttonMain, ['https://github.com/org/repo/blob/main/button.tsx']);

    const instances: InstanceNode[] = [];
    for (let i = 0; i < 200; i++) {
      instances.push(
        createMockInstance({ id: 'instance-' + String(i), mainComponent: buttonMain }),
      );
    }

    const frame = createMockContainer({
      id: '1:1',
      name: 'Perf Frame',
      type: 'FRAME',
      children: instances as unknown as SceneNode[],
    });

    const startMs = Date.now();
    const usages = await enumerateComponents(frame, { cacheDevResources: true });
    const elapsedMs = Date.now() - startMs;

    expect(usages).toEqual([
      {
        name: 'Button',
        instances: 200,
        codeConnectUrl: 'https://github.com/org/repo/blob/main/button.tsx',
      },
    ]);
    expect(elapsedMs).toBeLessThan(200);
  });
});
