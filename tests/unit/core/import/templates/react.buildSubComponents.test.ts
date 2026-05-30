import { describe, expect, it } from 'vitest';

import { buildSubComponents } from '@/core/import/templates/react/buildSubComponents';
import { scanDependencies } from '@/core/import';

describe('buildSubComponents', () => {
  it('maps registered dependency nodes to subComponents', () => {
    const source = `
import { Icon } from './icon';
export function Button() {
  return <Icon />;
}
`;
    const tree = scanDependencies(source, 'components/ui/button.tsx', { registryKeys: ['icon'] });
    const subComponents = buildSubComponents(tree, ['icon']);
    expect(subComponents).toHaveLength(1);
    expect(subComponents[0]).toEqual({ name: 'Icon', registryRef: 'icon' });
  });
});
