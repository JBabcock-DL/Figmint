export const REQUIRED_EFFECT_STYLE_NAMES = [
  'Effect/shadow-sm',
  'Effect/shadow-md',
  'Effect/shadow-lg',
  'Effect/shadow-xl',
  'Effect/shadow-2xl',
] as const;

export type RequiredEffectStyleName = (typeof REQUIRED_EFFECT_STYLE_NAMES)[number];

export interface EffectStyleCatalogEntry {
  id: string;
  name: string;
}

export interface EnsureEffectStylesOptions {
  /** Vitest-only override — defaults to figma.getLocalEffectStylesAsync(). */
  listStyles?: () => Promise<EffectStyleCatalogEntry[]>;
}

function normalizeStyleName(name: string): string {
  return name.trim().toLowerCase();
}

function findStyleForTier(
  styles: EffectStyleCatalogEntry[],
  tier: string,
): EffectStyleCatalogEntry | null {
  const exact = 'Effect/shadow-' + tier;
  for (let i = 0; i < styles.length; i++) {
    if (styles[i].name === exact) {
      return styles[i];
    }
  }
  const pattern = new RegExp('shadow.*' + tier, 'i');
  for (let i = 0; i < styles.length; i++) {
    if (pattern.test(styles[i].name)) {
      return styles[i];
    }
  }
  return null;
}

/**
 * Preflight local drop-shadow styles required by effects preview cards.
 * Does not create styles — returns missing names for a structured build abort.
 */
export async function ensureEffectStyles(
  opts?: EnsureEffectStylesOptions,
): Promise<{ published: string[]; missing: string[] }> {
  const listFn =
    opts !== undefined && opts.listStyles !== undefined
      ? opts.listStyles
      : async function () {
          const styles = await figma.getLocalEffectStylesAsync();
          const entries: EffectStyleCatalogEntry[] = [];
          for (let i = 0; i < styles.length; i++) {
            entries.push({ id: styles[i].id, name: styles[i].name });
          }
          return entries;
        };

  const styles = await listFn();
  const published: string[] = [];
  const missing: string[] = [];
  const tiers = ['sm', 'md', 'lg', 'xl', '2xl'];

  for (let ti = 0; ti < tiers.length; ti++) {
    const tier = tiers[ti];
    const requiredName = 'Effect/shadow-' + tier;
    const match = findStyleForTier(styles, tier);
    if (match !== null) {
      if (!published.includes(normalizeStyleName(match.name))) {
        published.push(match.name);
      }
    } else {
      missing.push(requiredName);
    }
  }

  return { published: published, missing: missing };
}
