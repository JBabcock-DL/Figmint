import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

function SmokeTarget() {
  return <p>export-sheet-dom-ready</p>;
}

describe('dom setup', () => {
  it('renders with @testing-library/react and jest-dom matchers', () => {
    render(<SmokeTarget />);
    expect(screen.getByText('export-sheet-dom-ready')).toBeInTheDocument();
  });
});
