import { parseTextToDocument } from './parseText';
import type { LoadedDocument, PasteSourceMeta, ValidationError } from './types';
import { PASTE_MAX } from './types';

export async function loadFromPaste(input: string): Promise<LoadedDocument | ValidationError> {
  return Promise.resolve(loadFromPasteSync(input));
}

function loadFromPasteSync(input: string): LoadedDocument | ValidationError {
  if (input.length === 0) {
    return {
      kind: 'empty',
      message: 'Paste input is empty.',
      location: { source: 'paste' },
    };
  }

  if (input.length > PASTE_MAX) {
    return {
      kind: 'oversize',
      message: `Paste input exceeds the ${String(PASTE_MAX)} character limit.`,
      location: { source: 'paste' },
    };
  }

  return parseTextToDocument(input, { source: 'paste' }, (_kind, charLength) => {
    const meta: PasteSourceMeta = {
      port: 'paste',
      receivedAt: new Date().toISOString(),
      charLength,
    };
    return meta;
  });
}
