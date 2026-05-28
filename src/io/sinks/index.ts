import { clipboardSink } from './clipboard';
import { downloadSink } from './download';
import { outputPageClientSink } from './outputPageClient';
import { pluginDataClientSink } from './pluginDataClient';
import { registerSinkMessageListener } from './sinkClientBridge';
import type { FormatOptions, Sink, SinkId, SinkResult } from './types';
import type { LoadedDocument } from '@/io/sources/types';

export const SINKS: Record<SinkId, Sink> = {
  download: downloadSink,
  clipboard: clipboardSink,
  'output-page': outputPageClientSink,
  'plugin-data': pluginDataClientSink,
};

export async function runSink(
  id: SinkId,
  doc: LoadedDocument,
  options: FormatOptions,
): Promise<SinkResult> {
  return SINKS[id].write(doc, options);
}

export { registerSinkMessageListener };

export type {
  FormatOptions,
  OutputFormat,
  SerializableDocument,
  Sink,
  SinkArtifact,
  SinkId,
  SinkResult,
} from './types';

export { prepareSinkContent } from './prepareContent';
export type { PreparedContent } from './prepareContent';
export { executeGithubPRSink, isGithubPREnabled } from './githubPR';
