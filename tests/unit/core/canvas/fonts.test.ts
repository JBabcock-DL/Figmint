import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadFontsForCanvas, resetFontsLoadedForTests } from '@/core/canvas/lib/fonts';

describe('fonts', () => {
  beforeEach(() => {
    resetFontsLoadedForTests();
    const loadFontAsync = vi.fn().mockResolvedValue(undefined);
    (globalThis as Record<string, unknown>).figma = {
      loadFontAsync: loadFontAsync,
    };
  });

  it('loads fonts once per session', async () => {
    const figmaMock = globalThis as unknown as {
      figma: { loadFontAsync: ReturnType<typeof vi.fn> };
    };
    await loadFontsForCanvas();
    await loadFontsForCanvas();
    expect(figmaMock.figma.loadFontAsync.mock.calls.length).toBeGreaterThan(0);
    const firstCount = figmaMock.figma.loadFontAsync.mock.calls.length;
    await loadFontsForCanvas();
    expect(figmaMock.figma.loadFontAsync.mock.calls.length).toBe(firstCount);
  });
});
