import { format, stableStringify } from '@/io/formats';
import type { FormattableDocument } from '@/io/formats';

import type { ContractDocument, ExportFormatSelection } from './types';

export function buildExportFiles(
  doc: ContractDocument,
  formats: ExportFormatSelection,
  basename: string,
): Array<{ path: string; content: string; format: 'json' | 'md' }> {
  const files: Array<{ path: string; content: string; format: 'json' | 'md' }> = [];

  if (doc.kind === 'registry') {
    if (formats.json) {
      files.push({
        path: basename + '.json',
        content: stableStringify(doc.payload, 2),
        format: 'json',
      });
    }
    return files;
  }

  const payload = doc.payload as FormattableDocument;

  if (formats.json) {
    files.push({
      path: basename + '.v1.json',
      content: format(payload, 'json'),
      format: 'json',
    });
  }

  if (formats.md) {
    files.push({
      path: basename + '.v1.md',
      content: format(payload, 'md'),
      format: 'md',
    });
  }

  return files;
}
