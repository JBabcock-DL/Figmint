import type { FormatOptions, Sink } from './types';
import { postSinkRequest } from './sinkClientBridge';

export const pluginDataClientSink: Sink = {
  id: 'plugin-data',
  write(doc, options: FormatOptions) {
    return postSinkRequest('sink/plugin-data', doc, options);
  },
};
