import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildSubComponentsFromTree, scanDependencies } from '@/core/import';

describe('buildSubComponentsFromTree', () => {
  it('returns registered subComponents with registryRef for button-with-icon', () => {
    const source = readFileSync(resolve(__dirname, 'fixtures/button-with-icon.tsx'), 'utf8');
    const tree = scanDependencies(source, 'components/ui/button.tsx', {
      registryKeys: ['Icon', 'Box'],
    });
    const subComponents = buildSubComponentsFromTree(tree, ['Icon', 'Box']);

    expect(subComponents).toHaveLength(2);
    expect(subComponents).toEqual([
      { name: 'Icon', registryRef: 'Icon' },
      { name: 'Box', registryRef: 'Box' },
    ]);
  });
});
