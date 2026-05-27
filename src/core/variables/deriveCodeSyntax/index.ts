import type { CanonicalToken, CodeSyntaxPlatform } from '@detroitlabs/figmint-contracts';

import { deriveEffectsCodeSyntax } from './effects';
import { deriveLayoutCodeSyntax } from './layout';
import { derivePrimitivesCodeSyntax } from './primitives';
import { deriveTypographyCodeSyntax } from './typography';

export function deriveCodeSyntax(
  token: CanonicalToken,
  platform: CodeSyntaxPlatform,
): string | undefined {
  const collection = token.collection;

  switch (collection) {
    case 'theme':
      return undefined;
    case 'primitives':
      return derivePrimitivesCodeSyntax(token, platform);
    case 'typography':
      return deriveTypographyCodeSyntax(token, platform);
    case 'layout':
      return deriveLayoutCodeSyntax(token, platform);
    case 'effects':
      return deriveEffectsCodeSyntax(token, platform);
    default:
      return assertNeverCollection(collection);
  }
}

function assertNeverCollection(collection: never): never {
  throw new Error(`Unknown collection: ${String(collection)}`);
}
