#!/usr/bin/env node
/**
 * Generates `src/core/variables/__fixtures__/bootstrap-complete.v1.json` —
 * canonical TokensV1 sample for Bootstrap tab / manual VQA (all 5 collections).
 *
 * Run: node scripts/generate-bootstrap-fixture.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const typographySlots = JSON.parse(
  readFileSync(resolve(repoRoot, 'src/core/canvas/data/typography-slots.json'), 'utf8'),
);
const platformRows = JSON.parse(
  readFileSync(resolve(repoRoot, 'src/core/canvas/data/platform-mapping-rows.json'), 'utf8'),
);
const layoutEffectsFixture = JSON.parse(
  readFileSync(resolve(repoRoot, 'src/core/canvas/__fixtures__/layout-effects.v1.json'), 'utf8'),
);
const designTokens = JSON.parse(readFileSync(resolve(repoRoot, 'design/tokens.json'), 'utf8'));

const OUT = resolve(repoRoot, 'src/core/variables/__fixtures__/bootstrap-complete.v1.json');

/** Map `color/{ramp}/{stop}` → hex from repo `design/tokens.json` primitives. */
function loadRepoPrimitiveColorOverrides(doc) {
  const overrides = new Map();
  const color = doc?.primitives?.color;
  if (!color || typeof color !== 'object') {
    return overrides;
  }
  for (const [ramp, stops] of Object.entries(color)) {
    if (!stops || typeof stops !== 'object') {
      continue;
    }
    for (const [stop, leaf] of Object.entries(stops)) {
      if (leaf?.$type === 'color' && typeof leaf.$value === 'string') {
        overrides.set(`color/${ramp}/${stop}`, leaf.$value.toLowerCase());
      }
    }
  }
  return overrides;
}

const repoColorOverrides = loadRepoPrimitiveColorOverrides(designTokens);

const TYPO_MODES = ['85', '100', '110', '120', '130', '150', '175', '200'];
const COLOR_RAMPS = ['primary', 'secondary', 'neutral', 'tertiary', 'error'];
const COLOR_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

/** FNV-1a → #rrggbb (deterministic swatches). */
function hashHex(seed) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return '#' + (h & 0xffffff).toString(16).padStart(6, '0');
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 };
}

function scaleTypo(base, mode) {
  const factor = Number(mode) / 100;
  if (base < 24 || factor <= 1.3) {
    return Math.round(base * factor);
  }
  return Math.round(base * Math.sqrt(factor));
}

