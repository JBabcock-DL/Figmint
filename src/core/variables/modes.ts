import type { CollectionId, TokensV1 } from '@detroitlabs/fighub-contracts';

import { COLLECTION_ORDER } from './collections';

export interface CollectionModeConfig {
  modes: string[];
  renameDefaultTo: string;
}

export const COLLECTION_MODES: Record<CollectionId, CollectionModeConfig> = {
  primitives: { modes: ['Default'], renameDefaultTo: 'Default' },
  theme: { modes: ['Light', 'Dark'], renameDefaultTo: 'Light' },
  typography: {
    modes: ['85', '100', '110', '120', '130', '150', '175', '200'],
    renameDefaultTo: '100',
  },
  layout: { modes: ['Default'], renameDefaultTo: 'Default' },
  effects: { modes: ['Light', 'Dark'], renameDefaultTo: 'Light' },
};

export type ModeMaps = Record<CollectionId, Record<string, string>>;

function findModeByName(
  collection: VariableCollection,
  name: string,
): { modeId: string; name: string } | null {
  for (const mode of collection.modes) {
    if (mode.name === name) {
      return mode;
    }
  }
  return null;
}

function ensureCollectionModes(
  collectionId: CollectionId,
  collection: VariableCollection,
): Record<string, string> {
  const config = COLLECTION_MODES[collectionId];
  const modeMap: Record<string, string> = {};

  if (collection.modes.length === 0) {
    return modeMap;
  }

  const defaultMode = collection.modes[0];
  if (defaultMode.name !== config.renameDefaultTo) {
    collection.renameMode(defaultMode.modeId, config.renameDefaultTo);
  }

  for (const expectedName of config.modes) {
    let mode = findModeByName(collection, expectedName);
    if (!mode) {
      collection.addMode(expectedName);
      mode = findModeByName(collection, expectedName);
    }
    if (mode) {
      modeMap[expectedName] = mode.modeId;
    }
  }

  return modeMap;
}

export function ensureModes(
  collections: Map<CollectionId, VariableCollection>,
  _tokens: TokensV1,
): ModeMaps {
  const modeMaps = {} as ModeMaps;

  for (const collectionId of COLLECTION_ORDER) {
    const collection = collections.get(collectionId);
    if (!collection) {
      modeMaps[collectionId] = {};
      continue;
    }
    modeMaps[collectionId] = ensureCollectionModes(collectionId, collection);
  }

  return modeMaps;
}
