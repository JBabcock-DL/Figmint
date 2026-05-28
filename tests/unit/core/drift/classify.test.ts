import { describe, expect, it } from 'vitest';

import { classifyThreeWay } from '@/core/drift/classify';

function numberEqual(left: number, right: number): boolean {
  return left === right;
}

describe('classifyThreeWay', () => {
  it('classifies push when figma diverged but repo matches snapshot baseline', () => {
    expect(classifyThreeWay(1, 0, 0, numberEqual)).toBe('push');
  });

  it('classifies pull when figma matches snapshot but repo diverged', () => {
    expect(classifyThreeWay(0, 1, 0, numberEqual)).toBe('pull');
  });

  it('classifies conflict when figma and repo both diverged differently from snapshot', () => {
    expect(classifyThreeWay(2, 3, 1, numberEqual)).toBe('conflict');
  });

  it('classifies synced when all three sides match', () => {
    expect(classifyThreeWay(5, 5, 5, numberEqual)).toBe('synced');
  });

  it('classifies synced when figma and repo moved the same way from snapshot', () => {
    expect(classifyThreeWay(2, 2, 1, numberEqual)).toBe('synced');
  });

  it('uses repo as baseline when snapshot is missing', () => {
    expect(classifyThreeWay(1, 0, null, numberEqual)).toBe('push');
    expect(classifyThreeWay(0, 1, null, numberEqual)).toBe('push');
  });

  it('classifies figma-only as push when repo and snapshot are absent', () => {
    expect(classifyThreeWay(1, null, null, numberEqual)).toBe('push');
  });

  it('classifies repo-only as synced when snapshot is absent until first push', () => {
    expect(classifyThreeWay(null, 1, null, numberEqual)).toBe('synced');
  });
});
