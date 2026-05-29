import type {
  Token,
  TokenAliasRef,
  TokensV1,
  TokensV1WC3DTCG,
} from '@detroitlabs/fighub-contracts';

function isAlias(value: unknown): value is TokenAliasRef {
  return typeof value === 'object' && value !== null && 'aliasOf' in value;
}

function serializeAlias(alias: TokenAliasRef): string {
  const name = alias.aliasOf.name.replace(/\//g, '.');
  return '{' + alias.aliasOf.collection + '.' + name + '}';
}

function serializeModeValue(
  value: unknown,
  tokenType?: Token['type'],
  tokenName?: string,
): string | number | boolean {
  if (isAlias(value)) {
    return serializeAlias(value);
  }
  if (typeof value === 'object' && value !== null && 'r' in value) {
    const color = value as { r: number; g: number; b: number; a: number };
    if (color.a === 1) {
      const toHex = function (channel: number) {
        return Math.round(channel * 255)
          .toString(16)
          .padStart(2, '0');
      };
      return '#' + toHex(color.r) + toHex(color.g) + toHex(color.b);
    }
    return (
      'rgba(' +
      String(Math.round(color.r * 255)) +
      ',' +
      String(Math.round(color.g * 255)) +
      ',' +
      String(Math.round(color.b * 255)) +
      ',' +
      String(color.a) +
      ')'
    );
  }
  if (
    typeof value === 'number' &&
    tokenType === 'FLOAT' &&
    tokenName !== undefined &&
    !tokenName.includes('font-weight')
  ) {
    return String(value) + 'px';
  }
  return value as string | number | boolean;
}

function inferDtcgType(token: Token): string {
  if (token.type === 'COLOR') {
    return 'color';
  }
  if (token.type === 'STRING') {
    return 'fontFamily';
  }
  if (token.type === 'FLOAT') {
    return token.name.includes('font-weight') ? 'fontWeight' : 'dimension';
  }
  return 'number';
}

/** Serialize canonical TokensV1 to W3C DTCG JSON for repo paths like design/tokens.json. */
export function serializeDTCG(canonical: TokensV1): TokensV1WC3DTCG {
  const output: Record<string, unknown> = {};

  for (let i = 0; i < canonical.tokens.length; i++) {
    const token = canonical.tokens[i];
    const segments = token.name.split('/');
    const collectionRoot = (output[token.collection] ??= {}) as Record<string, unknown>;
    let cursor = collectionRoot;

    for (let index = 0; index < segments.length - 1; index++) {
      const segment = segments[index];
      const next = (cursor[segment] ??= {}) as Record<string, unknown>;
      cursor = next;
    }

    const leafKey = segments[segments.length - 1];
    const modes = Object.keys(token.valuesByMode);
    const multiMode =
      modes.length > 1 || token.collection === 'theme' || token.collection === 'effects';
    const defaultMode = modes.includes('Default')
      ? 'Default'
      : modes.includes('Light')
        ? 'Light'
        : modes[0];

    const leaf: Record<string, unknown> = {
      $type: inferDtcgType(token),
    };

    if (multiMode) {
      const fighubModes: Record<string, unknown> = {};
      for (const entry of Object.entries(token.valuesByMode)) {
        fighubModes[entry[0]] = serializeModeValue(entry[1], token.type, token.name);
      }
      leaf.$value = serializeModeValue(token.valuesByMode[defaultMode], token.type, token.name);
      leaf.$extensions = {
        fighub: {
          modes: fighubModes,
          ...(token.codeSyntax !== undefined ? { codeSyntax: token.codeSyntax } : {}),
        },
        ...(token.extensions ?? {}),
      };
    } else {
      leaf.$value = serializeModeValue(token.valuesByMode[defaultMode], token.type, token.name);
      if (token.codeSyntax !== undefined || token.extensions !== undefined) {
        leaf.$extensions = {
          ...(token.codeSyntax !== undefined ? { fighub: { codeSyntax: token.codeSyntax } } : {}),
          ...(token.extensions ?? {}),
        };
      }
    }

    if (token.description !== undefined) {
      leaf.$description = token.description;
    }
    if (token.deprecated !== undefined) {
      leaf.$deprecated = token.deprecated;
    }

    cursor[leafKey] = leaf;
  }

  return output as TokensV1WC3DTCG;
}
