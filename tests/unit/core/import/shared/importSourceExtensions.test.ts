import { describe, expect, it } from 'vitest';

import {
  importSourceExtensionsLabel,
  shouldIncludeImportSourcePath,
} from '@/core/import/shared/importSourceExtensions';

describe('importSourceExtensions', () => {
  it('includes react tsx and excludes test files', () => {
    expect(shouldIncludeImportSourcePath('src/button.tsx', 'react')).toBe(true);
    expect(shouldIncludeImportSourcePath('src/button.test.tsx', 'react')).toBe(false);
    expect(shouldIncludeImportSourcePath('src/button.vue', 'react')).toBe(false);
  });

  it('includes vue and swiftui extensions', () => {
    expect(shouldIncludeImportSourcePath('src/Alert.vue', 'vue')).toBe(true);
    expect(shouldIncludeImportSourcePath('Sources/PrimaryButton.swift', 'swiftui')).toBe(true);
    expect(shouldIncludeImportSourcePath('ui/Button.kt', 'compose')).toBe(true);
  });

  it('formats extension labels for UI copy', () => {
    expect(importSourceExtensionsLabel('react')).toContain('.tsx');
    expect(importSourceExtensionsLabel('vue')).toBe('.vue');
  });
});
