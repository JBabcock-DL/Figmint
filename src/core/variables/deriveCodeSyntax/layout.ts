import type { CanonicalToken, CodeSyntaxPlatform } from '@detroitlabs/fighub-contracts';

import { splitIosSegments, toKebabPath } from './shared';

function deriveLayoutIos(name: string): string {
  const segments = name.split('/');
  const [group, ...rest] = segments;
  const tail = rest.flatMap(splitIosSegments);
  return `.Layout.${group.toLowerCase()}.${tail.join('.')}`;
}

export function deriveLayoutCodeSyntax(
  token: CanonicalToken,
  platform: CodeSyntaxPlatform,
): string {
  const kebab = toKebabPath(token.name);

  switch (platform) {
    case 'WEB':
      return `var(--${kebab})`;
    case 'ANDROID':
      return kebab;
    case 'iOS':
      return deriveLayoutIos(token.name);
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}
