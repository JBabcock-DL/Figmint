import type { Token, TokensV1 } from '@detroitlabs/fighub-contracts';

import { renderGfmTable } from './shared';

const TOKEN_PREVIEW_CAP = 50;

function summarizeModeValues(token: Token): string {
  const parts: string[] = [];
  for (const [mode, value] of Object.entries(token.valuesByMode)) {
    if (value !== null && typeof value === 'object' && 'aliasOf' in value) {
      const alias = value.aliasOf;
      parts.push(`${mode}: alias → ${alias.collection}/${alias.name}`);
    } else if (token.type === 'COLOR' && value !== null && typeof value === 'object') {
      const color = value as { r: number; g: number; b: number; a: number };
      const hex = `#${[color.r, color.g, color.b]
        .map((channel) =>
          Math.round(channel * 255)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')}`;
      parts.push(`${mode}: ${hex}`);
    } else {
      parts.push(`${mode}: ${String(value)}`);
    }
  }
  return parts.join(', ');
}

function sortTokens(tokens: readonly Token[]): Token[] {
  return [...tokens].sort((a, b) => {
    const byCollection = a.collection.localeCompare(b.collection);
    if (byCollection !== 0) {
      return byCollection;
    }
    return a.name.localeCompare(b.name);
  });
}

export function renderTokensMarkdown(doc: TokensV1): string {
  const sections: string[] = ['# tokens v1', ''];

  sections.push('## Collections');
  sections.push('');
  const collectionRows = [...doc.collections]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((collection) => [collection.id, collection.modes.join(', ')]);
  sections.push(renderGfmTable(['id', 'modes'], collectionRows));
  sections.push('');

  sections.push('## Tokens');
  sections.push('');
  const sorted = sortTokens(doc.tokens);
  const preview = sorted.slice(0, TOKEN_PREVIEW_CAP);
  const tokenRows = preview.map((token) => [
    token.collection,
    token.name,
    token.type,
    summarizeModeValues(token),
  ]);
  sections.push(renderGfmTable(['collection', 'name', 'type', 'modes summary'], tokenRows));

  const remaining = sorted.length - preview.length;
  if (remaining > 0) {
    sections.push('');
    sections.push(`_… and ${remaining} more tokens_`);
  }
  sections.push('');

  if (doc.themes && doc.themes.length > 0) {
    sections.push('## Themes');
    sections.push('');
    for (const theme of doc.themes) {
      sections.push(`- ${theme.name}`);
    }
    sections.push('');
  }

  return sections.join('\n').trimEnd() + '\n';
}
