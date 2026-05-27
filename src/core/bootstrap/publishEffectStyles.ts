import { REQUIRED_EFFECT_STYLE_NAMES } from '@/core/canvas/ensureEffectStyles';

const TIER_BLUR_PX: Record<string, number> = {
  sm: 2,
  md: 4,
  lg: 8,
  xl: 16,
  '2xl': 32,
};

function findEffectStyleByName(styles: EffectStyle[], name: string): EffectStyle | null {
  for (let i = 0; i < styles.length; i++) {
    if (styles[i].name === name) {
      return styles[i];
    }
  }
  return null;
}

/**
 * Create missing `Effect/shadow-{tier}` local styles for effects page previews.
 * Uses fixed drop-shadow recipes (blur tiers match primitive elevation scale).
 */
export async function publishMissingEffectStyles(): Promise<{
  published: string[];
  missing: string[];
}> {
  const styles = await figma.getLocalEffectStylesAsync();
  const published: string[] = [];
  const missing: string[] = [];

  for (let ri = 0; ri < REQUIRED_EFFECT_STYLE_NAMES.length; ri++) {
    const requiredName = REQUIRED_EFFECT_STYLE_NAMES[ri];
    if (findEffectStyleByName(styles, requiredName) !== null) {
      continue;
    }
    const tier = requiredName.replace('Effect/shadow-', '');
    const blur = TIER_BLUR_PX[tier];
    if (blur === undefined) {
      missing.push(requiredName);
      continue;
    }
    const style = figma.createEffectStyle();
    style.name = requiredName;
    style.effects = [
      {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.18 },
        offset: { x: 0, y: tier === 'sm' ? 1 : 2 },
        radius: blur,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL',
      },
    ];
    published.push(requiredName);
  }

  return { published: published, missing: missing };
}