function kebabPath(path) {
  return path
    .replace(/\//g, '-')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function codeSyntaxTriple(path, collectionHint) {
  const kebab = kebabPath(path);
  if (collectionHint === 'theme') {
    return {
      WEB: `var(--${kebab})`,
      ANDROID: kebab.replace(/-/g, ''),
      iOS: `.Theme.${path.split('/').slice(1).join('.')}`,
    };
  }
  return {
    WEB: `var(--${kebab})`,
    ANDROID: kebab,
    iOS: `.${path.replace(/\//g, '.')}`,
  };
}

const tokens = [];
const tokenKey = new Set();

function addToken(token) {
  const key = `${token.collection}:${token.name}`;
  if (tokenKey.has(key)) {
    return;
  }
  tokenKey.add(key);
  tokens.push(token);
}

// --- Primitives: color ramps ---
for (const ramp of COLOR_RAMPS) {
  for (const stop of COLOR_STOPS) {
    const name = `color/${ramp}/${stop}`;
    const repoHex = repoColorOverrides.get(name);
    const hex =
      repoHex ??
      (ramp === 'neutral'
        ? `#${String(Math.round((stop / 900) * 255))
            .padStart(2, '0')
            .repeat(3)}`
        : hashHex(name));
    addToken({
      collection: 'primitives',
      name,
      type: 'COLOR',
      valuesByMode: { Default: hexToRgb(hex) },
      codeSyntax: {
        WEB: `var(--color-${ramp}-${stop})`,
        ANDROID: `color-${ramp}-${stop}`,
        iOS: `.Palette.${ramp}.${stop}`,
      },
    });
  }
}

addToken({
  collection: 'primitives',
  name: 'typeface/display',
  type: 'STRING',
  valuesByMode: { Default: 'Inter' },
});
addToken({
  collection: 'primitives',
  name: 'typeface/body',
  type: 'STRING',
  valuesByMode: { Default: 'Inter' },
});
addToken({
  collection: 'primitives',
  name: 'font/weight/medium',
  type: 'FLOAT',
  valuesByMode: { Default: 500 },
});

// --- Theme: semantic colors (platform-mapping minimum + aliases) ---
const THEME_TOKENS = [
  {
    path: 'color/background/default',
    light: { alias: 'color/neutral/50' },
    dark: { alias: 'color/neutral/900' },
  },
  {
    path: 'color/background/content',
    light: { alias: 'color/neutral/100' },
    dark: { alias: 'color/neutral/800' },
  },
  {
    path: 'color/background/content-muted',
    light: { alias: 'color/neutral/200' },
    dark: { alias: 'color/neutral/700' },
  },
  {
    path: 'color/background/variant',
    light: { alias: 'color/neutral/100' },
    dark: { alias: 'color/neutral/800' },
  },
  {
    path: 'color/border/default',
    light: { alias: 'color/neutral/300' },
    dark: { alias: 'color/neutral/600' },
  },
  {
    path: 'color/border/subtle',
    light: { alias: 'color/neutral/200' },
    dark: { alias: 'color/neutral/700' },
  },
  {
    path: 'color/primary/default',
    light: { alias: 'color/primary/500' },
    dark: { alias: 'color/primary/400' },
  },
  {
    path: 'color/primary/content',
    light: { rgb: hexToRgb('#ffffff') },
    dark: { rgb: hexToRgb('#ffffff') },
  },
  {
    path: 'color/primary/subtle',
    light: { alias: 'color/primary/100' },
    dark: { alias: 'color/primary/900' },
  },
  {
    path: 'color/secondary/default',
    light: { alias: 'color/secondary/500' },
    dark: { alias: 'color/secondary/400' },
  },
  {
    path: 'color/tertiary/default',
    light: { alias: 'color/tertiary/500' },
    dark: { alias: 'color/tertiary/400' },
  },
  {
    path: 'color/error/default',
    light: { alias: 'color/error/500' },
    dark: { alias: 'color/error/400' },
  },
  {
    path: 'color/component/ring',
    light: { alias: 'color/primary/500' },
    dark: { alias: 'color/primary/400' },
  },
];

function themeModeValue(spec) {
  if (spec.alias) {
    return { aliasOf: { collection: 'primitives', name: spec.alias } };
  }
  return spec.rgb;
}

for (const entry of THEME_TOKENS) {
  addToken({
    collection: 'theme',
    name: entry.path,
    type: 'COLOR',
    valuesByMode: {
      Light: themeModeValue(entry.light),
      Dark: themeModeValue(entry.dark),
    },
    codeSyntax: codeSyntaxTriple(entry.path, 'theme'),
  });
}

// --- Typography: 15 slots × 4 properties × 8 modes ---
for (const slotDef of typographySlots.baseSlots) {
  const slot = slotDef.slot;
  const category = slot.split('/')[0];
  const typeface =
    category === 'Body' || category === 'Label' ? 'typeface/body' : 'typeface/display';

  const familyModes = {};
  const sizeModes = {};
  const weightModes = {};
  const lineModes = {};
  for (const mode of TYPO_MODES) {
    familyModes[mode] = { aliasOf: { collection: 'primitives', name: typeface } };
    sizeModes[mode] = scaleTypo(slotDef.fontSize, mode);
    weightModes[mode] = slotDef.fontWeight;
    lineModes[mode] = scaleTypo(slotDef.lineHeight, mode);
  }

  const slotKebab = kebabPath(slot);
  addToken({
    collection: 'typography',
    name: `${slot}/font-family`,
    type: 'STRING',
    valuesByMode: familyModes,
    codeSyntax: {
      WEB: `var(--${slotKebab}-font-family)`,
      ANDROID: `${slotKebab}-font-family`,
      iOS: `.Typography.${slotKebab}.font.family`,
    },
  });
  addToken({
    collection: 'typography',
    name: `${slot}/font-size`,
    type: 'FLOAT',
    valuesByMode: sizeModes,
    codeSyntax: {
      WEB: `var(--${slotKebab}-font-size)`,
      ANDROID: `${slotKebab}-font-size`,
      iOS: `.Typography.${slotKebab}.font.size`,
    },
  });
  addToken({
    collection: 'typography',
    name: `${slot}/font-weight`,
    type: 'FLOAT',
    valuesByMode: weightModes,
    codeSyntax: {
      WEB: `var(--${slotKebab}-font-weight)`,
      ANDROID: `${slotKebab}-font-weight`,
      iOS: `.Typography.${slotKebab}.font.weight`,
    },
  });
  addToken({
    collection: 'typography',
    name: `${slot}/line-height`,
    type: 'FLOAT',
    valuesByMode: lineModes,
    codeSyntax: {
      WEB: `var(--${slotKebab}-line-height)`,
      ANDROID: `${slotKebab}-line-height`,
      iOS: `.Typography.${slotKebab}.line.height`,
    },
  });
}

// --- Layout + effects (full oracle from layout-effects fixture) ---
for (const token of layoutEffectsFixture.tokens) {
  addToken(token);
}

const collections = [
  { id: 'primitives', modes: ['Default'] },
  { id: 'theme', modes: ['Light', 'Dark'] },
  { id: 'typography', modes: TYPO_MODES.slice() },
  { id: 'layout', modes: ['Default'] },
  { id: 'effects', modes: ['Light', 'Dark'] },
];

const counts = {};
for (const t of tokens) {
  counts[t.collection] = (counts[t.collection] ?? 0) + 1;
}

const fixture = {
  $comment:
    'FigHub bootstrap-complete sample — all 5 collections populated for Bootstrap tab VQA. Regenerate: node scripts/generate-bootstrap-fixture.mjs',
  v: 1,
  kind: 'tokens',
  collections,
  tokens,
  meta: {
    purpose: 'bootstrap-vqa',
    platformMappingRowCount: platformRows.rows.length,
    tokenCountsByCollection: counts,
    totalTokens: tokens.length,
  },
};

writeFileSync(OUT, JSON.stringify(fixture, null, 2) + '\n', 'utf8');

console.log('Wrote', OUT);
console.log('Token counts:', counts, 'total:', tokens.length);
