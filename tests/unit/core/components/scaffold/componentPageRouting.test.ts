import { describe, expect, it } from 'vitest';

import {
  COMPONENT_PAGE_BY_SPEC_NAME,
  docComponentRootName,
  docComponentSetGroupName,
  docUsageSectionName,
  resolveComponentPageName,
  specNameToDocKey,
} from '@/core/components/scaffold/componentPageRouting';

describe('componentPageRouting', () => {
  it('maps Button to ↳ Buttons per DesignOps shadcn-props', () => {
    expect(COMPONENT_PAGE_BY_SPEC_NAME.Button).toBe('↳ Buttons');
    expect(resolveComponentPageName('Button')).toBe('↳ Buttons');
  });

  it('derives doc layer paths from spec name', () => {
    expect(specNameToDocKey('Button')).toBe('button');
    expect(docComponentRootName('button')).toBe('doc/component/button');
    expect(docComponentSetGroupName('button')).toBe('doc/component/button/component-set-group');
    expect(docUsageSectionName('button')).toBe('doc/component/button/usage');
  });

  it('pluralizes unknown spec names for page title', () => {
    expect(resolveComponentPageName('Chip')).toBe('↳ Chips');
  });
});
