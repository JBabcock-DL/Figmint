import { utf8ByteLength } from '@/core/text/utf8ByteLength';
import { prepareSinkContent } from './prepareContent';
import type { FormatOptions, OutputFormat, Sink, SinkResult } from './types';

async function copyViaWriteText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function copyViaExecCommand(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
   
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok;
}

function pickFormat(options: FormatOptions): OutputFormat {
  if (options.primaryFormat !== undefined) {
    return options.primaryFormat;
  }
  if (options.format === 'both') {
    return 'md';
  }
  return options.format;
}

export const clipboardSink: Sink = {
  id: 'clipboard',
  async write(doc, options: FormatOptions): Promise<SinkResult> {
    const prepared = prepareSinkContent(doc, options);
    const fmt = pickFormat(options);
    const text = fmt === 'json' ? prepared.json : prepared.markdown;
    const byteLength = utf8ByteLength(text);

    try {
      await copyViaWriteText(text);
      return {
        ok: true,
        sink: 'clipboard',
        message: 'Copied to clipboard',
        artifacts: [{ format: fmt, byteLength: byteLength }],
      };
    } catch (writeError) {
      const isNotAllowed =
        writeError instanceof DOMException && writeError.name === 'NotAllowedError';
      if (!isNotAllowed && !(writeError instanceof Error)) {
        return {
          ok: false,
          sink: 'clipboard',
          message: 'Clipboard copy failed',
          error: String(writeError),
        };
      }

      const fallbackOk = copyViaExecCommand(text);
      if (fallbackOk) {
        return {
          ok: true,
          sink: 'clipboard',
          message: 'Copied to clipboard (fallback)',
          artifacts: [{ format: fmt, byteLength: byteLength }],
        };
      }

      return {
        ok: false,
        sink: 'clipboard',
        message: 'Clipboard copy blocked',
        error:
          writeError instanceof Error ? writeError.message : 'Clipboard copy blocked',
      };
    }
  },
};
