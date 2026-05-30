/**
 * WO-041 call order: scanDependencies → buildSubComponentsFromTree (before prop/binding passes).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildSubComponentsFromTree, scanDependencies } from '@/core/import';

const fixturesDir = resolve(__dirname, 'fixtures');

describe('import pipeline integration', () => {
  it('registered fixture yields subComponents with registryRef', () => {
    const source = readFileSync(resolve(fixturesDir, 'button-with-icon.tsx'), 'utf8');
    const tree = scanDependencies(source, 'components/ui/button.tsx', {
      registryKeys: ['Icon', 'Box'],
    });
    const subComponents = buildSubComponentsFromTree(tree, ['Icon', 'Box']);

    expect(subComponents).toHaveLength(2);
    expect(subComponents[0].registryRef).toBe('Icon');
    expect(subComponents[1].registryRef).toBe('Box');
  });

  it('unknown fixture yields empty subComponents when nothing is registered', () => {
    const source = readFileSync(resolve(fixturesDir, 'button-with-unknown.tsx'), 'utf8');
    const tree = scanDependencies(source, 'components/ui/button.tsx', { registryKeys: [] });
    const subComponents = buildSubComponentsFromTree(tree, []);

    expect(subComponents).toEqual([]);
  });
});
