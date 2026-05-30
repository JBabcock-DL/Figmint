import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/ui/App';

describe('App smoke', () => {
  it('renders FigHub header without throwing', function () {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'FigHub' })).toBeTruthy();
  });
});
