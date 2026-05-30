import { describe, expect, it } from 'vitest';

import { resolveRegistryKey } from '@/core/import/shared/resolveRegistryKey';

describe('resolveRegistryKey', () => {
  it('matches PascalCase registry keys', () => {
    expect(resolveRegistryKey('Icon', ['Icon', 'Box'])).toBe('Icon');
  });

  it('matches kebab alias keys', () => {
    expect(resolveRegistryKey('Icon', ['icon'])).toBe('icon');
  });

  it('honors nameToKey override when key exists', () => {
    expect(resolveRegistryKey('Button', ['custom-btn'], { Button: 'custom-btn' })).toBe(
      'custom-btn',
    );
  });

  it('returns null on miss', () => {
    expect(resolveRegistryKey('Missing', ['Icon'])).toBeNull();
  });
});
