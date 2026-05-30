export function mapTokenToBindingSelector(token: string): string | null {
  if (token.includes('[')) {
    return null;
  }

  if (token.startsWith('hover:')) {
    const base = token.slice('hover:'.length);
    if (base.startsWith('bg-')) {
      return 'state-layer/hover.fill';
    }
  }

  if (token.startsWith('focus-visible:ring') || token.startsWith('ring-')) {
    return 'focus-ring.stroke';
  }

  if (token.startsWith('bg-')) {
    return 'root.fill';
  }
  if (token.startsWith('text-')) {
    return 'text/label.fill';
  }
  if (token.startsWith('rounded-')) {
    return 'root.radius';
  }
  if (/^p(?:x|y|t|b|l|r)?-/.test(token) || token.startsWith('p-')) {
    return 'root.padding';
  }
  if (token.startsWith('gap-')) {
    return 'root.gap';
  }

  return null;
}

export function mapTokenToAdditionalSelectors(token: string): string[] {
  if (token.startsWith('text-')) {
    return ['icon-slot/leading.fill'];
  }
  return [];
}
