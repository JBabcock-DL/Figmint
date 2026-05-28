import type { CanonicalToken, CodeSyntaxPlatform } from '@detroitlabs/fighub-contracts';

import { splitIosSegments, toKebabPath } from './shared';

function deriveTypographyIos(name: string): string {
  const segments = name.split('/');
  const [category, size, ...propertyParts] = segments;
  const property = propertyParts.join('/');
  const propertyDots = splitIosSegments(property).join('.');
  return `.Typography.${category.toLowerCase()}.${size.toLowerCase()}.${propertyDots}`;
}

export function deriveTypographyCodeSyntax(
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
      return deriveTypographyIos(token.name);
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}
