import { describe, expect, it } from 'vitest';

import {
  IMPORT_LIST_FILES,
  IMPORT_LIST_FILES_RESULT,
  IMPORT_PARSE,
  IMPORT_PARSE_RESULT,
  isImportListFilesMessage,
  isImportListFilesResultMessage,
  isImportParseMessage,
  isImportParseResultMessage,
} from '@/io/messages/import';

describe('import messages', () => {
  it('accepts valid list-files message', () => {
    expect(
      isImportListFilesMessage({
        type: IMPORT_LIST_FILES,
        requestId: 'req-1',
        repoUrl: 'https://github.com/acme/widgets',
        rootPath: 'src/components/',
      }),
    ).toBe(true);
  });

  it('accepts valid parse message', () => {
    expect(
      isImportParseMessage({
        type: IMPORT_PARSE,
        requestId: 'req-2',
        repoUrl: 'https://github.com/acme/widgets',
        sourcePath: 'src/components/button.tsx',
      }),
    ).toBe(true);
  });

  it('accepts valid list-files result', () => {
    expect(
      isImportListFilesResultMessage({
        type: IMPORT_LIST_FILES_RESULT,
        requestId: 'req-1',
        ok: true,
        files: [{ path: 'src/a.tsx', name: 'a.tsx' }],
      }),
    ).toBe(true);
  });

  it('accepts valid parse result', () => {
    expect(
      isImportParseResultMessage({
        type: IMPORT_PARSE_RESULT,
        requestId: 'req-2',
        ok: true,
      }),
    ).toBe(true);
  });

  it('rejects malformed list-files payloads', () => {
    expect(isImportListFilesMessage(null)).toBe(false);
    expect(isImportListFilesMessage({ type: IMPORT_LIST_FILES })).toBe(false);
    expect(
      isImportListFilesMessage({
        type: IMPORT_LIST_FILES,
        requestId: 'x',
        repoUrl: 123,
      }),
    ).toBe(false);
  });

  it('rejects malformed parse payloads', () => {
    expect(isImportParseMessage(undefined)).toBe(false);
    expect(
      isImportParseMessage({
        type: IMPORT_PARSE,
        requestId: 'x',
        repoUrl: 'https://github.com/o/r',
      }),
    ).toBe(false);
  });
});
