import type { CanonicalToken, CodeSyntaxPlatform } from '@detroitlabs/figmint-contracts';
import { describe, expect, it, vi } from 'vitest';

import { applyCodeSyntax, mapCodeSyntax } from './codeSyntax';
import { SPOT_CHECK_COLOR_PRIMARY_DEFAULT } from './codeSyntax.spotCheck';

interface TokenInput {
  collection: CanonicalToken['collection'];
  name: string;
  type?: CanonicalToken['type'];
  codeSyntax?: CanonicalToken['codeSyntax'];
}

function token(input: TokenInput): CanonicalToken {
  return {
    type: 'COLOR',
    valuesByMode: { Default: { r: 0, g: 0, b: 0, a: 1 } },
    ...input,
  } as CanonicalToken;
}

function expectPlatforms(
  result: Partial<Record<CodeSyntaxPlatform, string>>,
  expected: Partial<Record<CodeSyntaxPlatform, string>>,
): void {
  expect(result).toEqual(expected);
}

describe('mapCodeSyntax', () => {
  describe('stored wins', () => {
    it('returns full Theme triple for color/primary/default', () => {
      const t = token({
        collection: 'theme',
        name: 'color/primary/default',
        codeSyntax: {
          WEB: 'var(--color-primary)',
          ANDROID: 'primary',
          iOS: '.Primary.default',
        },
      });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--color-primary)',
        ANDROID: 'primary',
        iOS: '.Primary.default',
      });
    });

    it('uses stored WEB only and derives ANDROID/iOS for primitives', () => {
      const t = token({
        collection: 'primitives',
        name: 'color/primary/500',
        codeSyntax: { WEB: 'var(--custom)' },
      });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--custom)',
        ANDROID: 'color-primary-500',
        iOS: '.Palette.primary.500',
      });
    });
  });

  describe('six worked tokens (research §3)', () => {
    it('primitives color/primary/500', () => {
      const t = token({ collection: 'primitives', name: 'color/primary/500' });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--color-primary-500)',
        ANDROID: 'color-primary-500',
        iOS: '.Palette.primary.500',
      });
    });

    it('theme color/primary/default stored', () => {
      const t = token({
        collection: 'theme',
        name: 'color/primary/default',
        codeSyntax: {
          WEB: 'var(--color-primary)',
          ANDROID: 'primary',
          iOS: '.Primary.default',
        },
      });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--color-primary)',
        ANDROID: 'primary',
        iOS: '.Primary.default',
      });
    });

    it('typography Headline/LG/font-size', () => {
      const t = token({
        collection: 'typography',
        type: 'FLOAT',
        name: 'Headline/LG/font-size',
      });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--headline-lg-font-size)',
        ANDROID: 'headline-lg-font-size',
        iOS: '.Typography.headline.lg.font.size',
      });
    });

    it('layout space/md', () => {
      const t = token({ collection: 'layout', type: 'FLOAT', name: 'space/md' });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--space-md)',
        ANDROID: 'space-md',
        iOS: '.Layout.space.md',
      });
    });

    it('effects shadow/md/blur', () => {
      const t = token({ collection: 'effects', type: 'FLOAT', name: 'shadow/md/blur' });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--shadow-md-blur)',
        ANDROID: 'shadow-md-blur',
        iOS: '.Effect.shadow.md.blur',
      });
    });

    it('theme color/background/content-muted stored', () => {
      const t = token({
        collection: 'theme',
        name: 'color/background/content-muted',
        codeSyntax: {
          WEB: 'var(--color-content-muted)',
          ANDROID: 'on-surface-variant',
          iOS: '.Foreground.secondary',
        },
      });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--color-content-muted)',
        ANDROID: 'on-surface-variant',
        iOS: '.Foreground.secondary',
      });
    });
  });

  describe('derivation extras', () => {
    it('primitives Space/400', () => {
      const t = token({ collection: 'primitives', type: 'FLOAT', name: 'Space/400' });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--space-400)',
        ANDROID: 'space-400',
        iOS: '.Space.400',
      });
    });

    it('primitives Corner/Extra-small', () => {
      const t = token({ collection: 'primitives', type: 'FLOAT', name: 'Corner/Extra-small' });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--corner-extra-small)',
        ANDROID: 'corner-extra-small',
        iOS: '.Corner.extra.small',
      });
    });

    it('primitives font/weight/medium', () => {
      const t = token({ collection: 'primitives', type: 'FLOAT', name: 'font/weight/medium' });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--font-weight-medium)',
        ANDROID: 'font-weight-medium',
        iOS: '.Font.weight.medium',
      });
    });

    it('typography Body/MD/font-weight', () => {
      const t = token({
        collection: 'typography',
        type: 'FLOAT',
        name: 'Body/MD/font-weight',
      });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--body-md-font-weight)',
        ANDROID: 'body-md-font-weight',
        iOS: '.Typography.body.md.font.weight',
      });
    });

    it('layout radius/xs', () => {
      const t = token({ collection: 'layout', type: 'FLOAT', name: 'radius/xs' });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--radius-xs)',
        ANDROID: 'radius-xs',
        iOS: '.Layout.radius.xs',
      });
    });

    it('effects shadow/color', () => {
      const t = token({ collection: 'effects', type: 'COLOR', name: 'shadow/color' });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--shadow-color)',
        ANDROID: 'shadow',
        iOS: '.Effect.shadow.color',
      });
    });
  });

  describe('theme — no derivation', () => {
    it('returns empty map when theme has no codeSyntax', () => {
      const t = token({ collection: 'theme', name: 'color/background/content-muted' });
      expect(mapCodeSyntax(t)).toEqual({});
    });

    it('returns WEB only when theme has partial stored', () => {
      const t = token({
        collection: 'theme',
        name: 'x',
        codeSyntax: { WEB: 'var(--color-content-muted)' },
      });
      expect(mapCodeSyntax(t)).toEqual({ WEB: 'var(--color-content-muted)' });
    });
  });

  describe('edge cases', () => {
    it('treats empty WEB as absent and derives on primitives', () => {
      const t = token({
        collection: 'primitives',
        name: 'color/primary/500',
        codeSyntax: { WEB: '' },
      });
      expectPlatforms(mapCodeSyntax(t), {
        WEB: 'var(--color-primary-500)',
        ANDROID: 'color-primary-500',
        iOS: '.Palette.primary.500',
      });
    });

    it('uses alias row codeSyntax, not target primitive derivation', () => {
      const aliasRow = token({
        collection: 'theme',
        name: 'color/primary/default',
        codeSyntax: {
          WEB: 'var(--color-primary)',
          ANDROID: 'primary',
          iOS: '.Primary.default',
        },
      });
      const targetPrimitive = token({
        collection: 'primitives',
        name: 'color/primary/500',
      });

      expect(mapCodeSyntax(aliasRow)).not.toEqual(mapCodeSyntax(targetPrimitive));
      expect(mapCodeSyntax(aliasRow).WEB).toBe('var(--color-primary)');
      expect(mapCodeSyntax(targetPrimitive).WEB).toBe('var(--color-primary-500)');
    });
  });
});

