import { parseTextToDocument } from './parseText';
import type { FileSourceMeta, LoadedDocument, ValidationError } from './types';

export async function loadFromFile(
  file: File,
  via: 'picker' | 'dragdrop' = 'picker',
): Promise<LoadedDocument | ValidationError> {
  const extension = getExtension(file.name);

  if (extension === '.md') {
    return {
      kind: 'unsupported-type',
      message: 'Markdown files are not supported yet.',
      location: { source: 'file', fileName: file.name },
      hint: 'Markdown is export-only. Paste or load JSON.',
    };
  }

  if (extension !== '.json') {
    return {
      kind: 'unsupported-type',
      message: `Unsupported file type: ${extension || '(none)'}.`,
      location: { source: 'file', fileName: file.name },
    };
  }

  const text = await readFileText(file);

  return parseTextToDocument(
    text,
    { source: 'file', fileName: file.name },
    (_kind, _charLength) => {
      const meta: FileSourceMeta = {
        port: 'file',
        receivedAt: new Date().toISOString(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        lastModified: file.lastModified,
        via,
      };
      return meta;
    },
  );
}

function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) {
    return '';
  }
  return fileName.slice(dotIndex).toLowerCase();
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Response(file).text();
}
