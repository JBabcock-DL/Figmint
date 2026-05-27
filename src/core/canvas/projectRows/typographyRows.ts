import type { CodeSyntaxTriple } from '@/core/canvas/types';
import { loadTypographySlots } from '@/core/canvas/data/loadCanvasData';

export type TypographyVariant = 'base' | 'emphasis' | 'italic' | 'link' | 'strikethrough';

export interface TypographyCategoryRow {
  type: 'category';
  label: string;
}

export interface TypographySlotRow {
  type: 'slot';
  tokenPath: string;
  styleId: string;
  specimenChars: string;
  sizeLine1: string;
  sizeLine2: string;
  weightLine1: string;
  weightLine2: string;
  codeSyntax: CodeSyntaxTriple;
  variant: TypographyVariant;
}

export type TypographyTableRow = TypographyCategoryRow | TypographySlotRow;

export interface TextStyleIndexEntry {
  id: string;
  name: string;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  lineHeightUnit: string;
  lineHeightValue: number;
  codeSyntax?: Partial<CodeSyntaxTriple> & { IOS?: string };
}

const CATEGORY_ORDER = ['Display', 'Headline', 'Title', 'Body', 'Label'];

const SPECIMENS: Record<string, string> = {
  Display: 'Dream design systems',
  Headline: 'Ship it with confidence',
  Title: 'Tokens keep us honest',
  Body: 'The quick brown fox jumps over the lazy dog.',
  Label: 'STATUS — ACTIVE',
};

const SIZE_PRIORITY: Record<string, number> = {
  '2XL': -2,
  XL: -1,
  LG: 0,
  MD: 1,
  SM: 2,
  XS: 3,
};

