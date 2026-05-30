import type { TokenResolver } from '@/core/import/shared/types';

const CANONICAL_MAP: Record<string, string> = {
  'bg-primary': 'color/primary/default',
  'bg-primary/90': 'color/primary/subtle',
  'hover:bg-primary/90': 'color/primary/subtle',
  'rounded-md': 'radius/md',
  'px-4': 'space/md',
  'gap-2': 'space/sm',
  'text-primary-foreground': 'color/primary/content',
  'ring-ring': 'color/neutral/500',
  'focus-visible:ring-ring': 'color/neutral/500',
  'focus-visible:ring-2': 'color/neutral/500',
};

function resolveWithFallbacks(token: string): ReturnType<TokenResolver['resolve']> {
  const mapped = CANONICAL_MAP[token];
  if (mapped !== undefined) {
    return { ok: true, variable: mapped };
  }
  if (token.startsWith('focus-visible:ring')) {
    return { ok: true, variable: 'color/neutral/500' };
  }
  if (token.startsWith('hover:bg-') || token.includes('/90') || token.includes('/80')) {
    return { ok: true, variable: 'color/primary/subtle' };
  }
  if (token.startsWith('bg-')) {
    return { ok: true, variable: 'color/primary/default' };
  }
  if (token.startsWith('text-')) {
    return { ok: true, variable: 'color/primary/content' };
  }
  if (token.startsWith('rounded-')) {
    return { ok: true, variable: 'radius/md' };
  }
  if (token.startsWith('px-') || token.startsWith('py-') || token.startsWith('p-')) {
    return { ok: true, variable: 'space/md' };
  }
  if (token.startsWith('gap-')) {
    return { ok: true, variable: 'space/sm' };
  }
  if (token.startsWith('ring')) {
    return { ok: true, variable: 'color/neutral/500' };
  }
  return { ok: false, reason: 'unresolved' };
}

/** Maps canonical button tokens → paths in component-spec-button-canonical.json */
export function createCanonicalButtonTokenResolver(): TokenResolver {
  return {
    resolve: resolveWithFallbacks,
  };
}

export function createAlwaysUnresolvedResolver(unresolvedToken: string): TokenResolver {
  return {
    resolve(token: string) {
      if (token === unresolvedToken || token.includes(unresolvedToken)) {
        return { ok: false, reason: 'unresolved' };
      }
      return resolveWithFallbacks(token);
    },
  };
}
