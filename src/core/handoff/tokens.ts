import type { HandoffAutoLayout } from '@detroitlabs/fighub-contracts';

import { pluginLog } from '@/core/pluginLog';
import { COLLECTION_ORDER, DISPLAY_NAME } from '@/core/variables/collections';

import { walkSceneTree } from './walk';

export interface TokensAndLayoutResult {
  tokens: string[];
  autoLayout: HandoffAutoLayout;
}

const ARRAY_BINDING_FIELDS = ['fills', 'strokes', 'effects'] as const;

const SCALAR_BINDING_FIELDS = [
  'layoutGap',
  'itemSpacing',
  'counterAxisSpacing',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
] as const;

function addVariableId(out: Set<string>, value: unknown): void {
  if (value === null || value === undefined || typeof value !== 'object') {
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id === 'string') {
    out.add(record.id);
    return;
  }
  const color = record.color;
  if (color !== null && color !== undefined && typeof color === 'object') {
    const colorRecord = color as Record<string, unknown>;
    if (typeof colorRecord.id === 'string') {
      out.add(colorRecord.id);
    }
  }
}

function collectFromBindingValue(out: Set<string>, value: unknown): void {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      addVariableId(out, value[i]);
    }
    return;
  }
  addVariableId(out, value);
}

export function collectBoundVariableIds(node: SceneNode, out: Set<string>): void {
  if (!('boundVariables' in node)) {
    return;
  }
  const boundVariables = (node as { boundVariables?: Record<string, unknown> }).boundVariables;
  if (boundVariables === undefined || boundVariables === null) {
    return;
  }

  for (let i = 0; i < ARRAY_BINDING_FIELDS.length; i++) {
    const field = ARRAY_BINDING_FIELDS[i];
    if (field in boundVariables) {
      collectFromBindingValue(out, boundVariables[field]);
    }
  }

  for (let i = 0; i < SCALAR_BINDING_FIELDS.length; i++) {
    const field = SCALAR_BINDING_FIELDS[i];
    if (field in boundVariables) {
      collectFromBindingValue(out, boundVariables[field]);
    }
  }

  const keys = Object.keys(boundVariables);
  for (let i = 0; i < keys.length; i++) {
    const field = keys[i];
    if (
      (ARRAY_BINDING_FIELDS as readonly string[]).includes(field) ||
      (SCALAR_BINDING_FIELDS as readonly string[]).includes(field)
    ) {
      continue;
    }
    collectFromBindingValue(out, boundVariables[field]);
  }
}

export function collectionNameToDisplay(rawName: string): string {
  for (let i = 0; i < COLLECTION_ORDER.length; i++) {
    const id = COLLECTION_ORDER[i];
    if (DISPLAY_NAME[id] === rawName) {
      return DISPLAY_NAME[id];
    }
  }

  const normalized = rawName.toLowerCase();
  for (let i = 0; i < COLLECTION_ORDER.length; i++) {
    const id = COLLECTION_ORDER[i];
    if (id === normalized || DISPLAY_NAME[id].toLowerCase() === normalized) {
      return DISPLAY_NAME[id];
    }
  }

  const segment = rawName.split('/')[0] ?? rawName;
  if (segment.length === 0) {
    return rawName;
  }
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

async function resolveTokenPath(variableId: string): Promise<string | null> {
  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (variable === null) {
    return null;
  }
  const collection = await figma.variables.getVariableCollectionByIdAsync(
    variable.variableCollectionId,
  );
  if (collection === null) {
    return null;
  }
  const displayName = collectionNameToDisplay(collection.name);
  return displayName + '/' + variable.name;
}

function getBoundVariableId(node: SceneNode, field: string): string | null {
  if (!('boundVariables' in node)) {
    return null;
  }
  const boundVariables = (node as { boundVariables?: Record<string, unknown> }).boundVariables;
  if (boundVariables === undefined) {
    return null;
  }
  const value = boundVariables[field];
  if (value === undefined || value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return null;
    }
    const first = value[0] as Record<string, unknown>;
    if (typeof first.id === 'string') {
      return first.id;
    }
    return null;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.id === 'string') {
      return record.id;
    }
  }
  return null;
}

async function resolvePaddingSide(
  frame: FrameNode,
  field: 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft',
  pxValue: number,
): Promise<string> {
  const boundId = getBoundVariableId(frame, field);
  if (boundId !== null) {
    const path = await resolveTokenPath(boundId);
    if (path !== null) {
      return path;
    }
  }
  return String(pxValue) + 'px';
}

async function resolvePadding(frame: FrameNode): Promise<string> {
  const topId = getBoundVariableId(frame, 'paddingTop');
  const rightId = getBoundVariableId(frame, 'paddingRight');
  const bottomId = getBoundVariableId(frame, 'paddingBottom');
  const leftId = getBoundVariableId(frame, 'paddingLeft');

  if (
    topId !== null &&
    topId === rightId &&
    topId === bottomId &&
    topId === leftId
  ) {
    const path = await resolveTokenPath(topId);
    if (path !== null) {
      return path;
    }
  }

  const top = await resolvePaddingSide(frame, 'paddingTop', frame.paddingTop);
  const right = await resolvePaddingSide(frame, 'paddingRight', frame.paddingRight);
  const bottom = await resolvePaddingSide(frame, 'paddingBottom', frame.paddingBottom);
  const left = await resolvePaddingSide(frame, 'paddingLeft', frame.paddingLeft);
  return 'T:' + top + ' R:' + right + ' B:' + bottom + ' L:' + left;
}

async function resolveGap(frame: FrameNode): Promise<string> {
  const boundId =
    getBoundVariableId(frame, 'itemSpacing') ?? getBoundVariableId(frame, 'layoutGap');
  if (boundId !== null) {
    const path = await resolveTokenPath(boundId);
    if (path !== null) {
      return path;
    }
  }
  return String(frame.itemSpacing) + 'px';
}

async function readAutoLayoutMetaAsync(frame: SceneNode): Promise<HandoffAutoLayout> {
  const layoutMode = 'layoutMode' in frame ? (frame as FrameNode).layoutMode : 'NONE';
  if (layoutMode === 'NONE') {
    return { direction: 'vertical', gap: '0', padding: '0' };
  }

  const autoFrame = frame as FrameNode;
  const direction = layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical';
  const gap = await resolveGap(autoFrame);
  const padding = await resolvePadding(autoFrame);
  return { direction: direction, gap: gap, padding: padding };
}

export async function enumerateTokensAndLayout(root: SceneNode): Promise<TokensAndLayoutResult> {
  const ids = new Set<string>();
  walkSceneTree(root, function (node) {
    collectBoundVariableIds(node, ids);
  });

  const resolved = await Promise.all(Array.from(ids, resolveTokenPath));
  const paths: string[] = [];
  for (let i = 0; i < resolved.length; i++) {
    const path = resolved[i];
    if (path !== null) {
      paths.push(path);
    }
  }

  const tokens = Array.from(new Set(paths)).sort(function (left, right) {
    return left.localeCompare(right);
  });

  const autoLayout = await readAutoLayoutMetaAsync(root);

  pluginLog('[handoff] enumerateTokensAndLayout', String(tokens.length), autoLayout.direction);

  return { tokens: tokens, autoLayout: autoLayout };
}
