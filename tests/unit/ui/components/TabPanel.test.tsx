import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TabPanel } from '@/ui/components/TabPanel';

describe('TabPanel', () => {
  it('keeps children mounted when inactive', () => {
    render(
      <>
        <TabPanel id="panel-a" active={true}>
          <span data-testid="panel-a">A</span>
        </TabPanel>
        <TabPanel id="panel-b" active={false}>
          <span data-testid="panel-b">B</span>
        </TabPanel>
      </>,
    );

    expect(screen.getByTestId('panel-a')).toBeTruthy();
    expect(screen.getByTestId('panel-b')).toBeTruthy();
    expect(screen.getByTestId('panel-b').closest('section')?.hidden).toBe(true);
  });
});