describe('spot-check constants', () => {
  it('matches legacy Theme color/primary/default triple', () => {
    expect(SPOT_CHECK_COLOR_PRIMARY_DEFAULT).toEqual({
      name: 'color/primary/default',
      WEB: 'var(--color-primary)',
      ANDROID: 'primary',
      iOS: '.Primary.default',
    });
  });
});

describe('applyCodeSyntax', () => {
  it('calls setVariableCodeSyntax for each derived platform on primitives', () => {
    const setVariableCodeSyntax = vi.fn();
    const variable = { setVariableCodeSyntax } as unknown as Variable;
    const t = token({ collection: 'primitives', name: 'color/primary/500' });

    applyCodeSyntax(variable, t);

    expect(setVariableCodeSyntax).toHaveBeenCalledTimes(3);
    expect(setVariableCodeSyntax).toHaveBeenCalledWith('WEB', 'var(--color-primary-500)');
    expect(setVariableCodeSyntax).toHaveBeenCalledWith('ANDROID', 'color-primary-500');
    expect(setVariableCodeSyntax).toHaveBeenCalledWith('iOS', '.Palette.primary.500');
  });

  it('does not call setVariableCodeSyntax when theme map is empty', () => {
    const setVariableCodeSyntax = vi.fn();
    const variable = { setVariableCodeSyntax } as unknown as Variable;
    const t = token({ collection: 'theme', name: 'color/background/content-muted' });

    applyCodeSyntax(variable, t);

    expect(setVariableCodeSyntax).not.toHaveBeenCalled();
  });

  it('calls setVariableCodeSyntax once for theme with WEB only', () => {
    const setVariableCodeSyntax = vi.fn();
    const variable = { setVariableCodeSyntax } as unknown as Variable;
    const t = token({
      collection: 'theme',
      name: 'x',
      codeSyntax: { WEB: 'var(--color-content-muted)' },
    });

    applyCodeSyntax(variable, t);

    expect(setVariableCodeSyntax).toHaveBeenCalledTimes(1);
    expect(setVariableCodeSyntax).toHaveBeenCalledWith('WEB', 'var(--color-content-muted)');
  });
});
