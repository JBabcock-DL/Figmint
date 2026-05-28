import { prepareSinkContent } from './prepareContent';
import type { FormatOptions, Sink, SinkArtifact, SinkResult } from './types';

function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function downloadText(filename: string, mimeType: string, text: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function artifact(format: 'json' | 'md', text: string, destination: string): SinkArtifact {
  return {
    format: format,
    byteLength: new TextEncoder().encode(text).length,
    destination: destination,
  };
}

export const downloadSink: Sink = {
  id: 'download',
  async write(doc, options: FormatOptions): Promise<SinkResult> {
    const prepared = prepareSinkContent(doc, options);
    const artifacts: SinkArtifact[] = [];

    try {
      if (options.format === 'json' || options.format === 'both') {
        const filename = prepared.baseName + '.v1.json';
        downloadText(filename, 'application/json', prepared.json);
        artifacts.push(artifact('json', prepared.json, filename));
      }

      if (options.format === 'md' || options.format === 'both') {
        if (options.format === 'both') {
          await sleep(0);
        }
        const filename = prepared.baseName + '.v1.md';
        downloadText(filename, 'text/markdown;charset=utf-8', prepared.markdown);
        artifacts.push(artifact('md', prepared.markdown, filename));
      }

      return {
        ok: true,
        sink: 'download',
        message: 'Downloaded ' + String(artifacts.length) + ' file(s)',
        artifacts: artifacts,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        sink: 'download',
        message: 'Download failed',
        error: message,
        artifacts: artifacts.length > 0 ? artifacts : undefined,
      };
    }
  },
};
