/// <reference types="@figma/plugin-typings" />

import { hexToRgb } from '@/core/canvas/lib/colorFormats';

import { loadLocalVariableSnapshot } from './push';

/** Figma collection display name — not part of canonical TokensV1 push. */
export const DOCUMENTATION_COLLECTION_NAME = 'Documentation';

/**
 * Style-guide table chrome tokens (v60 Foundations `doc/table/*`, node 401:14).
 * Literal COLOR values — editable in Variables panel without affecting Theme semantics.
 */
export const DOC_CHROME_TOKENS: Array<{
  name: string;
  hex: string;
  scopes: VariableScope[];
}> = [
  {
    name: 'doc/table/surface',
    hex: '#f7f7f8',
    scopes: ['FRAME_FILL'],
  },
  {
    name: 'doc/table/header-surface',
    hex: '#edecee',
    scopes: ['FRAME_FILL'],
  },
  {
    name: 'doc/table/border',
    hex: '#edecee',
    scopes: ['STROKE_COLOR'],
  },
  {
    name: 'doc/text/primary',
    hex: '#0d0c0e',
    scopes: ['TEXT_FILL'],
  },
  {
    name: 'doc/text/muted',
    hex: '#49454f',
    scopes: ['TEXT_FILL'],
  },
  {
    name: 'doc/preview/swatch-stroke',
    hex: '#edecee',
    scopes: ['STROKE_COLOR'],
  },
];

/** Paths canvas builders resolve for table chrome (plus product-token preview paths elsewhere). */
export const DOC_CHROME_PATHS = DOC_CHROME_TOKENS.map(function (token) {
  return token.name;
});

function findVariableByName(
  snapshot: Awaited<ReturnType<typeof loadLocalVariableSnapshot>>,
  collectionId: string,
  name: string,
): Variable | undefined {
  const key = collectionId + ':' + name;
  return snapshot.variableByKey.get(key);
}

/**
 * Ensure the Documentation collection exists with Default mode and publish chrome tokens.
 * Idempotent — updates values/scopes when definitions change.
 */
export async function publishDocumentationChrome(): Promise<{
  created: number;
  updated: number;
}> {
  const snapshot = await loadLocalVariableSnapshot();
  let collection = snapshot.collectionByName.get(DOCUMENTATION_COLLECTION_NAME);
  if (collection === undefined) {
    collection = figma.variables.createVariableCollection(DOCUMENTATION_COLLECTION_NAME);
    snapshot.collectionByName.set(DOCUMENTATION_COLLECTION_NAME, collection);
    snapshot.collections.push(collection);
  }

  if (collection.modes.length === 0) {
    collection.addMode('Default');
  }
  const defaultMode = collection.modes[0];
  if (defaultMode.name !== 'Default') {
    collection.renameMode(defaultMode.modeId, 'Default');
  }
  const defaultModeId = defaultMode.modeId;

  let created = 0;
  let updated = 0;

  for (let ti = 0; ti < DOC_CHROME_TOKENS.length; ti++) {
    const token = DOC_CHROME_TOKENS[ti];
    let variable = findVariableByName(snapshot, collection.id, token.name);
    const rgb = hexToRgb(token.hex);
    const colorValue: RGBA = { r: rgb.r, g: rgb.g, b: rgb.b, a: 1 };

    if (variable === undefined) {
      variable = figma.variables.createVariable(token.name, collection, 'COLOR');
      const key = collection.id + ':' + token.name;
      snapshot.variableByKey.set(key, variable);
      snapshot.variables.push(variable);
      created += 1;
    } else {
      updated += 1;
    }

    variable.setValueForMode(defaultModeId, colorValue);
    try {
      variable.scopes = token.scopes.slice() as VariableScope[];
    } catch {
      variable.scopes = ['ALL_SCOPES'];
    }
  }

  return { created: created, updated: updated };
}
