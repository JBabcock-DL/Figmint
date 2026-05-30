import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { DependencyTree } from '@/core/import/shared/types';
import {
  DependencyTreePanel,
  treeHasBlockingUnknowns,
} from '@/ui/components/import/DependencyTreePanel';

const registeredTree: DependencyTree = {
  rootImportPath: 'button.tsx',
  nodes: [{ name: 'Icon', importPath: './icon', status: 'registered', children: [] }],
};

const unknownTree: DependencyTree = {
  rootImportPath: 'button.tsx',
  nodes: [{ name: 'Badge', importPath: './badge', status: 'unknown', children: [] }],
};

const circularTree: DependencyTree = {
  rootImportPath: 'button.tsx',
  nodes: [{ name: 'Loop', importPath: './loop', status: 'circular', children: [] }],
};

describe('DependencyTreePanel', () => {
  it('renders registered node with check label', function () {
    render(
      <DependencyTreePanel
        tree={registeredTree}
        resolvedUnknowns={{}}
        onResolveUnknown={function () { return undefined; }}
      />,
    );
    expect(screen.getByLabelText('Component dependency tree')).toBeTruthy();
    expect(screen.getByLabelText('Registered Icon')).toBeTruthy();
  });

  it('renders unknown actions and blocking state', async function () {
    const user = userEvent.setup();
    const resolved: Record<string, boolean> = {};

    render(
      <DependencyTreePanel
        tree={unknownTree}
        resolvedUnknowns={resolved}
        onResolveUnknown={function (_name, action) {
          if (action === 'placeholder') {
            resolved.Badge = true;
          }
        }}
      />,
    );

    expect(treeHasBlockingUnknowns(unknownTree, {})).toBe(true);
    expect(screen.getByLabelText('Use placeholder for Badge')).toBeTruthy();
    await user.click(screen.getByLabelText('Use placeholder for Badge'));
  });

  it('renders circular error', function () {
    render(
      <DependencyTreePanel
        tree={circularTree}
        resolvedUnknowns={{}}
        onResolveUnknown={function () { return undefined; }}
      />,
    );
    expect(screen.getByText(/Circular dependency: Loop/)).toBeTruthy();
  });
});
