import type { CollectionId } from '@detroitlabs/figmint-contracts';

export const COLLECTION_DISPLAY_NAMES: Record<CollectionId, string> = {
  primitives: 'Primitives',
  theme: 'Theme',
  typography: 'Typography',
  layout: 'Layout',
  effects: 'Effects',
};

export const ALL_COLLECTION_IDS: CollectionId[] = [
  'primitives',
  'theme',
  'typography',
  'layout',
  'effects',
];

export const CODE_SYNTAX_PLATFORMS: readonly ['WEB', 'ANDROID', 'iOS'] = ['WEB', 'ANDROID', 'iOS'];

export const COLOR_EPSILON = 1 / 255;
