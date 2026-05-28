import type { CanonicalToken, CodeSyntaxPlatform } from '@detroitlabs/fighub-contracts';

import { splitIosSegments, toKebabPath } from './shared';

function deriveEffectsAndroid(name: string, kebab: string): string {
  if (name === 'shadow/color') {
    return 'shadow';
  }
  return kebab;
}

function deriveEffectsIos(name: string): string {
  const segments = name.split('/');
  const tail = segments.flatMap(splitIosSegments);
  return `.Effect.${tail.join('.')}`;
}

export function deriveEffectsCodeSyntax(
  token: CanonicalToken,
  platform: CodeSyntaxPlatform,
): string {
  const kebab = toKebabPath(token.name);

  switch (platform) {
    case 'WEB':
      return `var(--${kebab})`;
    case 'ANDROID':
      return deriveEffectsAndroid(token.name, kebab);
    case 'iOS':
      return deriveEffectsIos(token.name);
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}
