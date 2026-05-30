import { describe, expect, it } from 'vitest';

import { mergeComponentUsages, mergeTokenLists } from '@/core/handoff/merge';

describe('mergeComponentUsages', () => {
  it('merges by name and sums instances', () => {
    const merged = mergeComponentUsages([
      [{ name: 'Button', instances: 2, codeConnectUrl: 'https://github.com/a/Button.tsx' }],
      [{ name: 'Button', instances: 2 }],
      [{ name: 'Input', instances: 1 }],
    ]);

    expect(merged).toEqual([
      { name: 'Button', instances: 4, codeConnectUrl: 'https://github.com/a/Button.tsx' },
      { name: 'Input', instances: 1 },
    ]);
  });

  it('prefers first non-empty codeConnectUrl', () => {
    const merged = mergeComponentUsages([
      [{ name: 'Button', instances: 1 }],
      [{ name: 'Button', instances: 1, codeConnectUrl: 'https://github.com/b/Button.tsx' }],
    ]);

    expect(merged).toEqual([
      { name: 'Button', instances: 2, codeConnectUrl: 'https://github.com/b/Button.tsx' },
    ]);
  });

  it('returns sorted names', () => {
    const merged = mergeComponentUsages([
      [{ name: 'Zebra', instances: 1 }],
      [{ name: 'Alpha', instances: 3 }],
    ]);

    expect(merged.map(function (entry) {
      return entry.name;
    })).toEqual(['Alpha', 'Zebra']);
  });
});

describe('mergeTokenLists', () => {
  it('returns sorted union of token paths', () => {
    const merged = mergeTokenLists([
      ['Theme/Primary', 'Layout/spacing/4'],
      ['Layout/spacing/4', 'Theme/Secondary'],
    ]);

    expect(merged).toEqual(['Layout/spacing/4', 'Theme/Primary', 'Theme/Secondary']);
  });

  it('deduplicates identical tokens across frames', () => {
    const merged = mergeTokenLists([
      ['Theme/Primary', 'Theme/Primary'],
      ['Theme/Primary'],
    ]);

    expect(merged).toEqual(['Theme/Primary']);
  });
});
