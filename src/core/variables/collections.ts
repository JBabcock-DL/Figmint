import type { CollectionId } from '@detroitlabs/figmint-contracts';

import type { LocalVariableSnapshot } from './types';

export const COLLECTION_ORDER: CollectionId[] = [
  'primitives',
  'theme',
  'typography',
  'layout',
  'effects',
];

export const DISPLAY_NAME: Record<CollectionId, string> = {
  primitives: 'Primitives',
  theme: 'Theme',
  typography: 'Typography',
  layout: 'Layout',
  effects: 'Effects',
};

export interface EnsureCollectionsResult {
  collections: Map<CollectionId, VariableCollection>;
  created: number;
  reused: number;
}

export function ensureCollections(snapshot: LocalVariableSnapshot): EnsureCollectionsResult {
  const collections = new Map<CollectionId, VariableCollection>();
  let created = 0;
  let reused = 0;

  for (const id of COLLECTION_ORDER) {
    const displayName = DISPLAY_NAME[id];
    let collection = snapshot.collectionByName.get(displayName);
    if (collection) {
      reused += 1;
    } else {
      collection = figma.variables.createVariableCollection(displayName);
      snapshot.collectionByName.set(displayName, collection);
      snapshot.collections.push(collection);
      created += 1;
    }
    collections.set(id, collection);
  }

  return { collections, created, reused };
}
