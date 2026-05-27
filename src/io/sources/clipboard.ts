import { parseTextToDocument } from './parseText';
import type {
  ClipboardProbeResult,
  ClipboardSourceMeta,
  LoadedDocument,
  ValidationError,
} from './types';

export async function probeClipboard(): Promise<ClipboardProbeResult> {
  try {
    const text = await navigator.clipboard.readText();
    if (text.length === 0) {
      return { available: false };
    }

    const result = loadFromClipboardText(text, 'async-clipboard-api');
    if (isLoadedDocument(result)) {
      console.debug('[io/sources] probeClipboard detected contract', result.kind);
      return { available: true, doc: result };
    }

    return { available: false };
  } catch (err) {
    const rawError = err instanceof Error ? err.message : String(err);
    return { available: false, rawError };
  }
}

export async function loadFromPasteEvent(
  event: ClipboardEvent,
): Promise<LoadedDocument | ValidationError | null> {
  const text = event.clipboardData?.getData('text/plain') ?? '';
  if (text.length === 0) {
    return null;
  }

  const result = loadFromClipboardText(text, 'paste-event');
  if (isLoadedDocument(result)) {
    console.debug('[io/sources] loadFromPasteEvent detected contract', result.kind);
  }
  return Promise.resolve(result);
}

function isLoadedDocument(result: LoadedDocument | ValidationError): result is LoadedDocument {
  return 'payload' in result && 'sourceMeta' in result && 'rawSnippet' in result;
}

function loadFromClipboardText(
  text: string,
  mechanism: ClipboardSourceMeta['mechanism'],
): LoadedDocument | ValidationError {
  return parseTextToDocument(text, { source: 'clipboard' }, (_kind, charLength) => {
    const meta: ClipboardSourceMeta = {
      port: 'clipboard',
      receivedAt: new Date().toISOString(),
      charLength,
      mechanism,
    };
    return meta;
  });
}