function csFor(styleName: string): CodeSyntaxTriple {
  const lower = styleName.toLowerCase().replace(/\s+/g, '-');
  const kebab = lower.replace(/\//g, '-');
  const parts = lower.split('/');
  return {
    WEB: 'var(--' + kebab + ')',
    ANDROID: kebab,
    iOS: '.Typography.' + parts.join('.'),
  };
}

function readCodeSyntax(entry: TextStyleIndexEntry): CodeSyntaxTriple {
  const cs = entry.codeSyntax;
  if (cs !== undefined) {
    const web = cs.WEB !== undefined ? String(cs.WEB) : '';
    const android = cs.ANDROID !== undefined ? String(cs.ANDROID) : '';
    const ios = cs.iOS !== undefined ? String(cs.iOS) : cs.IOS !== undefined ? String(cs.IOS) : '';
    if (web !== '' || android !== '' || ios !== '') {
      return { WEB: web, ANDROID: android, iOS: ios };
    }
  }
  return csFor(entry.name);
}

function lineHeightStr(unit: string, value: number): string {
  if (unit === 'AUTO') {
    return 'auto line';
  }
  if (unit === 'PIXELS') {
    return String(Math.round(value)) + 'px line';
  }
  if (unit === 'PERCENT') {
    return String(value) + '% line';
  }
  return String(value) + ' line';
}

function deriveVariant(styleName: string): TypographyVariant {
  const parts = styleName.split('/');
  if (parts.length < 3) {
    return 'base';
  }
  const raw = parts[2].toLowerCase();
  if (raw === 'emphasis' || raw === 'italic' || raw === 'link' || raw === 'strikethrough') {
    return raw;
  }
  return 'base';
}

function compareStyles(a: TextStyleIndexEntry, b: TextStyleIndexEntry): number {
  const partsA = a.name.split('/');
  const partsB = b.name.split('/');
  const sizeA = (partsA[1] || '').toUpperCase();
  const sizeB = (partsB[1] || '').toUpperCase();
  const prioA = SIZE_PRIORITY[sizeA] !== undefined ? SIZE_PRIORITY[sizeA] : 99;
  const prioB = SIZE_PRIORITY[sizeB] !== undefined ? SIZE_PRIORITY[sizeB] : 99;
  if (prioA !== prioB) {
    return prioA - prioB;
  }
  return a.name.localeCompare(b.name);
}

/**
 * Project interleaved category + slot rows for the typography/styles table.
 * Pure — accepts a text-style index (live or mock) for Vitest.
 */
export function projectTypographyRows(textStyles: TextStyleIndexEntry[]): TypographyTableRow[] {
  const slotsData = loadTypographySlots();
  void slotsData;

  const typographyStyles = textStyles.filter(function (entry) {
    return !entry.name.startsWith('Doc/') && !entry.name.startsWith('Effect/');
  });

  const categoryMap: Record<string, TextStyleIndexEntry[]> = {};
  const discoveredOrder: string[] = [];
  for (let i = 0; i < typographyStyles.length; i++) {
    const entry = typographyStyles[i];
    const firstSeg = entry.name.split('/')[0];
    if (categoryMap[firstSeg] === undefined) {
      categoryMap[firstSeg] = [];
      discoveredOrder.push(firstSeg);
    }
    categoryMap[firstSeg].push(entry);
  }

  const orderedCategories: string[] = [];
  for (let ci = 0; ci < CATEGORY_ORDER.length; ci++) {
    const cat = CATEGORY_ORDER[ci];
    if (categoryMap[cat] !== undefined) {
      orderedCategories.push(cat);
    }
  }
  const extras = discoveredOrder.filter(function (cat) {
    return CATEGORY_ORDER.indexOf(cat) < 0;
  });
  extras.sort();
  for (let ei = 0; ei < extras.length; ei++) {
    orderedCategories.push(extras[ei]);
  }

  const rows: TypographyTableRow[] = [];
  for (let ci = 0; ci < orderedCategories.length; ci++) {
    const cat = orderedCategories[ci];
    rows.push({ type: 'category', label: cat });
    const catStyles = categoryMap[cat].slice().sort(compareStyles);
    for (let si = 0; si < catStyles.length; si++) {
      const style = catStyles[si];
      rows.push({
        type: 'slot',
        tokenPath: style.name,
        styleId: style.id,
        specimenChars: SPECIMENS[cat] !== undefined ? SPECIMENS[cat] : style.name,
        sizeLine1: String(Math.round(style.fontSize)) + 'px size',
        sizeLine2: lineHeightStr(style.lineHeightUnit, style.lineHeightValue),
        weightLine1: String(style.fontWeight) + ' weight',
        weightLine2: style.fontFamily !== '' ? style.fontFamily : '—',
        codeSyntax: readCodeSyntax(style),
        variant: deriveVariant(style.name),
      });
    }
  }
  return rows;
}

export function countTypographySlotRows(rows: TypographyTableRow[]): number {
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].type === 'slot') {
      count += 1;
    }
  }
  return count;
}

export function countTypographyCategoryRows(rows: TypographyTableRow[]): number {
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].type === 'category') {
      count += 1;
    }
  }
  return count;
}

/** Build a mock index covering all 27 slot styles for unit tests. */
export function buildMockTypographyTextStyleIndex(): TextStyleIndexEntry[] {
  const data = loadTypographySlots();
  const entries: TextStyleIndexEntry[] = [];
  let idCounter = 1;

  function pushEntry(name: string, fontSize: number, fontWeight: number): void {
    entries.push({
      id: 'style-' + String(idCounter++),
      name: name,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fontFamily: 'Inter',
      lineHeightUnit: 'PIXELS',
      lineHeightValue: fontSize + 8,
    });
  }

  for (let i = 0; i < data.baseSlots.length; i++) {
    const slot = data.baseSlots[i];
    pushEntry(slot.slot, slot.fontSize, slot.fontWeight);
  }

  const sizes = data.bodyVariants.sizes;
  const variants = data.bodyVariants.variants;
  for (let si = 0; si < sizes.length; si++) {
    const size = sizes[si];
    const baseSlot = data.baseSlots.find(function (s) {
      return s.slot === 'Body/' + size;
    });
    const fontSize = baseSlot !== undefined ? baseSlot.fontSize : 14;
    const fontWeight = baseSlot !== undefined ? baseSlot.fontWeight : 400;
    for (let vi = 0; vi < variants.length; vi++) {
      pushEntry('Body/' + size + '/' + variants[vi].variant, fontSize, fontWeight);
    }
  }

  return entries;
}
