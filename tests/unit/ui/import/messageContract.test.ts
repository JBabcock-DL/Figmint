import { describe, expect, it } from 'vitest';

import {
  CODECONNECT_DETECT,
  CODECONNECT_EMIT_PR,
  isCodeConnectDetectMessage,
  isCodeConnectEmitPrMessage,
} from '@/io/messages/codeconnect';
import { IMPORT_LIST_FILES, IMPORT_PARSE, isImportListFilesMessage, isImportParseMessage } from '@/io/messages/import';

describe('import + codeconnect message contract', () => {
  it('UI post shapes match guards', function () {
    const listPayload = {
      type: IMPORT_LIST_FILES,
      requestId: 'list-1',
      repoUrl: 'https://github.com/acme/widgets',
      rootPath: 'components/',
    };
    expect(isImportListFilesMessage(listPayload)).toBe(true);

    const parsePayload = {
      type: IMPORT_PARSE,
      requestId: 'parse-1',
      repoUrl: 'https://github.com/acme/widgets',
      sourcePath: 'components/button.tsx',
    };
    expect(isImportParseMessage(parsePayload)).toBe(true);

    const detectPayload = {
      type: CODECONNECT_DETECT,
      requestId: 'det-1',
      repoUrl: 'https://github.com/acme/widgets',
    };
    expect(isCodeConnectDetectMessage(detectPayload)).toBe(true);

    const emitPayload = {
      type: CODECONNECT_EMIT_PR,
      requestId: 'emit-1',
      repoUrl: 'https://github.com/acme/widgets',
      componentIds: ['1:2'],
    };
    expect(isCodeConnectEmitPrMessage(emitPayload)).toBe(true);
  });
});
