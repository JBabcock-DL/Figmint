import type { CanonicalToken, CodeSyntaxPlatform } from '@detroitlabs/fighub-contracts';

import { splitIosSegments, toKebabPath } from './shared';

const PRIMITIVE_IOS_DOMAINS: Record<string, string> = {
  color: '.Palette',
  Space: '.Space',
  Corner: '.Corner',
  elevation: '.Elevation',
  typeface: '.Typeface',
  font: '.Font',
};

function derivePrimitivesIos(name: string): string {
  const segments = name.split('/');
  const [head, ...rest] = segments;

  if (head === 'font' && rest[0] === 'weight') {
    const tail = rest.slice(1).flatMap(splitIosSegments);
    return ['.Font', 'weight', ...tail].join('.');
  }

  const domain = PRIMITIVE_IOS_DOMAINS[head];
  if (domain) {
    const tail = rest.flatMap(splitIosSegments);
    return [domain, ...tail].join('.');
  }

  const all = segments.flatMap(splitIosSegments);
  return `.${all.join('.')}`;
}

export function derivePrimitivesCodeSyntax(
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
      return derivePrimitivesIos(token.name);
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}
