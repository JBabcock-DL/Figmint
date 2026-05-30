import type { ComponentSpecBinding } from '@detroitlabs/fighub-contracts';

import { normalizeClassFragment } from '@/core/import/shared/tokenResolver/normalizeClassFragment';
import { normalizeResolverVariablePath } from '@/core/import/shared/tokenResolver/normalizeVariablePath';
import type { TokenResolver } from '@/core/import/shared/types';

import { mapTokenToAdditionalSelectors, mapTokenToBindingSelector } from './tokenToSelector';

export interface ExtractBindingsResult {
  bindings: ComponentSpecBinding[];
  unresolvedTokens: string[];
}

const EXTRA_PREFIXES = ['focus-visible:', 'active:', 'disabled:'];

const BINDING_SELECTOR_ORDER = [
  'root.fill',
  'root.radius',
  'root.padding',
  'root.gap',
  'text/label.fill',
  'icon-slot/leading.fill',
  'state-layer/hover.fill',
  'focus-ring.stroke',
];

function stripAllPrefixes(token: string): { original: string; base: string; isHover: boolean } {
  let fragment = token.trim();
  let isHover = false;
  if (fragment.startsWith('hover:')) {
    isHover = true;
    fragment = fragment.slice('hover:'.length);
  }
  for (let i = 0; i < EXTRA_PREFIXES.length; i++) {
    const prefix = EXTRA_PREFIXES[i];
    if (fragment.startsWith(prefix)) {
      fragment = fragment.slice(prefix.length);
    }
  }
  return { original: token, base: normalizeClassFragment(fragment), isHover: isHover };
}

function bindingKey(selector: string, variable: string): string {
  return selector + '\0' + variable;
}

function sortBindings(bindings: ComponentSpecBinding[]): ComponentSpecBinding[] {
  return bindings.slice().sort(function (a, b) {
    const ai = BINDING_SELECTOR_ORDER.indexOf(a.selector);
    const bi = BINDING_SELECTOR_ORDER.indexOf(b.selector);
    const aRank = ai >= 0 ? ai : BINDING_SELECTOR_ORDER.length;
    const bRank = bi >= 0 ? bi : BINDING_SELECTOR_ORDER.length;
    if (aRank !== bRank) {
      return aRank - bRank;
    }
    return a.selector.localeCompare(b.selector);
  });
}

export function extractBindings(
  classTokens: string[],
  tokenResolver: TokenResolver,
  options?: { includeIconSlotBindings?: boolean },
): ExtractBindingsResult {
  const bindings: ComponentSpecBinding[] = [];
  const unresolvedTokens: string[] = [];
  const seen: Record<string, boolean> = {};
  const includeIconSlots = options?.includeIconSlotBindings !== false;

  for (let i = 0; i < classTokens.length; i++) {
    const raw = classTokens[i];

    if (raw.includes('[')) {
      unresolvedTokens.push(raw);
      continue;
    }

    const stripped = stripAllPrefixes(raw);

    let selector = mapTokenToBindingSelector(raw);
    if (selector === null && stripped.isHover && stripped.base.startsWith('bg-')) {
      selector = 'state-layer/hover.fill';
    }
    if (selector === null) {
      selector = mapTokenToBindingSelector(stripped.base);
    }
    if (selector === null) {
      continue;
    }

    const tokenForResolve = stripped.isHover ? 'hover:' + stripped.base : stripped.base;
    const resolvePrimary = tokenResolver.resolve(tokenForResolve);
    let resolvedVariable: string | null;
    if (resolvePrimary.ok) {
      resolvedVariable = resolvePrimary.variable;
    } else {
      const resolveFallback = tokenResolver.resolve(stripped.base);
      if (resolveFallback.ok) {
        resolvedVariable = resolveFallback.variable;
      } else {
        const resolveRaw = tokenResolver.resolve(raw);
        if (resolveRaw.ok) {
          resolvedVariable = resolveRaw.variable;
        } else {
          unresolvedTokens.push(raw);
          continue;
        }
      }
    }

    const variable = normalizeResolverVariablePath(resolvedVariable);

    const key = bindingKey(selector, variable);
    if (!seen[key]) {
      seen[key] = true;
      bindings.push({ selector: selector, variable: variable });
    }

    if (includeIconSlots) {
      const extra = mapTokenToAdditionalSelectors(stripped.base);
      for (let j = 0; j < extra.length; j++) {
        const extraKey = bindingKey(extra[j], variable);
        if (!seen[extraKey]) {
          seen[extraKey] = true;
          bindings.push({ selector: extra[j], variable: variable });
        }
      }
    }
  }

  return { bindings: sortBindings(bindings), unresolvedTokens: unresolvedTokens };
}
