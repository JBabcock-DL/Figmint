import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FrameworkPicker } from '@/ui/components/codeconnect/FrameworkPicker';

describe('FrameworkPicker', () => {
  it('keeps Vue disabled while React is selectable', function () {
    render(<FrameworkPicker value="react" onChange={function () { return undefined; }} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const vueOption = Array.from(select.options).find(function (opt) {
      return opt.value === 'vue';
    });
    expect(vueOption).toBeDefined();
    expect(vueOption!.disabled).toBe(true);
    expect(vueOption!.title).toBe('Coming in a later sprint');
    const reactOption = Array.from(select.options).find(function (opt) {
      return opt.value === 'react';
    });
    expect(reactOption!.disabled).toBe(false);
  });
});
