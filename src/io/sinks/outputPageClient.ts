import type { FormatOptions, Sink } from './types';
import { postSinkRequest } from './sinkClientBridge';

export const outputPageClientSink: Sink = {
  id: 'output-page',
  write(doc, options: FormatOptions) {
    return postSinkRequest('sink/output-page', doc, options);
  },
};
