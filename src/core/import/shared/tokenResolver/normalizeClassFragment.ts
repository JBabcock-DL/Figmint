const VARIANT_PREFIXES = [
  'sm:',
  'md:',
  'lg:',
  'xl:',
  '2xl:',
  'hover:',
  'focus:',
  'dark:',
];

/**
 * Strip leading responsive/state variant prefixes (single left-to-right pass per prefix list).
 * MVP: one pass only — `sm:hover:bg-primary` leaves `hover:bg-primary` unresolved if not re-stripped.
 */
export function normalizeClassFragment(token: string): string {
  let fragment = token.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < VARIANT_PREFIXES.length; i++) {
      const prefix = VARIANT_PREFIXES[i];
      if (fragment.startsWith(prefix)) {
        fragment = fragment.slice(prefix.length);
        changed = true;
        break;
      }
    }
  }
  return fragment;
}

export function parseColorClassFragment(
  fragment: string,
): { utility: import('./types').ColorUtility; semantic: string } | null {
  const match = /^(bg|text|border)-(.+)$/.exec(fragment);
  if (match === null) {
    return null;
  }
  return {
    utility: match[1] as import('./types').ColorUtility,
    semantic: match[2],
  };
}
