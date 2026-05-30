import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { scanDependencies, treeHasUnknown } from '@/core/import';

const fixturesDir = resolve(__dirname, 'fixtures');

function readFixture(name: string): string {
  return readFileSync(resolve(fixturesDir, name), 'utf8');
}

describe('dependencyScanner', () => {
  it('button-with-icon: Icon and Box registered with relative import paths', () => {
    const sourcePath = 'components/ui/button.tsx';
    const tree = scanDependencies(readFixture('button-with-icon.tsx'), sourcePath, {
      registryKeys: ['Icon', 'Box'],
    });

    expect(tree.rootImportPath).toBe(sourcePath);
    expect(tree.nodes).toHaveLength(2);

    const icon = tree.nodes.find(function (n) {
      return n.name === 'Icon';
    });
    const box = tree.nodes.find(function (n) {
      return n.name === 'Box';
    });

    expect(icon).toMatchObject({ status: 'registered', importPath: './icon', children: [] });
    expect(box).toMatchObject({ status: 'registered', importPath: '../box', children: [] });
  });

  it('button-with-unknown: flags Missing as unknown', () => {
    const tree = scanDependencies(
      readFixture('button-with-unknown.tsx'),
      'components/ui/button.tsx',
      {
        registryKeys: ['Icon'],
      },
    );

    const missing = tree.nodes.find(function (n) {
      return n.name === 'Missing';
    });
    expect(missing).toMatchObject({ status: 'unknown', importPath: './missing' });
    expect(treeHasUnknown(tree)).toBe(true);
  });

  it('circular-a: detects circular dependency with siblingSources', () => {
    const sourcePath = 'tests/unit/core/import/shared/fixtures/circular-a.tsx';
    const tree = scanDependencies(readFixture('circular-a.tsx'), sourcePath, {
      registryKeys: [],
      siblingSources: {
        'tests/unit/core/import/shared/fixtures/circular-b': readFixture('circular-b.tsx'),
      },
    });

    const nodeB = tree.nodes.find(function (n) {
      return n.name === 'B';
    });
    expect(nodeB).toMatchObject({ status: 'circular', importPath: './circular-b' });
  });

  it('self-import: marks self reference circular without siblings', () => {
    const sourcePath = 'tests/unit/core/import/shared/fixtures/self-import.tsx';
    const tree = scanDependencies(readFixture('self-import.tsx'), sourcePath, {
      registryKeys: [],
    });

    const selfNode = tree.nodes.find(function (n) {
      return n.name === 'Self';
    });
    expect(selfNode).toMatchObject({ status: 'circular', importPath: './self-import' });
  });
});
