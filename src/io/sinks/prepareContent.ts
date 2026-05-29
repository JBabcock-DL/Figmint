import { format } from '@/io/formats';
import type { FormattableDocument } from '@/io/formats';
import type { LoadedDocument } from '@/io/sources/types';

import type { FormatOptions } from './types';

export interface PreparedContent {
  json: string;
  markdown: string;
  baseName: string;
  label: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readGeneratedAt(doc: LoadedDocument): string {
  const payload = doc.payload;
  if (isRecord(payload) && isRecord(payload.meta) && typeof payload.meta.generatedAt === 'string') {
    return payload.meta.generatedAt;
  }
  return new Date().toISOString();
}

function defaultBaseName(doc: LoadedDocument): string {
  const generatedAt = readGeneratedAt(doc);
  const datePart = generatedAt.slice(0, 10);
  return doc.kind + '-' + datePart;
}

function defaultLabel(doc: LoadedDocument): string {
  const generatedAt = readGeneratedAt(doc);
  return 'fighub/' + doc.kind + '/' + generatedAt;
}

function serializePayload(doc: LoadedDocument): { json: string; markdown: string } {
  if (doc.kind === 'registry') {
    const json = JSON.stringify(doc.payload, null, 2);
    return {
      json: json,
      markdown: '# ' + doc.kind + '\n\n_(markdown not available for registry)_\n',
    };
  }

  const payload = doc.payload as FormattableDocument;
  return {
    json: format(payload, 'json'),
    markdown: format(payload, 'md'),
  };
}

export function prepareSinkContent(doc: LoadedDocument, options: FormatOptions): PreparedContent {
  const serialized = serializePayload(doc);
  const baseName =
    options.baseName !== undefined && options.baseName !== ''
      ? options.baseName
      : defaultBaseName(doc);
  const label =
    options.label !== undefined && options.label !== '' ? options.label : defaultLabel(doc);

  return {
    json: serialized.json,
    markdown: serialized.markdown,
    baseName: baseName,
    label: label,
  };
}
